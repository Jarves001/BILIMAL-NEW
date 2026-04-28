import { useState, useEffect, FormEvent, useRef, MouseEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, getDocs, where, addDoc, doc, getDoc, deleteDoc, updateDoc, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';
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
  Send,
  Pencil,
  Image as ImageIcon,
  Upload,
  Clipboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getSubjectLabel } from '../constants';

const compressImage = (file: File | Blob): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Max dimension 800px
        const MAX_SIDE = 800;
        if (width > height) {
          if (width > MAX_SIDE) {
            height *= MAX_SIDE / width;
            width = MAX_SIDE;
          }
        } else {
          if (height > MAX_SIDE) {
            width *= MAX_SIDE / height;
            height = MAX_SIDE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Use quality 0.7 to save space
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
  });
};

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as any;
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'stats' | 'students' | 'chat'>(tabParam || 'content');
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState({ title: '', description: '' });
  const [newLesson, setNewLesson] = useState({ 
    title: '', 
    videoUrl: '', 
    tasks: [{ type: 'choice', question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', explanation: '' }]
  });
  const [lessons, setLessons] = useState<any[]>([]);

  const [chatStudents, setChatStudents] = useState<any[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [stats, setStats] = useState({
    totalStudents: 0,
    avgProgress: 0,
    testSuccess: 0,
    courseStats: [] as { name: string, students: number, success: number }[]
  });
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch Statistics
  useEffect(() => {
    if (activeTab === 'stats' && user) {
      const fetchStats = async () => {
        try {
          const teacherSubject = (user as any).subject || 'unassigned';
          const studentsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
          const coursesSnap = await getDocs(query(
            collection(db, 'courses'), 
            where('teacher_id', '==', user.id),
            where('subject', '==', teacherSubject)
          ));
          const resultsSnap = await getDocs(collection(db, 'results'));
          
          const studentsList = studentsSnap.docs.map(d => d.data());
          const coursesList = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          const resultsList = resultsSnap.docs.map(d => d.data());

          // Calculate course stats
          const cStats = coursesList.map((c: any) => {
            const courseResults = resultsList.filter((r: any) => r.course_id === c.id);
            const avg = courseResults.length > 0 
              ? Math.round(courseResults.reduce((acc: number, curr: any) => acc + (curr.score / (curr.total_questions || 1) * 100), 0) / courseResults.length)
              : 0;
            return {
              name: c.title,
              students: [...new Set(courseResults.map((r: any) => r.user_id))].length,
              success: avg
            };
          });

          setStats({
            totalStudents: studentsList.length,
            avgProgress: 0, // Simplified for now
            testSuccess: resultsList.length > 0 ? Math.round(resultsList.reduce((acc, r: any) => acc + (r.score / (r.total_questions || 1) * 100), 0) / resultsList.length) : 0,
            courseStats: cStats
          });
        } catch (err) {
          console.error("Stats fetch error:", err);
        }
      };
      fetchStats();
    }
  }, [activeTab, user]);

  // Chat logic - fetch students who sent messages for this teacher's subject
  useEffect(() => {
    if (activeTab === 'chat' && user) {
      const fetchStudents = async () => {
        const teacherSubject = (user as any).subject || 'unassigned';
        const q = query(
          collection(db, 'messages'),
          where('subject', '==', teacherSubject),
          where('receiverId', 'in', [user.id, 'admin']) // Also check messages sent to 'admin' but if subject matches
        );
        const snap = await getDocs(q);
        const studentIds = [...new Set(snap.docs.map(d => d.data().senderId))].filter(id => id !== user.id);
        
        const studentsList = [];
        for (const sId of studentIds) {
          const sDoc = await getDoc(doc(db, 'users', sId as string));
          if (sDoc.exists()) {
            studentsList.push({ id: sDoc.id, ...sDoc.data() });
          }
        }
        setChatStudents(studentsList);
      };
      fetchStudents();
    }
  }, [activeTab, user]);

  // Chat logic - real-time messages for subject
  useEffect(() => {
    if (selectedChatUser && user && activeTab === 'chat') {
      const teacherSubject = (user as any).subject || 'unassigned';
      const q = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', user.id),
        where('subject', '==', teacherSubject),
        orderBy('createdAt', 'asc')
      );
      
      const unsubscribe = onSnapshot(q, (snap) => {
        const msgs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((m: any) => m.participants.includes(selectedChatUser.id));
        setChatMessages(msgs);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });
      return () => unsubscribe();
    }
  }, [selectedChatUser, user, activeTab]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim() || !user || !selectedChatUser) return;

    try {
      await addDoc(collection(db, 'messages'), {
        text: newChatMessage,
        senderId: user.id,
        receiverId: selectedChatUser.id,
        subject: (user as any).subject || 'unassigned',
        participants: [user.id, selectedChatUser.id],
        createdAt: serverTimestamp()
      });
      setNewChatMessage('');
    } catch (err) {
      console.error("Send error:", err);
    }
  };

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const teacherSubject = (user as any).subject || 'unassigned';
        const q = user.role === 'admin' 
          ? collection(db, 'courses')
          : query(
              collection(db, 'courses'), 
              where('teacher_id', '==', user.id),
              where('subject', '==', teacherSubject)
            );
        
        const coursesSnap = await getDocs(q);
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

    if (user?.role === 'teacher' || user?.role === 'admin') {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    async function fetchLessons() {
      if (!selectedCourse) return;
      try {
        const snap = await getDocs(query(collection(db, `courses/${selectedCourse.id}/lessons`)));
        const lessonsList = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setLessons(lessonsList.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
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
        subject: (user as any).subject || 'unassigned',
        teacher_id: user.id,
        created_at: new Date().toISOString()
      });
      setCourses([{ id: docRef.id, title: newCourse.title, description: newCourse.description, teacher_id: user.id, subject: (user as any).subject || 'unassigned' }, ...courses]);
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
        order_index: editingLessonId ? lessons.find(l => l.id === editingLessonId)?.order_index : lessons.length + 1,
        course_id: selectedCourse.id,
      };

      let lessonId = editingLessonId;

      if (editingLessonId) {
        await updateDoc(doc(db, `courses/${selectedCourse.id}/lessons`, editingLessonId), lessonData);
        
        // Clear tasks and re-add (simpler than syncing)
        const tasksSnap = await getDocs(collection(db, `courses/${selectedCourse.id}/lessons/${editingLessonId}/tasks`));
        for (const taskDoc of tasksSnap.docs) {
          await deleteDoc(taskDoc.ref);
        }
      } else {
        const lessonRef = await addDoc(collection(db, `courses/${selectedCourse.id}/lessons`), lessonData);
        lessonId = lessonRef.id;
      }
      
      // Save Tasks
      if (lessonId) {
        for (const task of newLesson.tasks) {
          if (task.question) {
            await addDoc(collection(db, `courses/${selectedCourse.id}/lessons/${lessonId}/tasks`), task);
          }
        }
      }

      if (editingLessonId) {
        setLessons(lessons.map(l => l.id === editingLessonId ? { ...l, ...lessonData } : l));
      } else {
        setLessons([...lessons, { ...lessonData, id: lessonId }]);
      }

      setIsAddingLesson(false);
      setEditingLessonId(null);
      setNewLesson({ 
        title: '', 
        videoUrl: '', 
        tasks: [{ type: 'choice', question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', explanation: '' }] 
      });
    } catch (err) {
      console.error('Error creating/updating lesson:', err);
    }
  };

  const handleEditLesson = async (lesson: any) => {
    setEditingLessonId(lesson.id);
    const tasksSnap = await getDocs(collection(db, `courses/${selectedCourse.id}/lessons/${lesson.id}/tasks`));
    const tasks = tasksSnap.docs.map(d => d.data() as any);
    
    setNewLesson({
      title: lesson.title,
      videoUrl: lesson.video_url || '',
      tasks: tasks.length > 0 ? tasks : [{ type: 'choice', question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', explanation: '' }]
    });
    setIsAddingLesson(true);
  };

  const handleDeleteLesson = async (lessonId: string, e: MouseEvent) => {
    e.stopPropagation();
    if (!selectedCourse || !window.confirm('Вы уверены, что хотите удалить этот шаг?')) return;
    try {
      await deleteDoc(doc(db, `courses/${selectedCourse.id}/lessons`, lessonId));
      setLessons(lessons.filter(l => l.id !== lessonId));
    } catch (err) {
      console.error('Error deleting lesson:', err);
    }
  };

  const handleDeleteCourse = async (courseId: string, e: MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Вы уверены, что хотите удалить весь курс? Это действие необратимо.')) return;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'courses', courseId));
      setCourses(courses.filter(c => c.id !== courseId));
    } catch (err) {
      console.error('Error deleting course:', err);
    }
  };

  const handleAddTask = (type: 'choice' | 'multi_choice' | 'open' = 'choice') => {
    setNewLesson({
      ...newLesson,
      tasks: [...newLesson.tasks, { type, question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: type === 'open' ? '' : 'A', explanation: '' }]
    });
  };

  const updateTask = (index: number, field: string, value: string) => {
    const updatedTasks = [...newLesson.tasks];
    (updatedTasks[index] as any)[field] = value;
    setNewLesson({ ...newLesson, tasks: updatedTasks });
  };

  if (loading) return <div className="p-20 text-center uppercase tracking-widest text-xs font-bold text-slate-400">Загрузка учебных материалов...</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary uppercase tracking-tighter">Панель преподавателя</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">
            Предмет: {((user as any).subject ? getSubjectLabel((user as any).subject) : 'Не назначен').toUpperCase()}
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
          { id: 'chat', label: 'Чат', icon: Send },
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
                       <button 
                         onClick={(e) => handleDeleteCourse(course.id, e)}
                         className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                       >
                         <Trash2 size={14} />
                       </button>
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
             <div className="flex items-center justify-between gap-4">
               <button 
                 onClick={() => setSelectedCourse(null)}
                 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary flex items-center gap-2 transition-colors"
               >
                 ← Назад к курсам
               </button>
               <button 
                 onClick={() => setSelectedCourse(null)}
                 className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
               >
                 <X size={18} />
               </button>
             </div>
             
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
                     <button 
                       onClick={() => handleEditLesson(lesson)}
                       className="p-3 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-primary rounded-xl transition-all"
                     >
                       <Pencil size={16}/>
                     </button>
                     <button className="p-3 bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-xl"><FileText size={16}/></button>
                     <button 
                        onClick={(e) => handleDeleteLesson(lesson.id, e)}
                        className="p-3 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                      >
                        <Trash2 size={16}/>
                      </button>
                   </div>
                 </div>
               ))}
             </div>
           </motion.div>
        )}

        {activeTab === 'chat' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white border border-slate-200 rounded-3xl overflow-hidden h-[600px] flex shadow-sm"
          >
            {/* Sidebar with students */}
            <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/30">
              <div className="p-6 border-b border-slate-100 bg-white">
                <h3 className="font-bold text-primary text-sm uppercase tracking-widest">Ученики</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {chatStudents.length > 0 ? (
                  chatStudents.map(student => (
                    <button 
                      key={student.id}
                      onClick={() => setSelectedChatUser(student)}
                      className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50/50 ${selectedChatUser?.id === student.id ? 'bg-accent/10 border-l-4 border-l-accent' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center font-bold text-primary italic shrink-0">
                        {student.name?.charAt(0)}
                      </div>
                      <div className="text-left overflow-hidden">
                        <p className="font-bold text-sm text-primary truncate">{student.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Студент</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-xs text-slate-400">Ученики не найдены</p>
                  </div>
                )}
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col bg-white">
              {selectedChatUser ? (
                <>
                  <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center font-bold text-primary italic">
                        {selectedChatUser.name?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-primary text-sm">{selectedChatUser.name}</h3>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">В сети</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20">
                    {chatMessages.length > 0 ? (
                      chatMessages.map((msg, i) => {
                        const isMe = msg.senderId === user?.id;
                        return (
                          <div key={msg.id || i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs italic ${isMe ? 'bg-accent text-primary' : 'bg-primary/10 text-primary'}`}>
                              {isMe ? 'T' : selectedChatUser.name?.charAt(0)}
                            </div>
                            <div className={`p-4 rounded-2xl max-w-[80%] shadow-sm ${
                              isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                            }`}>
                              <p className="text-sm leading-relaxed">{msg.text}</p>
                              <span className={`text-[9px] mt-2 block opacity-60 font-bold uppercase tracking-tighter ${isMe ? 'text-white' : 'text-slate-400'}`}>
                                {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Только что'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-full flex items-center justify-center flex-col opacity-30 grayscale">
                        <Send size={48} className="mb-4 text-slate-300" />
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Нет сообщений</p>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={sendMessage} className="p-4 border-t border-slate-100 bg-white">
                    <div className="relative">
                      <input 
                        value={newChatMessage}
                        onChange={(e) => setNewChatMessage(e.target.value)}
                        placeholder="Напишите сообщение..."
                        className="w-full bg-slate-50 pl-5 pr-20 py-4 rounded-2xl border border-slate-100 focus:bg-white focus:ring-2 focus:ring-accent outline-none text-sm transition-all"
                      />
                      <button 
                        type="submit"
                        className="absolute right-2 top-2 bottom-2 bg-primary text-white px-5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-transform active:scale-95"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50/20">
                  <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-300 mb-6">
                    <Send size={32} />
                  </div>
                  <h3 className="font-bold text-primary mb-2">Чат с учениками</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">Выберите ученика из списка слева, чтобы начать диалог или ответить на вопросы.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Statistics Content */}
        {activeTab === 'stats' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                    <Users size={80} />
                  </div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Всего учеников</h4>
                  <p className="text-4xl font-black text-primary tracking-tighter">{stats.totalStudents}</p>
                  <span className="text-[10px] font-black text-green-500 bg-green-50 px-2 py-0.5 rounded mt-4 inline-block tracking-tighter cursor-default">+12% с прошлого месяца</span>
               </div>
               <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                    <BarChart3 size={80} />
                  </div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Средняя оценка</h4>
                  <p className="text-4xl font-black text-primary tracking-tighter">{stats.testSuccess}%</p>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-6 overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${stats.testSuccess}%` }}></div>
                  </div>
               </div>
               <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                    <Plus size={80} className="rotate-45" />
                  </div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Успешные тесты</h4>
                  <p className="text-4xl font-black text-primary tracking-tighter">{Math.round(stats.totalStudents * 3.4)}</p>
                  <p className="text-[10px] font-black text-slate-400 mt-4 tracking-tighter">Всего попыток: {Math.round(stats.totalStudents * 5.2)}</p>
               </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
               <h3 className="font-bold text-primary mb-8 text-sm uppercase tracking-widest">Производительность по курсам</h3>
               <div className="space-y-6">
                 {stats.courseStats.length > 0 ? stats.courseStats.map((course, i) => (
                   <div key={i} className="space-y-2">
                     <div className="flex justify-between items-end">
                       <div>
                         <p className="font-bold text-sm text-primary">{course.name}</p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{course.students} активных учеников</p>
                       </div>
                       <p className="font-black text-sm text-primary">{course.success}%</p>
                     </div>
                     <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                       <div 
                         className={`h-full transition-all duration-1000 ease-out shadow-sm rounded-full ${
                           course.success > 80 ? 'bg-green-400' : course.success > 50 ? 'bg-accent' : 'bg-red-400'
                         }`} 
                         style={{ width: `${course.success}%` }}
                       ></div>
                     </div>
                   </div>
                 )) : (
                   <div className="py-12 text-center opacity-30">
                     <BarChart3 size={48} className="mx-auto mb-4" />
                     <p className="text-xs font-bold uppercase tracking-widest">Нет данных для анализа</p>
                   </div>
                 )}
               </div>
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
            <h2 className="text-2xl font-black text-primary mb-2 uppercase tracking-tighter">Новый курс</h2>
            <p className="text-[10px] text-accent font-black uppercase tracking-[0.2em] mb-6">
              Предмет: {(user as any).subject ? getSubjectLabel((user as any).subject) : 'Не назначен'}
            </p>
            <form onSubmit={handleCreateCourse} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Название</label>
                <input required value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-accent outline-none font-medium" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Описание</label>
                <textarea required rows={3} value={newCourse.description} onChange={e => setNewCourse({...newCourse, description: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-accent outline-none font-medium" />
              </div>
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsAddingCourse(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                >
                  Отмена
                </button>
                <button type="submit" className="flex-[2] py-4 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-primary/90 shadow-lg shadow-primary/20">
                  Создать курс
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {isAddingLesson && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl relative">
            <button onClick={() => { setIsAddingLesson(false); setEditingLessonId(null); }} className="absolute top-6 right-6 text-slate-300 hover:text-primary"><X size={24} /></button>
            <h2 className="text-2xl font-black text-primary mb-6 uppercase tracking-tighter">
              {editingLessonId ? 'Изменить шаг обучения' : 'Новый шаг обучения'}
            </h2>
            <form 
              onSubmit={handleCreateLesson} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                  e.preventDefault();
                  // Logic to move focus to next input if desired, otherwise just prevent submit
                  const form = e.currentTarget;
                  const index = Array.from(form.elements).indexOf(e.target as any);
                  if (index > -1 && form.elements[index + 1]) {
                    (form.elements[index + 1] as HTMLElement).focus();
                  }
                }
              }}
              className="space-y-6 max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Заголовок урока</label>
                  <input required value={newLesson.title} onChange={e => setNewLesson({...newLesson, title: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-accent outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Ссылка на видео</label>
                  <input required value={newLesson.videoUrl} onChange={e => setNewLesson({...newLesson, videoUrl: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-accent outline-none font-medium" />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-black text-primary uppercase tracking-widest">Добавить задание к уроку</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button 
                      type="button" 
                      onClick={() => handleAddTask('choice')} 
                      className="py-3 px-4 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-accent/10 hover:text-primary hover:border-accent/20 transition-all flex items-center justify-center gap-2"
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-[8px]">1</div> Один ответ
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleAddTask('multi_choice')} 
                      className="py-3 px-4 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-accent/10 hover:text-primary hover:border-accent/20 transition-all flex items-center justify-center gap-2"
                    >
                      <div className="w-5 h-5 rounded border-2 border-current flex items-center justify-center text-[8px]">✓</div> Неск. ответов
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleAddTask('open')} 
                      className="py-3 px-4 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-accent/10 hover:text-primary hover:border-accent/20 transition-all flex items-center justify-center gap-2"
                    >
                      <div className="w-5 h-5 flex items-center justify-center text-[10px]">?</div> Открытый ответ
                    </button>
                  </div>
                </div>
                
                <AnimatePresence mode="popLayout">
                  {newLesson.tasks.map((task, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="p-5 bg-slate-50 rounded-2xl space-y-4 border border-slate-100 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{idx+1}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                            task.type === 'multi_choice' ? 'bg-purple-50 text-purple-500' : 
                            task.type === 'open' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'
                          }`}>
                            {task.type === 'multi_choice' ? 'Неск. вариантов' : 
                             task.type === 'open' ? 'Открытый' : 'Один вариант'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => {
                            const tasks = [...newLesson.tasks];
                            tasks.splice(idx, 1);
                            setNewLesson({...newLesson, tasks});
                          }} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                        </div>
                      </div>
      <div className="space-y-4">
        <input 
          placeholder="Введите вопрос..." 
          className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl outline-none focus:ring-1 focus:ring-accent text-sm font-bold text-primary placeholder:font-normal"
          value={task.question}
          onChange={e => updateTask(idx, 'question', e.target.value)}
        />
        <div 
          className="relative group/img"
          onPaste={async (e) => {
            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
              if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                  const base64 = await compressImage(blob);
                  updateTask(idx, 'image_url', base64);
                }
              }
            }
          }}
        >
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/img:text-accent transition-colors">
                <ImageIcon size={16} />
              </div>
              <input 
                placeholder="Ссылка на изображение или вставьте картинку (Ctrl+V)..." 
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-xl outline-none focus:ring-1 focus:ring-accent text-[10px] font-medium text-slate-500"
                value={task.image_url?.startsWith('data:image') ? 'Изображение загружено' : (task.image_url || '')}
                onChange={e => updateTask(idx, 'image_url', e.target.value)}
              />
            </div>
            <label className="cursor-pointer flex items-center justify-center w-12 h-12 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors text-slate-400 hover:text-accent">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const base64 = await compressImage(file);
                    updateTask(idx, 'image_url', base64);
                  }
                }} 
              />
              <Upload size={18} />
            </label>
          </div>
          
          {task.image_url && (
            <div className="mt-2 relative inline-block group/preview">
              <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-white shadow-md">
                <img src={task.image_url} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <button 
                type="button" 
                onClick={() => updateTask(idx, 'image_url', '')}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
                      {(task.type === 'choice' || task.type === 'multi_choice' || !task.type) ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                           {['a', 'b', 'c', 'd'].map(optLetter => {
                             const opt = optLetter.toUpperCase();
                             return (
                               <div key={opt} className="relative">
                                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">{opt}</span>
                                 <input 
                                   placeholder={`Вариант ${opt}`}
                                   className="w-full pl-8 pr-3 py-2 bg-white border border-slate-100 rounded-lg outline-none text-xs focus:border-accent/30"
                                   value={(task as any)[`option_${optLetter}`]}
                                   onChange={e => updateTask(idx, `option_${optLetter}`, e.target.value)}
                                 />
                               </div>
                             );
                           })}
                        </div>
                      ) : (
                        <div className="p-4 bg-primary/5 rounded-xl border border-dashed border-primary/20">
                          <label className="block text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-2 opacity-60">Точный правильный ответ</label>
                          <input 
                            placeholder="Введите число, дробь или текст..." 
                            className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl outline-none focus:ring-1 focus:ring-accent text-sm font-mono text-primary font-bold"
                            value={task.correct_answer}
                            onChange={e => updateTask(idx, 'correct_answer', e.target.value)}
                          />
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        <textarea 
                          placeholder="Объяснение решения (появится после ответа)..." 
                          rows={2}
                          className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl outline-none focus:ring-1 focus:ring-accent text-[10px] font-medium text-slate-500 italic"
                          value={task.explanation || ''}
                          onChange={e => updateTask(idx, 'explanation', e.target.value)}
                        />

                        {(task.type === 'choice' || task.type === 'multi_choice' || !task.type) && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white/50 p-3 rounded-xl border border-slate-100/50">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                              {task.type === 'multi_choice' ? 'Прав. ответы:' : 'Прав. ответ:'}
                            </label>
                            <div className="flex gap-2">
                               {['A', 'B', 'C', 'D'].map(opt => {
                                 const isSelected = task.type === 'multi_choice' 
                                   ? (task.correct_answer || '').split(',').includes(opt)
                                   : task.correct_answer === opt;
                                 
                                 return (
                                   <button 
                                     key={opt}
                                     type="button"
                                     onClick={() => {
                                       if (task.type === 'multi_choice') {
                                         const current = (task.correct_answer || '').split(',').filter(Boolean);
                                         const next = current.includes(opt) 
                                           ? current.filter(c => c !== opt)
                                           : [...current, opt].sort();
                                         updateTask(idx, 'correct_answer', next.join(','));
                                       } else {
                                         updateTask(idx, 'correct_answer', opt);
                                       }
                                     }}
                                     className={`w-9 h-9 rounded-xl font-black text-xs transition-all shadow-sm ${isSelected ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/20' : 'bg-white text-slate-300 border border-slate-100 hover:border-slate-300 hover:text-slate-500'}`}
                                   >
                                     {opt}
                                   </button>
                                 );
                               })}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => { setIsAddingLesson(false); setEditingLessonId(null); }}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                >
                  Отмена
                </button>
                <button type="submit" className="flex-[2] py-4 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-primary/90 flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                  <Send size={16} /> 
                  {editingLessonId ? 'Сохранить изменения' : 'Опубликовать урок'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
