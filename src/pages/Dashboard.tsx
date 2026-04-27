import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { BookOpen, GraduationCap, ChevronRight, Star, Clock, FilterX, Trophy, Target, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface Course {
  id: string;
  title: string;
  subject: string;
  description: string;
}

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const subjectFilter = searchParams.get('subject');
  const [application, setApplication] = useState<any>(null);
  
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

    fetchStats();
    fetchApplication();
    
    api.get('/courses').then(res => {
      // Ensure unique courses by ID and filter out any invalid data
      const rawCourses = Array.isArray(res.data) ? res.data : [];
      const uniqueCourses = rawCourses.reduce((acc: Course[], current: any) => {
        if (!current.id) return acc;
        const exists = acc.find(item => item.id === current.id);
        if (!exists) return acc.concat([current as Course]);
        return acc;
      }, []);
      
      if (uniqueCourses.length < rawCourses.length) {
        console.warn(`Filtered out ${rawCourses.length - uniqueCourses.length} duplicate courses`);
      }
      
      setCourses(uniqueCourses);
    }).catch(err => {
      console.error('Failed to fetch courses:', err);
    });
  }, []);

  const filteredCourses = useMemo(() => {
    if (!subjectFilter) return courses;
    return courses.filter(c => c.subject.toLowerCase() === subjectFilter.toLowerCase());
  }, [courses, subjectFilter]);

  const getSubjectTitle = () => {
    switch(subjectFilter?.toLowerCase()) {
      case 'math': return 'Математика';
      case 'logic': return 'Логика & IQ';
      case 'languages': return 'Языки';
      case 'reading': return 'Анализ текста';
      default: return 'Все курсы';
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Application Status */}
      {application && application.status !== 'rejected' && (
        <div className={`p-6 rounded-3xl border flex items-center gap-4 ${
          application.status === 'pending' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
        }`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            application.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
          }`}>
            {application.status === 'pending' ? <Clock size={24} /> : <CheckCircle size={24} />}
          </div>
          <div className="flex-1">
            <h4 className={`font-black text-sm uppercase tracking-tight ${
              application.status === 'pending' ? 'text-amber-800' : 'text-green-800'
            }`}>
              {application.status === 'pending' ? 'Заявка на роль учителя в обработке' : 'Принято, вы стали учителем!'}
            </h4>
            <p className={`text-xs mt-1 ${
              application.status === 'pending' ? 'text-amber-600' : 'text-green-600'
            }`}>
              {application.status === 'pending' 
                ? 'Ваша заявка проверяется администрацией. Обычно это занимает от 1 до 3 рабочих дней.' 
                : 'Подробнее уточнения вам напишут с администрации и номер для связи 77474193512'}
            </p>
          </div>
          {application.status === 'approved' && user?.role !== 'teacher' && (
             <button 
               onClick={() => window.location.reload()}
               className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest"
             >
               Обновить роль
             </button>
          )}
        </div>
      )}

      {/* Level Header (Mobile Focused) */}
      <div className="md:hidden bg-primary text-white p-6 rounded-3xl mb-4 relative overflow-hidden">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border p-4 shadow-sm rounded-2xl md:rounded-none">
          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Готовность к НИШ/БИЛ</p>
          <p className="text-2xl font-black text-primary mt-1">{userStats.readiness}%</p>
          <div className="w-full bg-slate-100 h-1 mt-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{ width: `${userStats.readiness}%` }}></div>
          </div>
        </div>
        <div className="bg-white border p-4 shadow-sm rounded-2xl md:rounded-none">
          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Уроков пройдено</p>
          <p className="text-2xl font-black text-primary mt-1">{userStats.lessonsCompleted}</p>
          <p className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1">
            <Target size={10} /> Стабильный прогресс
          </p>
        </div>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Course Listing */}
          <div className="bg-white border shadow-sm">
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
                      <Link to={`/courses/${course.id}`} className="btn-primary !py-2 !px-4">Продолжить</Link>
                      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Clock size={12} /> Обновлено недавно
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
              <div className="p-4 border-b hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded">СРОЧНО</span>
                  <span className="text-[10px] text-slate-400 font-mono">12 Май, 14:00</span>
                </div>
                <p className="text-xs font-bold mt-1">Симуляция НИШ №8</p>
                <p className="text-[10px] text-slate-500 uppercase mt-1">25 вопросов | 45 мин</p>
              </div>
              <div className="p-4 border-b hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded">ОБЫЧНО</span>
                  <span className="text-[10px] text-slate-400 font-mono">14 Май, 09:00</span>
                </div>
                <p className="text-xs font-bold mt-1">Тест на паттерны IQ</p>
                <p className="text-[10px] text-slate-500 uppercase mt-1">15 вопросов | 20 мин</p>
              </div>
            </div>
          </div>

          <div className="bg-primary text-white p-6 shadow-sm rounded-3xl md:rounded-none">
            <h3 className="text-sm font-bold uppercase tracking-widest text-accent mb-4">Академический статус</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Ваш уровень подготовки оценивается как стабильный. Для достижения максимального балла в НИШ рекомендуем сосредоточиться на задачах логики уровня B2.
            </p>
            <button className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
              Посмотреть план
            </button>
          </div>

          <div className="bg-white border p-6 shadow-sm rounded-3xl md:rounded-none">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
              <MessageSquare size={16} className="text-accent" />
              Связь с учителем
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              У вас возникли вопросы по материалу? Вы можете задать их напрямую своему куратору или преподавателю курса.
            </p>
            <button 
              onClick={() => alert('Функция чата в разработке. Скоро вы сможете общаться с учителями!')}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest transition-all text-primary"
            >
              Создать чат
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
