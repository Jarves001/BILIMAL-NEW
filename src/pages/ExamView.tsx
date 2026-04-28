import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, getDocs, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Timer, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle, 
  AlertCircle, 
  X,
  BookMarked,
  Layout,
  Trophy,
  ArrowLeft
} from 'lucide-react';

export default function ExamView() {
  const { examId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    async function fetchExam() {
      if (!examId) return;
      try {
        const examDoc = await getDoc(doc(db, 'exams', examId));
        if (examDoc.exists()) {
          const examData = examDoc.data();
          setExam(examData);
          setTimeLeft(examData.duration_minutes * 60);

          const qSnap = await getDocs(collection(db, `exams/${examId}/questions`));
          setQuestions(qSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (err) {
        console.error('Error fetching exam:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchExam();
  }, [examId]);

  useEffect(() => {
    if (timeLeft > 0 && !isFinished) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timeLeft, isFinished]);

  const handleSelect = (qId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [qId]: answer }));
  };

  const handleSubmit = async () => {
    if (isFinished) return;
    setIsFinished(true);
    clearInterval(timerRef.current);

    let finalScore = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) {
        finalScore++;
      }
    });
    setScore(finalScore);

    try {
      await addDoc(collection(db, 'exam_results'), {
        exam_id: examId,
        user_id: user?.id,
        user_name: user?.name,
        score: finalScore,
        total_questions: questions.length,
        answers: answers,
        completed_at: serverTimestamp(),
        subject: exam.subject
      });
    } catch (err) {
      console.error('Error saving result:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) return <div className="p-20 text-center uppercase font-black text-primary tracking-widest animate-pulse">Подготовка экзамена...</div>;
  if (!exam) return <div className="p-20 text-center">Экзамен не найден</div>;

  if (isFinished) {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white max-w-lg w-full rounded-[40px] shadow-2xl p-12 text-center"
        >
          <div className="w-24 h-24 bg-accent/20 rounded-3xl flex items-center justify-center mx-auto mb-8 text-primary">
            <Trophy size={48} />
          </div>
          <h2 className="text-3xl font-black text-primary uppercase tracking-tight mb-2">Экзамен завершен!</h2>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-10">Ваш результат зафиксирован</p>
          
          <div className="bg-slate-50 rounded-3xl p-8 mb-8">
            <div className="text-6xl font-black text-primary mb-2">{score} / {questions.length}</div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Правильных ответов</p>
            <div className="w-full bg-slate-200 h-3 mt-6 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${percent}%` }}
                 className={`h-full ${percent > 70 ? 'bg-green-500' : 'bg-accent'}`}
               />
            </div>
            <p className="mt-4 text-xs font-black text-primary uppercase tracking-widest">{percent}% успеха</p>
          </div>

          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
          >
            Вернуться в панель
          </button>
        </motion.div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white p-6 md:px-12 flex items-center justify-between sticky top-0 z-50">
         <div className="flex items-center gap-4">
            <button 
               onClick={() => { if(window.confirm('Вы уверены? Прогресс будет потерян.')) navigate('/dashboard'); }}
               className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
               <h1 className="font-black text-sm md:text-lg uppercase tracking-tight line-clamp-1">{exam.title}</h1>
               <div className="flex items-center gap-2 text-[10px] text-white/50 font-bold uppercase tracking-widest">
                  <BookMarked size={12} /> {currentIdx + 1} / {questions.length} вопросов
               </div>
            </div>
         </div>
         <div className={`px-6 py-2 rounded-xl flex items-center gap-3 font-mono font-black text-lg transition-all ${timeLeft < 300 ? 'bg-red-500 animate-pulse' : 'bg-white/10'}`}>
            <Timer size={20} />
            {formatTime(timeLeft)}
         </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-12">
        <div className="mb-12">
           <div className="flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-widest mb-4">
              <Layout size={14} /> Вопрос № {currentIdx + 1}
           </div>
           <h2 className="text-xl md:text-3xl font-bold text-primary leading-tight">
             {currentQ.question}
           </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-12">
          {['A', 'B', 'C', 'D'].map(opt => {
             const key = `option_${opt.toLowerCase()}`;
             const isSelected = answers[currentQ.id] === opt;
             return (
               <button
                 key={opt}
                 onClick={() => handleSelect(currentQ.id, opt)}
                 className={`w-full p-6 rounded-[25px] border-2 text-left transition-all flex items-center gap-6 group hover:scale-[1.02] ${
                   isSelected 
                     ? 'border-accent bg-accent/5 ring-4 ring-accent/10 shadow-xl' 
                     : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                 }`}
               >
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all ${
                   isSelected ? 'bg-accent text-primary scale-110 shadow-lg' : 'bg-white text-slate-300'
                 }`}>
                   {opt}
                 </div>
                 <span className={`flex-1 font-bold md:text-lg ${isSelected ? 'text-primary' : 'text-slate-600'}`}>
                   {currentQ[key]}
                 </span>
                 {isSelected && <CheckCircle size={24} className="text-accent" />}
               </button>
             );
          })}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-12 border-t border-slate-100">
           <button 
             disabled={currentIdx === 0}
             onClick={() => setCurrentIdx(prev => prev - 1)}
             className="flex items-center gap-2 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs text-slate-400 hover:text-primary disabled:opacity-0 transition-all"
           >
             <ChevronLeft size={18} /> Назад
           </button>

           {currentIdx === questions.length - 1 ? (
             <button 
               onClick={() => { if(window.confirm('Завершить экзамен?')) handleSubmit(); }}
               className="bg-accent text-primary px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 shadow-xl transition-all"
             >
               Завершить экзамен
             </button>
           ) : (
             <button 
               onClick={() => setCurrentIdx(prev => prev + 1)}
               className="bg-primary text-white px-10 py-5 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-primary/90 shadow-xl transition-all"
             >
               Следующий вопрос <ChevronRight size={18} />
             </button>
           )}
        </div>
      </main>

      {/* Question Palette (Optional but useful) */}
      <div className="bg-slate-50 p-6 border-t overflow-x-auto hide-scrollbar whitespace-nowrap">
         <div className="max-w-4xl mx-auto flex gap-3 px-4">
            {questions.map((q, idx) => (
              <button 
                key={q.id}
                onClick={() => setCurrentIdx(idx)}
                className={`w-10 h-10 rounded-xl shrink-0 font-black text-[10px] transition-all border-2 ${
                  currentIdx === idx ? 'bg-primary text-white border-primary shadow-lg scale-110' : 
                  answers[q.id] ? 'bg-accent/20 text-primary border-accent/30' : 'bg-white text-slate-300 border-slate-100'
                }`}
              >
                {idx + 1}
              </button>
            ))}
         </div>
      </div>
    </div>
  );
}
