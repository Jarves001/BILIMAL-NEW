import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Play, ClipboardList, CheckCircle, ChevronRight, Lock } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  video_url: string;
  video_locked?: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export default function CourseView() {
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const { user } = useAuth();
  const isSubscribed = user?.subscription === 'active' || user?.role === 'admin' || user?.role === 'teacher';
  const navigate = useNavigate();

  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    async function fetchCourseData() {
      if (!id) return;
      try {
        const courseDoc = await getDoc(doc(db, 'courses', id));
        if (!courseDoc.exists()) {
          console.error('Course not found');
          return;
        }

        const lessonsQuery = query(
          collection(db, 'courses', id, 'lessons'),
          orderBy('order_index', 'asc')
        );
        const lessonsSnap = await getDocs(lessonsQuery);
        
        const lessonsData = lessonsSnap.docs.map((doc, idx) => {
          const data = doc.data();
          // Lock all lessons except the first one for non-subscribers
          const isLocked = !isSubscribed && idx > 0;
          return { id: doc.id, ...data, video_locked: isLocked } as Lesson;
        });

        setCourse({
          id: courseDoc.id,
          ...courseDoc.data() as any,
          lessons: lessonsData
        });
        
        if (lessonsData.length > 0) {
          setActiveLesson(lessonsData[0]);
        }
      } catch (err) {
        console.error('Failed to fetch course details from Firestore:', err);
      }
    }

    fetchCourseData();
  }, [id, user]);

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url?.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (!course) return <div className="p-20 text-center uppercase tracking-widest text-xs font-bold text-slate-400">Синхронизация данных курса...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white border shadow-sm p-8 rounded-3xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10">
          <div className="text-[10px] uppercase text-accent font-black tracking-[0.3em] mb-2">Academic Course</div>
          <h1 className="text-3xl font-black text-primary mb-4 tracking-tight uppercase">{course.title}</h1>
          <p className="text-slate-500 max-w-3xl text-sm font-medium leading-relaxed">{course.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player Section */}
          {activeLesson && (
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="aspect-video bg-black relative flex items-center justify-center">
                {activeLesson.video_url ? (
                  getYoutubeId(activeLesson.video_url) ? (
                    <iframe 
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${getYoutubeId(activeLesson.video_url)}`}
                      title={activeLesson.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <video 
                      src={activeLesson.video_url} 
                      className="w-full h-full" 
                      controls 
                      poster="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop"
                    />
                  )
                ) : (
                  <div className="text-center p-12">
                    <Play size={48} className="text-slate-700 mx-auto mb-4 opacity-20" />
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Видео к этому уроку отсутствует</p>
                  </div>
                )}
              </div>
              <div className="p-6 bg-white flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-primary tracking-tight">{activeLesson.title}</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Текущий модуль обучения</p>
                </div>
                <Link 
                  to={`/lessons/${activeLesson.id}/test?courseId=${id}`}
                  className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2"
                >
                  Пройти тест <ClipboardList size={14} />
                </Link>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary">Программа обучения</h3>
              <span className="text-[10px] font-bold text-slate-400">{course.lessons.length} Модулей</span>
            </div>
            <div className="divide-y divide-slate-50">
              {course.lessons.map((lesson, idx) => (
                <div 
                  key={lesson.id} 
                  onClick={() => !lesson.video_locked && setActiveLesson(lesson)}
                  className={`p-6 flex items-center gap-6 hover:bg-slate-50 transition-all cursor-pointer group ${activeLesson?.id === lesson.id ? 'bg-accent/5 border-l-4 border-l-accent' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all ${
                    activeLesson?.id === lesson.id ? 'bg-accent text-primary' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-primary'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-grow">
                    <h4 className={`font-bold transition-colors mb-1 flex items-center gap-2 ${activeLesson?.id === lesson.id ? 'text-primary' : 'text-slate-600 group-hover:text-primary'}`}>
                      {lesson.title}
                      {lesson.video_locked && <Lock size={12} className="text-slate-300" />}
                    </h4>
                    <div className="flex items-center gap-4 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                      <span className="flex items-center gap-1">
                        <Play size={10} className={activeLesson?.id === lesson.id ? 'text-accent' : ''}/> 
                        {lesson.video_locked ? 'Заблокировано' : 'Видеолекция'}
                      </span>
                      <span className="flex items-center gap-1"><ClipboardList size={10}/> Тест</span>
                    </div>
                  </div>
                  {activeLesson?.id === lesson.id && (
                    <div className="bg-accent/20 text-primary px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Смотришь сейчас</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border shadow-sm p-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Статус обучения</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                  <span>Завершено</span>
                  <span>10%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-accent h-full" style={{ width: '10%' }} />
                </div>
              </div>
              <p className="text-[10px] text-slate-500">Пройдено 0 из {course.lessons.length} уроков курса.</p>
            </div>
          </div>

          <div className="bg-[#0B2A4A] text-white p-8 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Lock size={18} className="text-accent" />
                {isSubscribed ? 'Полный доступ активен' : 'Полный доступ'}
              </h3>
              <p className="text-xs text-white/60 leading-relaxed mb-6 italic">
                {isSubscribed 
                  ? 'Вам доступны все уроки курса и база вопросов без ограничений.' 
                  : 'Откройте доступ ко всем 20+ урокам курса и расширенной базе вопросов НИШ.'}
              </p>
              {!isSubscribed && (
                <Link to="/subscriptions" className="w-full py-3 bg-accent text-primary rounded-xl font-bold text-[10px] uppercase tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-2">
                  Активировать
                </Link>
              )}
            </div>
            <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-accent/10 rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
