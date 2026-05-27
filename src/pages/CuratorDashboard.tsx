import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Users, Video, Calendar, ShieldCheck } from 'lucide-react';
import ScheduleEditor from '../components/ScheduleEditor';

export default function CuratorDashboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    try {
      const q = user?.role === 'admin' ? collection(db, 'groups') : query(collection(db, 'groups'), where('curator_id', '==', user?.id));
      const snap = await getDocs(q);
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-primary uppercase">Панель Куратора</h1>
        <p className="text-sm text-slate-500 mt-2">Управление академическими группами и посещаемостью</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map(group => (
          <div key={group.id} className="bg-white border shadow-sm p-6">
            <h3 className="text-lg font-bold text-primary mb-2 uppercase">{group.name}</h3>
            <div className="flex bg-slate-50 p-3 items-center justify-between mb-4">
               <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Users size={14}/> Студентов:</span>
               <span className="text-sm font-black">{group.students?.length || 0}</span>
            </div>
               
            <ScheduleEditor 
              groupId={group.id} 
              initialSchedule={group.schedule_data || []} 
              fallbackText={group.schedule_text} 
            />

            <button className="w-full py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors">
              Журнал посещаемости
            </button>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed bg-slate-50">
            <p className="text-sm text-slate-500 uppercase tracking-widest font-bold">У вас пока нет групп</p>
          </div>
        )}
      </div>
    </div>
  );
}
