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
  const navigate = useNavigate();

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
        
        const sub = user?.subInfo || { has_video_access: user?.role === 'admin' || user?.role === 'teacher' };
        
        const lessonsData = lessonsSnap.docs.map(doc => {
          const data = doc.data();
          const isLocked = !sub.has_video_access && data.video_url && data.order_index > 1; // Example: lock video if no subscription
          return { id: doc.id, ...data } as Lesson;
        });

        setCourse({
          id: courseDoc.id,
          ...courseDoc.data() as any,
          lessons: lessonsData
        });
      } catch (err) {
        console.error('Failed to fetch course details from Firestore:', err);
      }
    }

    fetchCourseData();
  }, [id, user]);

  if (!course) return <div className="p-20 text-center uppercase tracking-widest text-xs font-bold text-slate-400">Синхронизация данных курса...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white border shadow-sm p-8">
        <div className="text-[10px] uppercase text-accent font-bold tracking-[0.3em] mb-2">Academic Course</div>
        <h1 className="text-3xl font-bold text-primary mb-4 tracking-tight">{course.title}</h1>
        <p className="text-slate-500 max-w-3xl text-sm leading-relaxed">{course.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-tight text-primary">Программа обучения</h3>
              <span className="text-[10px] font-bold text-slate-400 capitalize">{course.lessons.length} Модулей</span>
            </div>
            <div className="p-0 divide-y">
              {course.lessons.map((lesson, idx) => (
                <div key={lesson.id} className="p-6 flex items-center gap-6 hover:bg-slate-50 transition-colors group">
                  <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center font-bold text-primary shrink-0 text-sm group-hover:bg-accent group-hover:text-primary transition-colors">
                    {idx + 1}
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-bold text-primary mb-1 flex items-center gap-2">
                      {lesson.title}
                      {lesson.video_locked && <Lock size={12} className="text-slate-400" />}
                    </h4>
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      <span className="flex items-center gap-1">
                        <Play size={10}/> 
                        {lesson.video_locked ? 'Видео заблокировано' : 'Видеолекция'}
                      </span>
                      <span className="flex items-center gap-1"><ClipboardList size={10}/> Практический тест</span>
                    </div>
                  </div>
                  <div>
                    <Link 
                      to={`/lessons/${lesson.id}/test?courseId=${id}`}
                      className="btn-outline !py-1.5 !px-3 !text-[10px] flex items-center gap-2 group-hover:bg-primary group-hover:text-white"
                    >
                      Решить тест <ChevronRight size={12} />
                    </Link>
                  </div>
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
                Полный доступ
              </h3>
              <p className="text-xs text-white/60 leading-relaxed mb-6 italic">
                Откройте доступ ко всем 20+ урокам курса и расширенной базе вопросов НИШ.
              </p>
              <button className="w-full btn-accent !text-primary">Активировать</button>
            </div>
            <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-accent/10 rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
