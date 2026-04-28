import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Timer, AlertTriangle, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface Task {
  id: string;
  type?: 'choice' | 'open' | 'multi_choice';
  question: string;
  image_url?: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
}

function MathKeyboard({ onInput, onDelete }: { onInput: (v: string) => void, onDelete: () => void }) {
  const keys = [
    ['7', '8', '9', '÷'],
    ['4', '5', '6', '×'],
    ['1', '2', '3', '−'],
    ['0', '.', '/', '+'],
    ['(', ')', ',', '√'],
  ];

  return (
    <div className="bg-slate-100 p-4 rounded-3xl grid grid-cols-4 gap-3 shadow-inner max-w-md mx-auto border-4 border-white">
      {keys.flat().map(key => (
        <button
          key={key}
          type="button"
          onClick={() => onInput(key)}
          className="h-14 bg-white rounded-2xl shadow-sm active:shadow-none active:translate-y-0.5 transition-all font-black text-xl text-primary hover:bg-slate-50 flex items-center justify-center border-b-4 border-slate-200"
        >
          {key}
        </button>
      ))}
      <button
        type="button"
        onClick={onDelete}
        className="h-14 bg-red-50 text-red-500 rounded-2xl shadow-sm font-black text-xl hover:bg-red-100 col-span-2 border-b-4 border-red-200"
      >
        ⌫
      </button>
      <button
        type="button"
        onClick={() => onInput(' ')}
        className="h-14 bg-slate-200 text-slate-500 rounded-2xl shadow-sm font-black text-[10px] uppercase tracking-widest col-span-2 border-b-4 border-slate-300"
      >
        Пробел
      </button>
    </div>
  );
}

