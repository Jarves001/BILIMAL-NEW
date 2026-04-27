import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { Timer, AlertTriangle, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface Task {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
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
    api.get(`/lessons/${lessonId}/tasks`, { params: { courseId } })
      .then(res => {
        setTasks(res.data);
        setIsLoading(false);
      })
      .catch(err => {
        if (err.response?.status === 403) {
          setErrorStatus(403);
        }
        setIsLoading(false);
      });

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
      if (answers[task.id] === task.correct_answer || (task.id === tasks[currentIndex].id && selectedAnswer === task.correct_answer)) {
        finalScore++;
      }
    });

    try {
      await api.post('/results', {
        user_id: user?.id,
        lesson_id: lessonId,
        course_id: courseId,
        score: finalScore,
        total_questions: tasks.length
      });
    } catch (err) {
      console.error('Failed to save result:', err);
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
    const score = tasks.reduce((acc, t) => acc + (answers[t.id] === t.correct_answer ? 1 : 0), 0);
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <CheckCircle className="text-accent mx-auto mb-6" size={80} />
          <h2 className="text-4xl font-bold text-primary mb-4">Тест завершен!</h2>
          <div className="text-2xl font-bold text-gray-700 mb-8">Ваш результат: {score} / {tasks.length}</div>
          
          <div className="space-y-6 text-left mb-12">
            {tasks.map((task, i) => (
              <div key={task.id} className={`card ${answers[task.id] === task.correct_answer ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="font-bold mb-2">Вопрос {i + 1}: {task.question}</div>
                <div className="text-sm">
                  {answers[task.id] === task.correct_answer ? (
                    <span className="text-green-700 font-bold">Правильно!</span>
                  ) : (
                    <span className="text-red-700 font-bold">Ошибка. Ваш ответ: {answers[task.id]}, Правильный: {task.correct_answer}</span>
                  )}
                </div>
                <div className="text-xs text-gray-600 mt-2 italic px-4 py-2 bg-white/50 rounded">{task.explanation}</div>
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
          className="card shadow-xl p-12 bg-white min-h-[400px] flex flex-col"
        >
          <h2 className="text-2xl font-bold text-primary mb-12 leading-relaxed">
            {currentTask.question}
          </h2>
          
          <div className="grid gap-4 flex-grow mb-12">
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

          <div className="flex justify-end">
            <button
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
