import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { getSubjectLabel } from '../constants';
import { 
  User as UserIcon, 
  Award, 
  History, 
  Trophy, 
  ChevronRight, 
  Calendar,
  Layers,
  Star,
  CheckCircle,
  Clock,
  AlertCircle,
  LogOut,
  Target,
  Plus,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';

interface Result {
  id: string;
  course_id: string;
  lesson_id: string;
  score: number;
  total_questions: number;
  completed_at: any;
}

export default function Profile() {
  const { user: currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const targetUid = searchParams.get('uid');
  
  const [user, setUser] = useState<any>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [stats, setStats] = useState({
    totalScore: 0,
    lessonsCompleted: 0,
    averageAccuracy: 0,
    level: 1,
    xpToNext: 0
  });

  useEffect(() => {
    async function fetchUserData() {
      setLoading(true);
      try {
        let userData: any = null;
        if (targetUid) {
          const uDoc = await getDoc(doc(db, 'users', targetUid));
          if (uDoc.exists()) {
            userData = { id: uDoc.id, ...uDoc.data() };
          }
        } else {
          userData = currentUser;
        }
        
        if (!userData) return;
        setUser(userData);

        const q = query(
          collection(db, 'results'),
          where('user_id', '==', userData.id),
          limit(20)
        );
        const snap = await getDocs(q);
        const historyData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Result));
        setResults(historyData);

        // Calculate stats
        const total = historyData.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
        const accuracy = historyData.length > 0 
          ? (historyData.reduce((acc, curr) => acc + ((Number(curr.score) || 0) / (Number(curr.total_questions) || 1)), 0) / historyData.length) * 100
          : 0;
        
        const xpPerLevel = 100;
        const currentLevel = Math.floor(total / xpPerLevel) + 1;
        const xpToNext = xpPerLevel - (total % xpPerLevel);

        setStats({
          totalScore: total,
          lessonsCompleted: historyData.length,
          averageAccuracy: Math.round(accuracy),
          level: currentLevel,
          xpToNext
        });

        // Fetch Application
        const appQ = query(
          collection(db, 'teacher_applications'),
          where('user_id', '==', userData.id),
          orderBy('applied_at', 'desc'),
          limit(1)
        );
        const appSnap = await getDocs(appQ);
        if (!appSnap.empty) {
          setApplication({ id: appSnap.docs[0].id, ...appSnap.docs[0].data() });
        }

        // Fetch Goals
        const goalsQ = query(
          collection(db, 'goals'),
          where('user_id', '==', userData.id),
          orderBy('created_at', 'desc')
        );
        const goalsSnap = await getDocs(goalsQ);
        setGoals(goalsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Failed to fetch profile data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [currentUser, targetUid]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.trim() || !user?.id) return;
    try {
      const gRef = await addDoc(collection(db, 'goals'), {
        user_id: user.id,
        title: newGoal.trim(),
        created_at: new Date()
      });
      setGoals([{ id: gRef.id, title: newGoal.trim(), created_at: { toDate: () => new Date() } }, ...goals]);
      setNewGoal('');
    } catch (err) {
      console.error('Failed to create goal:', err);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'goals', id));
      setGoals(goals.filter(g => g.id !== id));
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-12">
      {/* Header / Banner */}
      <div className="bg-primary text-white pt-12 pb-24 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center border-4 border-white/20">
              <UserIcon size={48} className="text-primary" />
            </div>
            {user.role === 'student' && (
              <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-primary w-10 h-10 rounded-full flex items-center justify-center font-black border-2 border-primary shadow-lg">
                {stats.level}
              </div>
            )}
          </div>
          
          <div className="text-center md:text-left flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight mb-1">{user.name}</h1>
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                  <p className="text-white/60 font-mono text-sm">ID: {user.id.slice(0, 8)}...</p>
                  {user.role !== 'student' && (
                    <div className="flex items-center gap-2">
                      <span className="bg-accent text-primary px-3 py-1 rounded-none text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/20">
                        {user.role === 'admin' ? 'Администратор' : 
                         user.role === 'teacher' ? `Учитель: ${getSubjectLabel((user as any).subject || 'general')}` : 
                         user.role === 'curator' ? 'Куратор' : 
                         user.role === 'moderator' ? 'Модератор' : 'Сотрудник'}
                      </span>
                      <span className="bg-white/10 text-white/80 px-3 py-1 rounded-none text-[10px] font-bold uppercase tracking-widest border border-white/10">
                        Статус: Активен
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {user.role !== 'student' && (
                  <Link 
                    to={user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : user.role === 'curator' ? '/curator' : user.role === 'moderator' ? '/moderator' : '/dashboard'}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-primary rounded-none text-sm font-bold uppercase tracking-widest transition-all hover:scale-105"
                  >
                    Панель управления
                  </Link>
                )}
                <button 
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-none text-sm font-bold uppercase tracking-widest transition-all"
                >
                  <LogOut size={18} />
                  Выйти
                </button>
              </div>
            </div>
            
            {user.role === 'student' && (
              <>
                <div className="w-full max-w-sm bg-white/10 h-3 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-accent transition-all duration-1000" 
                    style={{ width: `${((100 - stats.xpToNext) / 100) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-bold text-white/50 uppercase tracking-wider">
                  <span>Уровень {stats.level}</span>
                  <span>{stats.xpToNext} XP до Уровня {stats.level + 1}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-4xl mx-auto px-4 -mt-12">
        {/* Application Status Section */}
        {application && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-6 rounded-none border shadow-sm ${
              application.status === 'pending' ? 'bg-amber-50 border-amber-200' : 
              application.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-none flex items-center justify-center ${
                application.status === 'pending' ? 'bg-amber-100 text-amber-600' : 
                application.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {application.status === 'pending' ? <Clock size={24} /> : 
                 application.status === 'approved' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className={`font-black text-sm uppercase tracking-tight ${
                    application.status === 'pending' ? 'text-amber-800' : 
                    application.status === 'approved' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {application.status === 'pending' ? 'Заявка на роль учителя: В обработке' : 
                     application.status === 'approved' ? 'Принято: Вы стали учителем!' : 'Заявка отклонена'}
                  </h4>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => {
                        window.location.reload(); 
                      }}
                      className="p-1.5 hover:bg-black/5 rounded-none transition-colors"
                      title="Обновить данные"
                    >
                      <History size={14} className={
                        application.status === 'pending' ? 'text-amber-500' : 
                        application.status === 'approved' ? 'text-green-500' : 'text-red-500'
                      } />
                    </button>
                    <span className="text-[10px] font-bold text-slate-400">
                      {application.applied_at && new Date(application.applied_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <p className={`text-xs mt-1 ${
                  application.status === 'pending' ? 'text-amber-600' : 
                  application.status === 'approved' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {application.status === 'pending' 
                    ? 'Ваша заявка проверяется администрацией. Обычно это занимает от 1 до 3 рабочих дней.' 
                    : application.status === 'approved' 
                    ? 'Поздравляем! Вам теперь доступен кабинет преподавателя. Подробнее уточнения вам напишут с администрации и номер для связи 77474193512'
                    : 'К сожалению, ваша заявка была отклонена. Вы можете попробовать подать заявку снова позже или связаться с поддержкой.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {user.role === 'student' ? [
            { label: 'Очки (XP)', value: stats.totalScore, icon: <Star className="text-yellow-500" /> },
            { label: 'Уроки', value: stats.lessonsCompleted, icon: <Layers className="text-blue-500" /> },
            { label: 'Точность', value: `${stats.averageAccuracy}%`, icon: <Trophy className="text-orange-500" /> },
            { label: 'Ранг', value: stats.level > 5 ? 'Продвинутый' : 'Новичок', icon: <Award className="text-emerald-500" /> },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-4 rounded-none shadow-sm border border-slate-100 flex flex-col items-center text-center"
            >
              <div className="mb-2 p-2 bg-slate-50 rounded-none">{stat.icon}</div>
              <div className="text-xl font-black text-slate-800">{stat.value}</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{stat.label}</div>
            </motion.div>
          )) : (
            <>
              <div className="col-span-2 md:col-span-4 bg-white p-6 rounded-none border border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-primary uppercase tracking-tighter">Сотрудник системы</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Роль: {
                    user.role === 'admin' ? 'Администратор' : 
                    user.role === 'curator' ? 'Куратор: Сопровождение учеников и проверка заданий' : 
                    user.role === 'moderator' ? 'Модератор: Проверка заявок и качества платформы' : 
                    user.role === 'teacher' ? `Преподаватель: ${getSubjectLabel((user as any).subject || 'general')}` : 'Сотрудник'
                  }</p>
                </div>
                <div className="bg-green-50 px-4 py-2 rounded-none border border-green-100 shadow-sm flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  <span className="text-green-600 font-black text-[10px] uppercase tracking-widest">Проверен</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Goals Planner for Student */}
        {user.role === 'student' && (
          <div className="bg-white rounded-none shadow-sm border border-slate-100 overflow-hidden mb-8">
            <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Target size={20} className="text-primary" />
                План целей
              </h2>
              <form onSubmit={handleCreateGoal} className="flex gap-2 w-full md:w-auto">
                <input 
                  type="text" 
                  placeholder="Добавить новую цель..."
                  value={newGoal}
                  onChange={e => setNewGoal(e.target.value)}
                  className="flex-1 md:w-64 bg-slate-50 border border-slate-200 px-4 py-2 text-sm outline-none focus:border-accent"
                />
                <button type="submit" className="bg-primary text-white px-4 py-2 hover:bg-primary/90 transition-colors flex items-center justify-center">
                  <Plus size={18} />
                </button>
              </form>
            </div>
            
            <div className="divide-y divide-slate-50">
              {goals.length > 0 ? goals.map(goal => (
                <div key={goal.id} className="p-4 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 flex items-center justify-center rounded-sm text-slate-400">
                      <Target size={14} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{goal.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Добавлено {goal.created_at?.toDate ? goal.created_at.toDate().toLocaleDateString('ru-RU') : 'Недавно'}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteGoal(goal.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2 opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              )) : (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-sm">Нет активных целей. Создайте свой первый план выше!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History */}
        {user.role === 'student' && (
          <div className="bg-white rounded-none shadow-sm border border-slate-100 overflow-hidden mb-8">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <History size={20} className="text-primary" />
                История активности
              </h2>
            </div>

            <div className="divide-y divide-slate-50">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="p-6 animate-pulse flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-none" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-100 rounded w-1/3" />
                      <div className="h-3 bg-slate-100 rounded w-1/4" />
                    </div>
                  </div>
                ))
              ) : results.length > 0 ? (
                results.map((res) => (
                  <div key={res.id} className="p-6 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                    <div className={`w-12 h-12 rounded-none flex items-center justify-center font-bold text-lg
                      ${(res.score / res.total_questions) >= 0.8 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}
                    `}>
                      {Math.round((res.score / res.total_questions) * 100)}%
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-800">Урок завершен</div>
                      <div className="text-sm text-slate-400 flex items-center gap-2">
                        <Calendar size={12} />
                        {res.completed_at?.toDate?.() ? res.completed_at.toDate().toLocaleDateString() : 'Недавно'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-primary">+{res.score} XP</div>
                      <div className="text-xs font-bold text-slate-300">{res.score}/{res.total_questions} правильно</div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-400">
                  <Layers className="mx-auto mb-4 opacity-20" size={48} />
                  <p>Вы еще не завершили ни одного урока.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
