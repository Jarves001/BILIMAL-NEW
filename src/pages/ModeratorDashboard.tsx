import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import { Users, Video, Calendar, CheckSquare, XSquare, ShieldCheck, Mail } from 'lucide-react';

export default function ModeratorDashboard() {
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedCurator, setSelectedCurator] = useState<string>('');

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

  const curators = usersList.filter(u => u.role === 'curator');

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-primary uppercase">Панель Модератора</h1>
          <p className="text-sm text-slate-500 mt-2">Управление заявками и распределение студентов</p>
        </div>
        <button onClick={autoGenerateGroups} className="px-6 py-3 bg-accent text-primary font-black uppercase text-xs tracking-widest shadow-sm hover:scale-105 transition-all">
          Сгенерировать группы (Авто)
        </button>
      </div>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 border-b pb-2">Анкеты учителей (Ожидают проверки модератором)</h2>
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
                  <CheckSquare size={14}/> В Админ
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

      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 border-b pb-2">Управление Группами</h2>
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
             Создать
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map(group => (
            <div key={group.id} className="bg-white border p-6 shadow-sm">
               <h3 className="font-bold text-primary mb-2 uppercase">{group.name}</h3>
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

               <button className="w-full border border-primary text-primary py-2 text-xs font-bold uppercase hover:bg-slate-50">
                 Редактировать состав
               </button>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