export default function TestView() {
  const { lessonId } = useParams();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes
  const [isFinished, setIsFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  useEffect(() => {
    async function fetchTasks() {
      if (!lessonId || !courseId) return;
      try {
        const tasksSnap = await getDocs(collection(db, 'courses', courseId, 'lessons', lessonId, 'tasks'));
        if (tasksSnap.empty) {
          console.log('No tasks found in subcollection, checking global results? No, should be in subcollection.');
        }
        const tasksData = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        setTasks(tasksData);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to fetch tasks from Firestore:', err);
        setErrorStatus(500);
        setIsLoading(false);
      }
    }

    fetchTasks();

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lessonId]);

  const handleNext = () => {
    if (selectedAnswer) {
      setAnswers({ ...answers, [tasks[currentIndex].id]: selectedAnswer });
      setSelectedAnswer(null);
      if (currentIndex < tasks.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        finishTest();
      }
    }
  };

  const finishTest = async () => {
    setIsFinished(true);
    let finalScore = 0;
    
    tasks.forEach(task => {
      const userAnswer = (answers[task.id] || (task.id === tasks[currentIndex].id ? selectedAnswer : '') || '').toString().trim();
      const correctAnswer = (task.correct_answer || '').toString().trim();
      
      const normalize = (s: string, type?: string) => {
        if (type === 'multi_choice') {
          return s.split(',').filter(Boolean).map(x => x.trim().toUpperCase()).sort().join(',');
        }
        return s.toLowerCase().replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, ' ');
      };
      
      if (normalize(userAnswer, task.type) === normalize(correctAnswer, task.type)) {
        finalScore++;
      }
    });

    try {
      await addDoc(collection(db, 'results'), {
        user_id: user?.id,
        lesson_id: lessonId,
        course_id: courseId,
        score: finalScore,
        total_questions: tasks.length,
        answers: answers, // Save all answers for teacher review
        completed_at: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to save result to Firestore:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) return <div className="p-20 text-center uppercase tracking-widest text-xs font-bold text-slate-400">Синхронизация теста...</div>;

  if (errorStatus === 403) {
    return (
      <div className="max-w-xl mx-auto py-20 px-6 text-center">
        <div className="bg-red-50 border border-red-100 p-12 shadow-sm">
          <XCircle className="text-red-500 mx-auto mb-6" size={64} />
          <h2 className="text-2xl font-bold text-primary mb-4">Доступ ограничен</h2>
          <p className="text-slate-500 text-sm mb-10">Прохождение тестов доступно только пользователям с активной подпиской. Пожалуйста, выберите подходящий тариф.</p>
          <button onClick={() => navigate('/subscriptions')} className="btn-primary w-full">Купить подписку</button>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) return <div className="p-20 text-center uppercase tracking-widest text-xs font-bold text-slate-400">В этом модуле пока нет вопросов.</div>;

  if (isFinished) {
    const normalize = (s: string, type?: string) => {
      const val = (s || '').toString().trim();
      if (type === 'multi_choice') {
        return val.split(',').filter(Boolean).map(x => x.trim().toUpperCase()).sort().join(',');
      }
      return val.toLowerCase().replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, ' ');
    };
    const score = tasks.reduce((acc, t) => acc + (normalize(answers[t.id], t.type) === normalize(t.correct_answer, t.type) ? 1 : 0), 0);
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <CheckCircle className="text-accent mx-auto mb-6" size={80} />
          <h2 className="text-4xl font-bold text-primary mb-4">Тест завершен!</h2>
          <div className="text-2xl font-bold text-gray-700 mb-8">Ваш результат: {score} / {tasks.length}</div>
          
          <div className="space-y-6 text-left mb-12">
            {tasks.map((task, i) => (
              <div key={task.id} className={`card ${answers[task.id] === task.correct_answer ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex gap-4">
                  {task.image_url && (
                    <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-white/50 shadow-sm">
                      <img src={task.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-bold mb-2 text-primary">Вопрос {i + 1}: {task.question}</div>
                    <div className="text-sm">
                      {normalize(answers[task.id], task.type) === normalize(task.correct_answer, task.type) ? (
                        <span className="text-green-700 font-bold flex items-center gap-1"><CheckCircle size={14}/> Дұрыс!</span>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-red-700 font-bold flex items-center gap-1"><XCircle size={14}/> Қате.</span>
                          <p className="text-xs text-red-600/70 italic">Сіздің жауабыңыз: {answers[task.id]}</p>
                          <p className="text-xs text-green-700 font-bold">Дұрыс жауабы: {task.correct_answer}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {task.explanation && (
                  <div className="text-xs text-gray-600 mt-3 italic px-4 py-3 bg-white/50 rounded-xl border border-white/30">{task.explanation}</div>
                )}
              </div>
            ))}
          </div>

          <button onClick={() => navigate('/dashboard')} className="btn-primary !px-12 !py-4">Вернуться в кабинет</button>
        </motion.div>
      </div>
    );
  }

  const currentTask = tasks[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b sticky top-16 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-primary">
            <Timer className={timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-accent'} />
            <span className="tabular-nums">{formatTime(timeLeft)}</span>
          </div>
          <div className="text-sm font-bold text-gray-400">
            Вопрос {currentIndex + 1} из {tasks.length}
          </div>
          <div className="w-48 bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / tasks.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="flex-grow max-w-4xl w-full mx-auto px-4 py-12">
        <motion.div 
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card shadow-xl px-1 p-12 bg-white min-h-[400px] flex flex-col sm:px-12"
        >
          {currentTask.image_url && (
            <div className="mb-8 rounded-3xl overflow-hidden border-8 border-slate-50 shadow-inner max-w-2xl mx-auto w-full">
              <img 
                src={currentTask.image_url} 
                alt="Question data" 
                className="w-full h-auto max-h-[300px] object-contain bg-slate-50"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <h2 className="text-2xl font-bold text-primary mb-12 leading-relaxed text-center">
            {currentTask.question}
          </h2>
          
          <div 
            className="flex-grow flex flex-col justify-center items-center"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                // If answer is selected, move to next
                if (selectedAnswer) {
                  const nextBtn = document.getElementById('next-task-btn');
                  nextBtn?.click();
                }
              }
            }}
          >
            {currentTask.type === 'open' ? (
              <div className="w-full space-y-8">
                <div className="max-w-md mx-auto">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Ваш ответ</div>
                  <input 
                    readOnly
                    placeholder="Байланысу..."
                    className="w-full text-center text-3xl font-black p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none text-primary placeholder:text-slate-200"
                    value={selectedAnswer || ''}
                  />
                </div>
                <MathKeyboard 
                  onInput={(v) => setSelectedAnswer(prev => (prev || '') + v)}
                  onDelete={() => setSelectedAnswer(prev => (prev || '').slice(0, -1))}
                />
              </div>
            ) : currentTask.type === 'multi_choice' ? (
              <div className="grid gap-4 w-full">
                {[
                  { key: 'A', text: currentTask.option_a },
                  { key: 'B', text: currentTask.option_b },
                  { key: 'C', text: currentTask.option_c },
                  { key: 'D', text: currentTask.option_d },
                ].map((opt) => {
                  const currentSelected = (selectedAnswer || '').split(',').filter(Boolean);
                  const isSelected = currentSelected.includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      onClick={() => {
                        const next = isSelected 
                          ? currentSelected.filter(c => c !== opt.key)
                          : [...currentSelected, opt.key].sort();
                        setSelectedAnswer(next.length > 0 ? next.join(',') : null);
                      }}
                      className={`flex items-center p-5 rounded-lg border-2 text-left transition-all group ${
                        isSelected 
                          ? 'border-accent bg-accent/5 ring-1 ring-accent' 
                          : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-md flex items-center justify-center font-bold mr-4 shrink-0 transition-colors ${
                        isSelected ? 'bg-accent text-primary' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                      }`}>
                         <div className={`w-5 h-5 border-2 rounded ${isSelected ? 'bg-primary border-primary flex items-center justify-center' : 'border-slate-300'}`}>
                           {isSelected && <span className="text-[10px] text-white font-black">✓</span>}
                         </div>
                      </div>
                      <span className={`font-medium ${isSelected ? 'text-primary' : 'text-gray-700'}`}>
                        {opt.key}: {opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-4 w-full">
                {[
                  { key: 'A', text: currentTask.option_a },
                  { key: 'B', text: currentTask.option_b },
                  { key: 'C', text: currentTask.option_c },
                  { key: 'D', text: currentTask.option_d },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSelectedAnswer(opt.key)}
                    className={`flex items-center p-5 rounded-lg border-2 text-left transition-all group ${
                      selectedAnswer === opt.key 
                        ? 'border-accent bg-accent/5 ring-1 ring-accent' 
                        : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-10 h-10 rounded-md flex items-center justify-center font-bold mr-4 shrink-0 transition-colors ${
                      selectedAnswer === opt.key ? 'bg-accent text-primary' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                    }`}>
                      {opt.key}
                    </span>
                    <span className={`font-medium ${selectedAnswer === opt.key ? 'text-primary' : 'text-gray-700'}`}>
                      {opt.text}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              id="next-task-btn"
              disabled={!selectedAnswer}
              onClick={handleNext}
              className={`btn-primary flex items-center gap-2 !px-10 !py-4 ${!selectedAnswer ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {currentIndex < tasks.length - 1 ? 'Следующий вопрос' : 'Завершить тест'}
              <ArrowRight size={20} />
            </button>
          </div>
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 flex items-center gap-2 text-gray-400 text-sm">
        <AlertTriangle size={14} />
        <span>Вы не сможете вернуться к предыдущему вопросу. Выбирайте внимательно.</span>
      </div>
    </div>
  );
}
