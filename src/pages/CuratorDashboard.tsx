import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Users, Calendar, ShieldCheck, Mail, CheckCircle2, ChevronRight, Activity, Clock } from 'lucide-react';
import ScheduleEditor from '../components/ScheduleEditor';
import AttendanceModal from '../components/AttendanceModal';

export default function CuratorDashboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceGroup, setAttendanceGroup] = useState<any>(null);

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

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs h-full flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          Загрузка данных...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      <div className="mb-8 border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary uppercase mb-2">
            Панель Куратора
          </h1>
          <p className="text-sm text-slate-500 font-medium tracking-wide">
            Управление академическими группами, мониторинг успеваемости и посещаемости
          </p>
        </div>
        
        <div className="flex gap-4">
           <div className="bg-white border rounded-xl p-3 px-6 shadow-sm flex items-center gap-4">
              <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
                <Users size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Вспомогаемых Групп</p>
                <p className="text-xl font-black text-primary leading-none">{groups.length}</p>
              </div>
           </div>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-12 animate-in slide-in-from-bottom-4 duration-700">
        <div className="bg-slate-50 p-6 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-accent/20 p-2 rounded-lg text-primary">
              <ShieldCheck size={20} />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary">
              Мои Учебные Группы
            </h2>
          </div>
        </div>

        <div className="p-6 bg-slate-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {groups.map(group => (
              <div key={group.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow group/card relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 group-hover/card:scale-110 transition-transform"></div>
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-black text-primary text-xl uppercase tracking-wide mb-1 flex items-center gap-2">
                      {group.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                       <CheckCircle2 size={12} className="text-emerald-500" /> Активна
                    </div>
                  </div>
                  <span className="bg-slate-100 text-slate-600 px-4 py-2 text-[10px] rounded-lg font-black uppercase flex items-center gap-2 shadow-sm border border-slate-200">
                    <Users size={14} className="text-primary" /> {group.students?.length || 0} уч.
                  </span>
                </div>
                
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 flex-grow">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                      <Clock size={12} /> Расписание занятий
                   </div>
                   <ScheduleEditor 
                     groupId={group.id} 
                     initialSchedule={group.schedule_data || []} 
                     fallbackText={group.schedule_text} 
                   />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-auto">
                   <button 
                     onClick={() => setAttendanceGroup(group)}
                     className="w-full bg-primary/5 text-primary border border-primary/10 rounded-xl py-3.5 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2"
                   >
                      Журнал
                   </button>
                   <button className="w-full border-2 border-slate-200 text-slate-600 rounded-xl py-3.5 text-[10px] font-black uppercase tracking-widest hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2">
                     Ученики <ChevronRight size={14} />
                   </button>
                </div>
              </div>
            ))}
            
            {groups.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-xl border border-slate-200 border-dashed">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                   <Activity size={32} />
                </div>
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Нет закрепленных групп</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                   Модератор или администратор еще не назначил вам учебные группы для сопровождения.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <AttendanceModal 
        isOpen={!!attendanceGroup} 
        onClose={() => setAttendanceGroup(null)} 
        group={attendanceGroup} 
      />
    </div>
  );
}
