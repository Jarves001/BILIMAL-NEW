import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { 
  User as UserIcon, 
  Award, 
  History, 
  Trophy, 
  ChevronRight, 
  Calendar,
  Layers,
  Star
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
  const { user } = useAuth();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalScore: 0,
    lessonsCompleted: 0,
    averageAccuracy: 0,
    level: 1,
    xpToNext: 0
  });

  useEffect(() => {
    if (!user) return;

    async function fetchHistory() {
      try {
        const q = query(
          collection(db, 'results'),
          where('user_id', '==', user?.id),
          orderBy('completed_at', 'desc'),
          limit(20)
        );
        const snap = await getDocs(q);
        const historyData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Result));
        setResults(historyData);

        // Calculate stats
        const total = historyData.reduce((acc, curr) => acc + curr.score, 0);
        const accuracy = historyData.length > 0 
          ? (historyData.reduce((acc, curr) => acc + (curr.score / curr.total_questions), 0) / historyData.length) * 100
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
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [user]);

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
            <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-primary w-10 h-10 rounded-full flex items-center justify-center font-black border-2 border-primary shadow-lg">
              {stats.level}
            </div>
          </div>
          
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl font-black tracking-tight mb-1">{user.name}</h1>
            <p className="text-white/60 font-mono text-sm mb-4">ID: {user.id.slice(0, 8)}...</p>
            
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
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-4xl mx-auto px-4 -mt-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
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
              className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center"
            >
              <div className="mb-2 p-2 bg-slate-50 rounded-xl">{stat.icon}</div>
              <div className="text-xl font-black text-slate-800">{stat.value}</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* History */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-8">
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
                  <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                  </div>
                </div>
              ))
            ) : results.length > 0 ? (
              results.map((res) => (
                <div key={res.id} className="p-6 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg
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
      </div>
    </div>
  );
}
