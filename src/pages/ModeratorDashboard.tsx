import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import { Users, Video, Calendar, CheckSquare, XSquare, ShieldCheck, Mail, PlayCircle, UserPlus, PhoneIncoming } from 'lucide-react';
import api from '../api/client';

export default function ModeratorDashboard() {
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedCurator, setSelectedCurator] = useState<string>('');
  
  const [consultations, setConsultations] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseForLessons, setSelectedCourseForLessons] = useState<string | null>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [userToCurator, setUserToCurator] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch pending apps
      const appsQuery = query(collection(db, 'teacher_applications'), where('status', '==', 'pending'));
      const appsSnap = await getDocs(appsQuery);
      setApps(appsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      // 2. Fetch users
      const usersSnap = await getDocs(collection(db, 'users'));
      setUsersList(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      // 3. Fetch groups
      const groupsSnap = await getDocs(collection(db, 'groups'));
      setGroups(groupsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 4. Fetch pending consultations
      const consQuery = query(collection(db, 'consultation_requests'), where('status', '==', 'pending'));
      const consSnap = await getDocs(consQuery);
      setConsultations(consSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 5. Fetch courses
      const coursesSnap = await getDocs(collection(db, 'courses'));
      setCourses(coursesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Moderator fetch error:', err);
    }
  };

  const handleApproveApp = async (id: string, email: string) => {
    try {
      await updateDoc(doc(db, 'teacher_applications', id), { status: 'pending_admin' });
      alert(`Анкета переведена администратору. Можете связаться с кандидатом по: ${email}`);
      fetchData();
    } catch (err) {
      alert('Ошибка!');
    }
  };

  const handleRejectApp = async (id: string) => {
    try {
      await updateDoc(doc(db, 'teacher_applications', id), { status: 'rejected' });
      fetchData();
    } catch (err) {
      alert('Ошибка!');
    }
  };

  const createGroup = async () => {
    if (!newGroupName) return;
    try {
      await addDoc(collection(db, 'groups'), { 
        name: newGroupName, 
        curator_id: selectedCurator, 
        students: [] 
      });
      setNewGroupName('');
      fetchData();
    } catch (err) {
      alert('Ошибка создания группы');
    }
  };

  const autoGenerateGroups = async () => {
    if (!window.confirm('Сгенерировать группы (по макс. 10 человек) для нераспределенных студентов?')) return;
    const students = usersList.filter(u => u.role === 'student');
    const existingStudentIdsInGroups = new Set(groups.flatMap(g => g.students || []));
    const unassignedStudents = students.filter(s => !existingStudentIdsInGroups.has(s.id));
    
    if (unassignedStudents.length === 0) {
      return alert('Все студенты уже распределены по группам.');
    }

    try {
      let groupCount = groups.length + 1;
      for (let i = 0; i < unassignedStudents.length; i += 10) {
        const chunk = unassignedStudents.slice(i, i + 10);
        await addDoc(collection(db, 'groups'), {
          name: `Авто-Группа #${groupCount}`,
          curator_id: curators[0]?.id || '', // assign first curator if any
          students: chunk.map(s => s.id)
        });
        groupCount++;
      }
      alert('Группы успешно сгенерированы!');
      fetchData();
    } catch (err) {
      alert('Ошибка при генерации групп');
    }
  };

  const handleMakeCurator = async () => {
    if (!userToCurator) return alert('Выберите пользователя');
    if (!window.confirm("Назначить этого пользователя куратором?")) return;
    try {
      await api.put(`/admin/users/${userToCurator}/role`, { role: 'curator' });
      alert('Пользователь успешно назначен куратором!');
      setUserToCurator('');
      fetchData(); // re-fetch to update roles
    } catch (err: any) {
      alert('Ошибка при обновлении роли: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleAcceptConsultation = async (id: string, phone: string) => {
    try {
      await updateDoc(doc(db, 'consultation_requests', id), { status: 'accepted', handledBy: user?.id, handledAt: new Date() });
      alert(`Консультация принята! Свяжитесь по номеру: ${phone}`);
      fetchData();
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    }
  };

  const loadCourseLessons = async (courseId: string) => {
    if (selectedCourseForLessons === courseId) {
       setSelectedCourseForLessons(null);
       setLessons([]);
       return;
    }
    try {
      const snap = await getDocs(query(collection(db, `courses/${courseId}/lessons`)));
      setLessons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSelectedCourseForLessons(courseId);
    } catch (err) {
       console.error(err);
    }
  };

  const curators = usersList.filter(u => u.role === 'curator');
  const potentialCurators = usersList.filter(u => u.role !== 'curator' && u.role !== 'admin' && u.role !== 'moderator');

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-primary uppercase">Панель Модератора</h1>
          <p className="text-sm text-slate-500 mt-2">Управление заявками, проверка контента и распределение ролей</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Консультации */}
        <section className="bg-white border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4 border-b pb-2">
            <PhoneIncoming className="text-primary" size={20} />
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Заявки на Консультацию</h2>
          </div>
          <div className="space-y-4">
            {consultations.length === 0 && <div className="text-xs text-slate-400 font-bold uppercase py-4">Нет новых заявок</div>}
            {consultations.map(c => (
              <div key={c.id} className="bg-slate-50 border p-4 flex justify-between items-center">
                 <div>
                   <p className="text-xs font-bold text-primary mb-1">Номер: {c.phone}</p>
                   <p className="text-[10px] text-slate-500">Дата: {c.created_at?.toDate ? c.created_at.toDate().toLocaleString() : 'Неизвестно'}</p>
                 </div>
                 <button onClick={() => handleAcceptConsultation(c.id, c.phone)} className="bg-emerald-500 text-white px-4 py-2 text-[10px] font-black uppercase hover:bg-emerald-600 transition">
                   Принять в работу
                 </button>
              </div>
            ))}
          </div>
        </section>

        {/* Назначение Кураторов */}
        <section className="bg-white border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4 border-b pb-2">
            <UserPlus className="text-accent" size={20} />
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Назначить Куратора</h2>
          </div>
          <div className="flex flex-col gap-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Выберите пользователя для назначения куратором</label>
            <select value={userToCurator} onChange={e => setUserToCurator(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 focus:border-accent p-3 text-sm outline-none">
               <option value="">-- Выбрать пользователя --</option>
               {potentialCurators.map(u => (
                  <option key={u.id} value={u.id}>{u.name || 'Без Имени'} ({u.email}) - {u.role || 'Ученик'}</option>
               ))}
            </select>
            <button onClick={handleMakeCurator} className="bg-accent text-primary font-black uppercase text-xs py-3 hover:opacity-90">
               Дать Звание "Куратор"
            </button>
          </div>
        </section>

      </div>

      {/* Анкеты Учителей */}
      <section>
        <div className="flex items-center gap-2 mb-4 border-b pb-2">
          <ShieldCheck className="text-primary" size={20} />
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Анкеты учителей (Ожидают проверки)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map(app => (
            <div key={app.id} className="bg-white border p-6 shadow-sm">
              <h3 className="text-lg font-bold text-primary mb-1">{app.fullName}</h3>
              <p className="text-xs text-slate-500 mb-4">{app.email}</p>
              
              <div className="space-y-2 mb-6">
                <div className="bg-slate-50 p-2 text-xs"><span className="font-bold text-slate-400 uppercase mr-2">Предмет:</span>{app.subject}</div>
                <div className="bg-slate-50 p-2 text-xs"><span className="font-bold text-slate-400 uppercase mr-2">Опыт:</span>{app.experience} лет</div>
                <div className="bg-slate-50 p-2 text-xs"><span className="font-bold text-slate-400 uppercase mr-2">Образование:</span>{app.education}</div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => handleApproveApp(app.id, app.email)} className="flex-1 bg-primary text-white py-2 text-xs font-bold uppercase tracking-wider hover:bg-primary/90 flex justify-center items-center gap-2">
                  <CheckSquare size={14}/> К Админу
                </button>
                <button onClick={() => handleRejectApp(app.id)} className="flex-1 bg-red-50 text-red-600 py-2 text-xs font-bold uppercase tracking-wider hover:bg-red-100 flex justify-center items-center gap-2">
                  <XSquare size={14}/> Отклон.
                </button>
              </div>
            </div>
          ))}
          {apps.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border-2 border-dashed bg-slate-50">
              Нет новых заявок
            </div>
          )}
        </div>
      </section>

      {/* Проверка Видеоуроков */}
      <section>
        <div className="flex items-center gap-2 mb-4 border-b pb-2">
          <PlayCircle className="text-emerald-500" size={20} />
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Проверка Видео Уроков</h2>
        </div>
        <div className="bg-white border shadow-sm p-4">
           {courses.length === 0 ? <p className="text-xs text-slate-400 uppercase font-bold py-4 text-center">Нет загруженных курсов</p> : (
             <div className="space-y-4">
               {courses.map(course => (
                 <div key={course.id} className="border border-slate-200">
                    <div 
                      className="bg-slate-50 p-4 flex justify-between items-center cursor-pointer hover:bg-slate-100"
                      onClick={() => loadCourseLessons(course.id)}
                    >
                       <div>
                         <h3 className="font-bold text-primary uppercase">{course.title}</h3>
                         <p className="text-xs text-slate-500">Id: {course.id} | Предмет: {course.subject}</p>
                       </div>
                       <div className="text-xs font-bold text-primary px-3 py-1 bg-white border uppercase">
                          {selectedCourseForLessons === course.id ? 'Скрыть уроки' : 'Проверить уроки'}
                       </div>
                    </div>
                    
                    {selectedCourseForLessons === course.id && (
                       <div className="p-4 bg-white border-t space-y-4">
                          {lessons.length === 0 && <p className="text-[10px] uppercase font-bold text-slate-400 py-2">В этом курсе еще нет уроков.</p>}
                          {lessons.map(lesson => (
                              <div key={lesson.id} className="border p-3 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                                 <div>
                                    <h4 className="font-bold text-sm text-primary mb-1">{lesson.title}</h4>
                                    <p className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 inline-block rounded">
                                      Видео ссылка: {lesson.video_url || 'Отсутствует'}
                                    </p>
                                 </div>
                                 <div className="flex gap-2">
                                     {lesson.video_url && (
                                       <a href={lesson.video_url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-slate-300 text-[10px] font-black uppercase hover:bg-slate-50 text-slate-700">
                                         Смотреть
                                       </a>
                                     )}
                                     <button className="px-4 py-2 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase hover:bg-emerald-100">
                                       Проверено (ОК)
                                     </button>
                                 </div>
                              </div>
                          ))}
                       </div>
                    )}
                 </div>
               ))}
             </div>
           )}
        </div>
      </section>

      {/* Управление Группами */}
      <section>
        <div className="flex items-center justify-between gap-2 border-b pb-2 mb-4">
          <div className="flex items-center gap-2">
            <Users className="text-blue-500" size={20} />
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Управление Группами</h2>
          </div>
          <button onClick={autoGenerateGroups} className="px-4 py-1.5 bg-slate-100 text-primary font-black uppercase text-[10px] hover:bg-slate-200 transition-all border border-slate-200">
            Сгенерировать (Авто)
          </button>
        </div>
        
        <div className="bg-white border p-6 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-end">
           <div className="flex-1">
             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Название Группы</label>
             <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} type="text" className="w-full bg-slate-50 border p-3 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Напр. Группа НИШ-А1" />
           </div>
           <div className="flex-1">
             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Назначить куратора</label>
             <select value={selectedCurator} onChange={(e) => setSelectedCurator(e.target.value)} className="w-full bg-slate-50 border p-3 text-sm outline-none">
                <option value="">Без куратора</option>
                {curators.map(c => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
             </select>
           </div>
           <button onClick={createGroup} className="py-3 px-6 bg-primary text-white text-xs font-bold uppercase tracking-wider hover:bg-primary/90">
             Создать Группу
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map(group => (
            <div key={group.id} className="bg-white border p-6 shadow-sm">
               <h3 className="font-bold text-primary mb-2 uppercase">{group.name}</h3>
               <p className="text-xs text-slate-500 mb-2">Куратор: {curators.find(c => c.id === group.curator_id)?.name || 'Не назначен'}</p>
               <p className="text-xs text-slate-500 mb-4">Студентов: {group.students?.length || 0}</p>
               
               <div className="mb-4">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Расписание (видит студент)</label>
                 <textarea 
                   rows={2}
                   className="w-full bg-slate-50 border p-2 text-xs outline-none focus:border-primary resize-none"
                   placeholder="Напр. Пн, Ср, Пт 18:00 - Математика"
                   defaultValue={group.schedule_text || ''}
                   onBlur={async (e) => {
                     const val = e.target.value;
                     if (val !== group.schedule_text) {
                       try {
                         await updateDoc(doc(db, 'groups', group.id), { schedule_text: val });
                       } catch (err) {
                         alert('Ошибка сохранения расписания');
                       }
                     }
                   }}
                 />
               </div>

               <button className="w-full border border-primary text-primary py-2 text-xs font-bold uppercase hover:bg-slate-50 mt-auto">
                 Редактировать состав
               </button>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
