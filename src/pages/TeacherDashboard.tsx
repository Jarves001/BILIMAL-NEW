import { useState, useEffect, FormEvent } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, where, addDoc, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { 
  Users, 
  Plus, 
  Video, 
  FileText, 
  BarChart3, 
  Layout, 
  Trash2, 
  ChevronRight,
  BookOpen,
  X,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'stats' | 'students'>('content');
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', description: '' });
  const [newLesson, setNewLesson] = useState({ title: '', videoUrl: '' });
  const [lessons, setLessons] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const coursesSnap = await getDocs(query(collection(db, 'courses'), where('teacher_id', '==', user.id)));
        const coursesList = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCourses(coursesList);

        const resultsSnap = await getDocs(collection(db, 'results'));
        const teacherCourseIds = coursesList.map(d => d.id);
        const relevantResults = resultsSnap.docs
          .map(d => d.data() as any)
          .filter(r => teacherCourseIds.includes(r.course_id));

        const uniqueStudentIds = [...new Set(relevantResults.map(r => r.user_id))];
        const studentProfiles = [];
        for (const sId of uniqueStudentIds) {
          const sDoc = await getDoc(doc(db, 'users', sId));
          if (sDoc.exists()) {
            studentProfiles.push({ 
              id: sId, 
              ...sDoc.data(), 
              results: relevantResults.filter(r => r.user_id === sId) 
            });
          }
        }
        setStudents(studentProfiles);
      } catch (err) {
        console.error('Error fetching teacher data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (user?.role === 'teacher') {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    async function fetchLessons() {
      if (!selectedCourse) return;
      try {
        const snap = await getDocs(query(collection(db, `courses/${selectedCourse.id}/lessons`)));
        const lessonsList = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setLessons(lessonsList.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)));
      } catch (err) {
        console.error('Error fetching lessons:', err);
      }
    }
    fetchLessons();
  }, [selectedCourse]);

  const handleCreateCourse = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, 'courses'), {
        title: newCourse.title,
        description: newCourse.description,
        subject: (user as any).subject || 'math',
        teacher_id: user.id,
        created_at: new Date().toISOString()
      });
      setCourses([{ id: docRef.id, title: newCourse.title, description: newCourse.description, teacher_id: user.id }, ...courses]);
      setIsAddingCourse(false);
      setNewCourse({ title: '', description: '' });
    } catch (err) {
      console.error('Error creating course:', err);
    }
  };

  const handleCreateLesson = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    try {
      const lessonData = {
        title: newLesson.title,
        video_url: newLesson.videoUrl,
        order_index: lessons.length + 1,
        course_id: selectedCourse.id,
      };
      const docRef = await addDoc(collection(db, `courses/${selectedCourse.id}/lessons`), lessonData);
      setLessons([...lessons, { ...lessonData, id: docRef.id }]);
      setIsAddingLesson(false);
      setNewLesson({ title: '', videoUrl: '' });
    } catch (err) {
      console.error('Error creating lesson:', err);
    }
  };

  if (loading) return <div className="p-20 text-center uppercase tracking-widest text-xs font-bold text-slate-400">Загрузка учебных материалов...</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary uppercase tracking-tighter">Панель преподавателя</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">
            Предмет: {(user as any).subject?.toUpperCase() || 'НЕ ОПРЕДЕЛЕН'}
          </p>
        </div>
        <button 
          onClick={() => setIsAddingCourse(true)}
          className="bg-primary text-white px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-primary/90 shadow-xl transition-all"
        >
          <Plus size={18} />
          Создать новый курс
        </button>
      </div>

      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto no-scrollbar">
        {[
          { id: 'content', label: 'Контент', icon: Layout },
          { id: 'students', label: 'Ученики', icon: Users },
          { id: 'stats', label: 'Статистика', icon: BarChart3 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all relative ${
              activeTab === tab.id ? 'text-primary' : 'text-slate-400'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="activeTabT" className="absolute bottom-0 left-0 right-0 h-1 bg-accent" />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'content' && !selectedCourse && (
          <motion.div 
            key="courses-grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {courses.map(course => (
              <div 
                key={course.id} 
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group cursor-pointer"
                onClick={() => setSelectedCourse(course)}
              >
                <div className="h-32 bg-primary/5 flex items-center justify-center border-b border-slate-100 group-hover:bg-primary/10 transition-colors">
                  <BookOpen className="text-primary/20" size={48} />
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-black text-primary mb-2 line-clamp-1">{course.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-6 flex-1">{course.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                       <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><Video size={14} /></div>
                       <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><FileText size={14} /></div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent flex items-center gap-1">
                      Управление <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'content' && selectedCourse && (
           <motion.div 
             key="course-details"
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="space-y-6"
           >
             <button 
               onClick={() => setSelectedCourse(null)}
               className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary flex items-center gap-2"
             >
               ← Назад к курсам
             </button>
             
             <div className="bg-white p-8 rounded-3xl border border-slate-200 flex justify-between items-center">
               <div>
                 <h2 className="text-2xl font-black text-primary uppercase tracking-tighter">{selectedCourse.title}</h2>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Редактирование структуры курса</p>
               </div>
               <button 
                 onClick={() => setIsAddingLesson(true)}
                 className="px-6 py-3 bg-accent text-primary rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all"
               >
                 + Шаг обучения
               </button>
             </div>

             <div className="space-y-4">
               {lessons.map((lesson, idx) => (
                 <div key={lesson.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center gap-6 group hover:border-accent/30 transition-all">
                   <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-300 group-hover:bg-accent/10 group-hover:text-primary transition-all">
                     {idx + 1}
                   </div>
                   <div className="flex-1">
                     <h4 className="font-bold text-primary group-hover:translate-x-1 transition-transform">{lesson.title}</h4>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                       <Video size={12} className="text-accent" /> Видео-урок
                     </p>
                   </div>
                   <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button className="p-3 bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-xl"><FileText size={16}/></button>
                     <button className="p-3 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl"><Trash2 size={16}/></button>
                   </div>
                 </div>
               ))}
             </div>
           </motion.div>
        )}

        {activeTab === 'students' && (
          <motion.div 
            key="students-list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm"
          >
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-4">Ученик</th>
                  <th className="px-6 py-4">Прогресс</th>
                  <th className="px-6 py-4">Ср. Балл</th>
                  <th className="px-6 py-4">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(s => {
                   const avgScore = s.results.length > 0 
                     ? (s.results.reduce((acc: number, r: any) => acc + (r.score / (r.total_questions || 1)), 0) / s.results.length * 100).toFixed(1)
                     : 0;
                   return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center font-bold text-primary italic">
                            {s.name?.charAt(0)}
                          </div>
                          <p className="font-bold text-sm text-primary">{s.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary">{s.results.length} уроков</span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-full" style={{ width: `${Math.min((s.results.length / 10) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2 py-1 rounded text-[10px] font-black tracking-widest ${
                          Number(avgScore) > 80 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                          {avgScore}%
                        </span>
                      </td>
                      <td className="px-6 py-5">
                         <button className="text-[10px] bg-slate-100 px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest text-slate-500 hover:bg-primary hover:text-white transition-all">
                           Детали
                         </button>
                      </td>
                    </tr>
                   );
                })}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      {isAddingCourse && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl relative">
            <button onClick={() => setIsAddingCourse(false)} className="absolute top-6 right-6 text-slate-300 hover:text-primary"><X size={24} /></button>
            <h2 className="text-2xl font-black text-primary mb-6 uppercase tracking-tighter">Новый курс</h2>
            <form onSubmit={handleCreateCourse} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Название</label>
                <input required value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-accent outline-none font-medium" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Описание</label>
                <textarea required rows={3} value={newCourse.description} onChange={e => setNewCourse({...newCourse, description: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-accent outline-none font-medium" />
              </div>
              <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-primary/90">Создать курс</button>
            </form>
          </motion.div>
        </div>
      )}

      {isAddingLesson && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl relative">
            <button onClick={() => setIsAddingLesson(false)} className="absolute top-6 right-6 text-slate-300 hover:text-primary"><X size={24} /></button>
            <h2 className="text-2xl font-black text-primary mb-6 uppercase tracking-tighter">Новый шаг обучения</h2>
            <form onSubmit={handleCreateLesson} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Заголовок урока</label>
                <input required value={newLesson.title} onChange={e => setNewLesson({...newLesson, title: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-accent outline-none font-medium" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Ссылка на видео</label>
                <input required value={newLesson.videoUrl} onChange={e => setNewLesson({...newLesson, videoUrl: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-accent outline-none font-medium" />
              </div>
              <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-primary/90 flex items-center justify-center gap-2">
                <Send size={16} /> Опубликовать шаг
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
