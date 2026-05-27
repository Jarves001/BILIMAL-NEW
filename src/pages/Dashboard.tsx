import { useState, useEffect, useMemo, useRef, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { BookOpen, GraduationCap, ChevronRight, Star, Clock, FilterX, Trophy, Target, MessageSquare, AlertCircle, CheckCircle, X, Send, Play, Book, BookMarked, Timer, Lock, Calendar, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getSubjectLabel, SUBJECTS } from '../constants';
import ScheduleViewer from '../components/ScheduleViewer';

interface Course {
  id: string;
  title: string;
  subject: string;
  description: string;
}

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  const { user } = useAuth();
  const isSubscribed = user?.subscription === 'active' || user?.role === 'admin' || user?.role === 'teacher';
  const [searchParams] = useSearchParams();
  const subjectFilter = searchParams.get('subject');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [application, setApplication] = useState<any>(null);
  const [myGroup, setMyGroup] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatOpen && user && selectedSubject) {
      const fetchTeacherForSubject = async () => {
        setChatLoading(true);
        const q = query(collection(db, 'users'), 
          where('role', '==', 'teacher'),
          where('subject', '==', selectedSubject),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setSelectedTeacher({ id: snap.docs[0].id, ...snap.docs[0].data() });
        } else {
          setSelectedTeacher(null);
        }
        setChatLoading(false);
      };
      fetchTeacherForSubject();
    }
  }, [isChatOpen, user, selectedSubject]);

  useEffect(() => {
    if (selectedSubject && user && isChatOpen) {
      const q = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', user.id),
        where('subject', '==', selectedSubject),
        orderBy('createdAt', 'asc')
      );
      
      const unsubscribe = onSnapshot(q, (snap) => {
        const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMessages(msgs);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }, (error) => {
        console.error('Error fetching messages in Dashboard:', error);
      });
      return () => unsubscribe();
    }
  }, [selectedSubject, user, isChatOpen]);

  const sendMsg = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !user || !selectedSubject) return;
    try {
      // Find teacher if not already found (fallback)
      let teacherId = selectedTeacher?.id;
      if (!teacherId) {
        const q = query(collection(db, 'users'), where('role', '==', 'teacher'), where('subject', '==', selectedSubject), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) teacherId = snap.docs[0].id;
      }

      await addDoc(collection(db, 'messages'), {
        text: newMsg,
        senderId: user.id,
        receiverId: teacherId || 'admin', // send to admin if no teacher for this subject yet
        subject: selectedSubject,
        participants: [user.id, teacherId || 'admin'],
        createdAt: serverTimestamp()
      });
      setNewMsg('');
    } catch (err) { console.error(err); }
  };
  
  const [userStats, setUserStats] = useState({
    totalScore: 0,
    lessonsCompleted: 0,
    readiness: 0,
  });

  useEffect(() => {
    if (!user) return;

    // Fetch user results for stats
    async function fetchStats() {
      try {
        const q = query(collection(db, 'results'), where('user_id', '==', user?.id));
        const snap = await getDocs(q);
        const results = snap.docs.map(d => d.data());
        
        const total = results.reduce((acc, r) => acc + (r.score || 0), 0);
        const accuracy = results.length > 0 
          ? (results.reduce((acc, curr) => acc + (curr.score / (curr.total_questions || 1)), 0) / results.length) * 100
          : 0;

        setUserStats({
          totalScore: total,
          lessonsCompleted: results.length,
          readiness: Math.round(accuracy)
        });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    }

    async function fetchApplication() {
      try {
        const q = query(
          collection(db, 'teacher_applications'), 
          where('user_id', '==', user?.id),
          orderBy('applied_at', 'desc'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setApplication({ id: snap.docs[0].id, ...snap.docs[0].data() });
        }
      } catch (err) {
        console.error('Failed to fetch application:', err);
      }
    }

    async function fetchGroup() {
      if (user?.role === 'teacher' || user?.role === 'admin') return;
      try {
        const q = query(collection(db, 'groups'), where('students', 'array-contains', user?.id));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setMyGroup({ id: snap.docs[0].id, ...snap.docs[0].data() });
        }
      } catch (err) {
        console.error('Failed to fetch group:', err);
      }
    }

    fetchStats();
    fetchApplication();
    fetchGroup();
    
    // Fetch courses from Firestore directly for better reliability
    const fetchCourses = async () => {
      try {
        const coursesSnap = await getDocs(collection(db, 'courses'));
        const coursesData = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        setCourses(coursesData);
      } catch (err) {
        console.error('Failed to fetch courses from firestore:', err);
      }
    };

    fetchCourses();

    // Fetch Exams
    const fetchExams = async () => {
      try {
        const q = query(collection(db, 'exams'), orderBy('created_at', 'desc'));
        const unsubscribe = onSnapshot(q, (snap) => {
          const examData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setExams(examData);
        }, (error) => {
          console.error('Error fetching exams in Dashboard:', error);
        });
        return unsubscribe;
      } catch (err) {
        console.error('Failed to fetch exams:', err);
      }
    };

    const fetchExamResults = async () => {
      if (!user?.id) return;
      try {
        const q = query(collection(db, 'exam_results'), where('user_id', '==', user.id), orderBy('completed_at', 'desc'));
        const snap = await getDocs(q);
        setExamResults(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Failed to fetch exam results:', err);
      }
    };

    fetchExams();
    fetchExamResults();
  }, [user]);

  const filteredCourses = useMemo(() => {
    let base = courses;
    if (user?.role === 'teacher') {
      const teacherSubject = (user as any).subject;
      if (teacherSubject) {
        base = base.filter(c => c.subject.toLowerCase() === teacherSubject.toLowerCase());
      }
    }
    if (!subjectFilter) return base;
    return base.filter(c => c.subject.toLowerCase() === subjectFilter.toLowerCase());
  }, [courses, subjectFilter, user]);

  const getSubjectTitle = () => {
    if (!subjectFilter) return 'Все курсы';
    return getSubjectLabel(subjectFilter);
  };

  const passedExamIds = useMemo(() => new Set(examResults.map(r => r.exam_id)), [examResults]);
  const availableExams = useMemo(() => exams.filter(e => !passedExamIds.has(e.id)), [exams, passedExamIds]);

  const [hideAppBanner, setHideAppBanner] = useState(false);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Application Status */}
      {application && !hideAppBanner && (
        <div className={`p-6 rounded-none border flex items-start sm:items-center gap-4 relative ${
          application.status === 'pending' ? 'bg-amber-50 border-amber-200' : 
          application.status === 'rejected' ? 'bg-red-50 border-red-200' :
          'bg-green-50 border-green-200'
        }`}>
          {application.status === 'rejected' && (
             <button onClick={() => setHideAppBanner(true)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 transition-colors">
               <X size={20} />
             </button>
          )}
          <div className={`w-12 h-12 shrink-0 rounded-none flex items-center justify-center ${
            application.status === 'pending' ? 'bg-amber-100 text-amber-600' : 
            application.status === 'rejected' ? 'bg-red-100 text-red-600' :
            'bg-green-100 text-green-600'
          }`}>
            {application.status === 'pending' ? <Clock size={24} /> : 
             application.status === 'rejected' ? <X size={24} /> : 
             <CheckCircle size={24} />}
          </div>
          <div className="flex-1 pr-8 sm:pr-0">
            <h4 className={`font-black text-sm uppercase tracking-tight ${
              application.status === 'pending' ? 'text-amber-800' : 
              application.status === 'rejected' ? 'text-red-800' :
              'text-green-800'
            }`}>
              {application.status === 'pending' ? 'Заявка на роль учителя в обработке' : 
               application.status === 'rejected' ? 'Заявка отклонена' :
               'Принято, вы стали учителем!'}
            </h4>
            <p className={`text-xs mt-1 ${
              application.status === 'pending' ? 'text-amber-600' : 
              application.status === 'rejected' ? 'text-red-600' :
              'text-green-600'
            }`}>
              {application.status === 'pending' 
                ? 'Ваша заявка проверяется администрацией. Обычно это занимает от 1 до 3 рабочих дней.' :
               application.status === 'rejected'
                ? 'К сожалению, ваша заявка была отклонена модератором. Вы можете подать новую анкету или обратиться в поддержку.' 
                : 'Подробнее уточнения вам напишут с администрации и номер для связи 77474193512'}
            </p>
          </div>
          {application.status === 'approved' && user?.role !== 'teacher' && (
             <button 
               onClick={() => window.location.reload()}
               className="bg-green-600 text-white px-4 py-2 rounded-none text-[10px] font-bold uppercase tracking-widest mt-4 sm:mt-0"
             >
               Обновить роль
             </button>
          )}
          {application.status === 'rejected' && (
             <Link 
               to="/teacher-application"
               className="bg-red-600 text-white px-4 py-2 rounded-none text-[10px] font-bold uppercase tracking-widest mt-4 sm:mt-0 whitespace-nowrap"
             >
               Отправить заново
             </Link>
          )}
        </div>
      )}

      {/* Level Header (Mobile Focused) */}
      <div className="md:hidden bg-primary text-white p-6 rounded-none mb-4 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Уровень {Math.floor(userStats.totalScore / 100) + 1}</p>
          <h2 className="text-2xl font-black">{user?.name}</h2>
          <div className="w-full bg-white/10 h-2 mt-4 rounded-full overflow-hidden">
             <div className="bg-accent h-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${userStats.totalScore % 100}%` }}></div>
          </div>
          <p className="text-[10px] text-white/50 mt-2 uppercase font-bold tracking-tighter">
            {100 - (userStats.totalScore % 100)} XP до следующего уровня
          </p>
        </div>
        <Trophy className="absolute -right-4 -bottom-4 text-white/10" size={120} />
      </div>

      {/* Stats Grid */}
      <div className={`grid grid-cols-2 ${user?.role === 'teacher' ? 'md:grid-cols-2' : 'md:grid-cols-4'} gap-4`}>
        <div className="bg-white border p-4 shadow-sm rounded-none md:rounded-none">
          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Готовность к НИШ/БИЛ</p>
          <p className="text-2xl font-black text-primary mt-1">{userStats.readiness}%</p>
          <div className="w-full bg-slate-100 h-1 mt-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{ width: `${userStats.readiness}%` }}></div>
          </div>
        </div>
        <div className="bg-white border p-4 shadow-sm rounded-none md:rounded-none">
          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Уроков пройдено</p>
          <p className="text-2xl font-black text-primary mt-1">{userStats.lessonsCompleted}</p>
          <p className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1">
            <Target size={10} /> Стабильный прогресс
          </p>
        </div>
        {user?.role !== 'teacher' && (
          <>
            <div className="bg-white border p-4 shadow-sm">
              <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Пробные экзамены</p>
              <p className="text-2xl font-bold text-primary mt-1">
                {user?.subInfo?.exams_left ?? 0} <span className="text-xs text-slate-400 font-normal">осталось</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-2">Доступно в вашем тарифе</p>
            </div>
            <div className="bg-white border p-4 border-accent/30 bg-accent/5 shadow-sm">
              <p className="text-[10px] uppercase text-primary font-bold tracking-wider">Ваша подписка</p>
              <p className="text-lg font-bold text-accent mt-1 capitalize">
                {user?.subInfo?.plan ? `${user.subInfo.plan} план` : 'Пробный период'}
              </p>
              <p className="text-[10px] text-slate-500 mt-2">
                {user?.subInfo?.end_date 
                  ? `Действует до ${new Date(user.subInfo.end_date).toLocaleDateString()}`
                  : 'Ограниченный доступ'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Schedule Banner */}
      {user?.role !== 'teacher' && (
      <div className="bg-white border shadow-sm">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="text-sm font-bold uppercase tracking-tight text-primary flex items-center gap-2">
            <Calendar size={16} className="text-accent" />
            Академическое расписание {myGroup ? `(Группа: ${myGroup.name})` : ''}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
          <div className="p-4 bg-white hover:bg-slate-50 transition-colors flex flex-col justify-between">
            <div>
              <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-1">Онлайн-Сессии</p>
              <h4 className="font-bold text-primary flex items-center gap-2 mt-2">
                 <Video size={16} className="text-blue-500" />
                 Живые уроки в Zoom
              </h4>
              <p className="text-xs text-slate-500 mt-2">Интерактивные занятия с преподавателями. Ссылки на подключения отправляются модератором и учителями напрямую в Чат.</p>
            </div>
          </div>
          <div className="p-4 bg-white hover:bg-slate-50 transition-colors">
            <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-1">Постоянно</p>
            <h4 className="font-bold text-primary flex items-center gap-2 mt-2">
               <BookOpen size={16} className="text-emerald-500" />
               Видеоуроки и Задания
            </h4>
            <p className="text-xs text-slate-500 mt-2">Самостоятельная практика, видео-материалы и выполнение тестов на платформе.</p>
             <button onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })} className="mt-4 px-4 py-2 bg-emerald-50 rounded-lg text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold uppercase w-full">Перейти к курсам</button>
          </div>
          <div className="p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-1">Каждую неделю</p>
            <h4 className="font-bold text-primary flex items-center gap-2 mt-2">
               <Target size={16} className="text-accent" />
               Аттестация и Экзамен
            </h4>
            <p className="text-xs text-slate-500 mt-2">Еженедельный срез знаний. Анализ ошибок и подготовка к экзаменам НИШ.</p>
             <button onClick={() => window.scrollTo(0, 0)} className="mt-4 px-4 py-2 bg-accent rounded-lg text-primary hover:bg-accent/80 text-[10px] font-bold uppercase w-full">Сдать экзамен</button>
          </div>
        </div>
        {myGroup && (
           <div className="p-4 border-t border-slate-100 bg-slate-50/30">
               <ScheduleViewer 
                 scheduleData={myGroup?.schedule_data} 
                 fallbackText={myGroup?.schedule_text} 
               />
           </div>
        )}
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Course Listing */}
          <div className="bg-white border shadow-sm mb-8">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold uppercase tracking-tight text-primary flex items-center gap-2">
                <BookMarked size={16} className="text-accent" />
                Еженедельные экзамены
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-100 relative">
              {!isSubscribed && (
                <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                  <div className="bg-white p-8 rounded-[30px] shadow-2xl border border-slate-100 max-w-sm">
                    <div className="w-16 h-16 bg-accent/20 rounded-none flex items-center justify-center mx-auto mb-4 text-primary">
                      <Lock size={32} />
                    </div>
                    <h4 className="text-xl font-black text-primary uppercase tracking-tight mb-2">Доступ ограничен</h4>
                    <p className="text-xs text-slate-500 font-medium mb-6">Еженедельные экзамены доступны только пользователям с активной подпиской.</p>
                    <Link 
                      to="/subscriptions" 
                      className="w-full py-4 bg-accent text-primary font-black uppercase tracking-widest text-xs rounded-none block hover:scale-105 transition-all shadow-xl shadow-accent/20"
                    >
                      Активировать подписку
                    </Link>
                  </div>
                </div>
              )}
              {availableExams.length > 0 ? availableExams.map(exam => (
                <div key={exam.id} className={`bg-white p-6 hover:bg-slate-50 transition-all group flex flex-col justify-between ${!isSubscribed ? 'opacity-40' : ''}`}>
                  <div>
                    <h4 className="font-black text-primary leading-tight mb-2 group-hover:text-accent transition-colors">{exam.title}</h4>
                    <div className="flex gap-4 mb-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Clock size={12} /> {exam.duration_minutes} мин
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Target size={12} /> {exam.questions_count} вопр.
                      </div>
                    </div>
                  </div>
                  <Link 
                    to={isSubscribed ? `/exam/${exam.id}` : '#'} 
                    onClick={(e) => !isSubscribed && e.preventDefault()}
                    className={`w-full py-3 ${isSubscribed ? 'bg-accent/10 hover:bg-accent' : 'bg-slate-100 cursor-not-allowed'} text-primary font-black uppercase tracking-widest text-[10px] rounded-none flex items-center justify-center gap-2 transition-all`}
                  >
                    {isSubscribed ? 'Начать экзамен' : 'Недоступно'}
                    <ChevronRight size={14} />
                  </Link>
                </div>
              )) : (
                <div className="bg-white p-12 text-center text-slate-300 col-span-2">
                   <p className="text-[10px] font-bold uppercase tracking-widest">Все доступные экзамены сданы или пока недоступны</p>
                </div>
              )}
            </div>
          </div>

          {/* Exam History */}
          {examResults.length > 0 && (
            <div className="bg-white border shadow-sm mb-8">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                <h3 className="text-sm font-bold uppercase tracking-tight text-primary flex items-center gap-2">
                  <Trophy size={16} className="text-green-500" />
                  История пройденных экзаменов
                </h3>
              </div>
              <div className="p-0 divide-y divide-slate-100">
                {examResults.map(res => {
                  const percent = Math.round((res.score / res.total_questions) * 100) || 0;
                  return (
                    <div key={res.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                       <div>
                         <p className="font-bold text-primary">{exams.find(e => e.id === res.exam_id)?.title || 'Неизвестный экзамен'}</p>
                         <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                           Сдан: {res.completed_at?.toDate ? res.completed_at.toDate().toLocaleDateString('ru-RU') : 'Недавно'}
                         </p>
                       </div>
                       <div className="text-right">
                         <div className="text-lg font-black text-primary">{percent}%</div>
                         <div className="text-[10px] font-bold text-slate-400 uppercase">{res.score} из {res.total_questions} верных</div>
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main Course Listing */}
          <div id="courses" className="bg-white border shadow-sm">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold uppercase tracking-tight text-primary">
                {subjectFilter ? `Раздел: ${getSubjectTitle()}` : 'Доступные курсы и программы'}
              </h3>
              {subjectFilter && (
                <Link to="/dashboard" className="text-[10px] font-bold text-slate-400 hover:text-primary uppercase tracking-widest flex items-center gap-1">
                  <FilterX size={12} /> Сбросить фильтр
                </Link>
              )}
            </div>
            <div className="p-0 divide-y">
              {filteredCourses.length > 0 ? filteredCourses.map((course) => (
                <div key={course.id} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-slate-50 transition-colors group">
                  <div className="w-full md:w-48 aspect-video bg-primary flex items-center justify-center rounded shrink-0 overflow-hidden relative">
                    <BookOpen className="text-white opacity-20" size={32} />
                    <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-all"></div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">{course.subject}</div>
                    <h4 className="font-bold text-lg text-primary leading-tight mb-2">{course.title}</h4>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">{course.description}</p>
                    <div className="flex items-center gap-4">
                      <Link to={`/courses/${course.id}`} className="bg-primary text-white px-6 py-2.5 rounded-none text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/10">
                        <Play size={14} className="fill-current" />
                        Смотреть уроки
                      </Link>
                      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Clock size={12} /> Обновлено
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-20 text-center text-slate-400">
                  <BookOpen className="mx-auto mb-4 opacity-20" size={48} />
                  <p className="text-sm font-bold uppercase tracking-widest">В этом разделе курсы пока не добавлены</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          <div className="bg-white border shadow-sm">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-tight text-primary">Ближайшие цели</h3>
            </div>
            <div className="p-0">
              {availableExams.length > 0 ? availableExams.slice(0, 3).map((exam, idx) => (
                <Link to={`/exam/${exam.id}`} key={exam.id} className="block p-4 border-b hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    {idx === 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-none">СРОЧНО</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-none">ОБЫЧНО</span>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(exam.created_at || Date.now()).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })}, {new Date(exam.created_at || Date.now()).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs font-bold mt-1 text-primary">{exam.title || 'Экзамен'}</p>
                  <p className="text-[10px] text-slate-500 uppercase mt-1">{(exam.questions || []).length || exam.questions_count || 0} вопросов | {exam.duration_minutes || 0} мин</p>
                </Link>
              )) : (
                <div className="p-6 text-center text-slate-400 text-xs font-bold tracking-widest uppercase">
                  Нет ближайших целей
                </div>
              )}
            </div>
          </div>

          <div className="bg-primary text-white p-6 shadow-sm rounded-none md:rounded-none">
            <h3 className="text-sm font-bold uppercase tracking-widest text-accent mb-4">Академический статус</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              {userStats.readiness < 30 
                ? "Вам нужно больше практиковаться. Начните с базовых тем и регулярных занятий для повышения уровня."
                : userStats.readiness < 70 
                  ? "Ваш уровень подготовки оценивается как стабильный. Для достижения максимального балла в НИШ рекомендуем сосредоточиться на слабых темах."
                  : "Отлично! Вы показываете высокие результаты. Продолжайте в том же духе, чтобы удерживать академическое лидерство."}
            </p>
            <button onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })} className="block w-full text-center py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-xs font-bold uppercase tracking-widest transition-all">
              Посмотреть план
            </button>
          </div>

          <div className="bg-white border p-6 shadow-sm rounded-none md:rounded-none">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
              <MessageSquare size={16} className="text-accent" />
              Открытый чат
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              {user?.role === 'teacher' 
                ? 'Общайтесь со своими учениками и консультируйте их в режиме реального времени.'
                : 'У вас возникли вопросы по материалу? Вы можете задать их напрямую своему куратору или преподавателю курса.'}
            </p>
            <Link 
              to="/chat"
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-none text-xs font-bold uppercase tracking-widest transition-all text-primary block text-center"
            >
              {user?.role === 'teacher' ? 'Открыть чат учителя' : 'Перейти к чату'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
