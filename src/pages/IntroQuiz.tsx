import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, ChevronRight, CheckCircle2, XCircle, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Question {
  id: number;
  question: string;
  options: string[];
  correct: number;
}

const QUIZ_DATA: Record<string, Question[]> = {
  math: [
    { id: 1, question: "25% от 200 = ?", options: ["25", "50", "75", "100"], correct: 1 },
    { id: 2, question: "Найди значение: 48 ÷ 6 × 3", options: ["4", "8", "24", "18"], correct: 2 },
    { id: 3, question: "Периметр квадрата 20 см. Найди длину его стороны.", options: ["4 см", "5 см", "6 см", "10 см"], correct: 1 },
    { id: 4, question: "Вычисли: 7² + 3²", options: ["58", "49", "52", "60"], correct: 0 },
    { id: 5, question: "Сколько минут в 2.5 часах?", options: ["120", "130", "150", "180"], correct: 2 },
    { id: 6, question: "Найди неизвестное: x + 15 = 40", options: ["20", "25", "30", "35"], correct: 1 },
    { id: 7, question: "Вычисли: 12 × 8 − 20", options: ["76", "96", "80", "60"], correct: 0 },
    { id: 8, question: "Найди площадь прямоугольника со сторонами 6 см и 9 см.", options: ["54 см²", "45 см²", "36 см²", "60 см²"], correct: 0 },
    { id: 9, question: "Вычисли: 1/2 + 1/4", options: ["2/6", "3/4", "1/3", "2/4"], correct: 1 },
    { id: 10, question: "Если 1 кг = 1000 г, сколько грамм в 3.5 кг?", options: ["350", "3500", "3000", "2500"], correct: 1 },
    { id: 11, question: "Найди результат: 100 − (25 + 15)", options: ["60", "70", "50", "65"], correct: 0 },
    { id: 12, question: "Сколько всего сторон у 5 фигур, если у каждой по 4 стороны?", options: ["10", "15", "20", "25"], correct: 2 },
    { id: 13, question: "Вычисли: 9 × 9 − 10", options: ["71", "81", "72", "70"], correct: 0 },
    { id: 14, question: "Если цена 1 тетради 120 тг, сколько стоят 5 таких тетрадей?", options: ["500 тг", "600 тг", "700 тг", "550 тг"], correct: 1 },
    { id: 15, question: "Найди значение: 45 ÷ 5 + 6", options: ["9", "15", "12", "20"], correct: 1 },
    { id: 16, question: "Сколько секунд в 5 минутах?", options: ["300", "200", "250", "150"], correct: 0 },
    { id: 17, question: "Вычисли: 8³", options: ["512", "64", "256", "128"], correct: 0 },
    { id: 18, question: "Найди: 60% от 50", options: ["20", "25", "30", "35"], correct: 2 },
    { id: 19, question: "Если у тебя 3 коробки по 12 карандашей, сколько всего карандашей?", options: ["24", "36", "48", "30"], correct: 1 },
    { id: 20, question: "Вычисли: 1000 − 250", options: ["650", "700", "750", "800"], correct: 2 },
  ],
  logic: [
    { id: 1, question: "Если 3 + 5 = 24, 4 + 6 = 40, то 5 + 7 = ?", options: ["60", "70", "72", "80"], correct: 0 },
    { id: 2, question: "Если 2 × 3 = 10, 3 × 4 = 17, 4 × 5 = 26, то 5 × 6 = ?", options: ["30", "35", "37", "40"], correct: 2 },
    { id: 3, question: "Продолжите ряд: 2, 4, 8, 16, 32, ...", options: ["40", "64", "100", "84"], correct: 1 },
    { id: 4, question: "9 + 1 = 810, 8 + 2 = 610, 7 + 3 = ?", options: ["410", "510", "610", "710"], correct: 0 },
    { id: 5, question: "5 + 5 = 50, 4 + 6 = 40, 3 + 7 = ?", options: ["30", "35", "25", "20"], correct: 0 },
    { id: 6, question: "Если 1 = 5, 2 = 10, 3 = 15, то 4 = ?", options: ["20", "25", "16", "30"], correct: 0 },
    { id: 7, question: "Если 12 → 6, 14 → 7, 16 → 8, то 20 → ?", options: ["9", "10", "12", "8"], correct: 1 },
    { id: 8, question: "Какое число, умноженное само на себя, дает 49?", options: ["5", "6", "7", "8"], correct: 2 },
    { id: 9, question: "Найдите пропущенное число: 3, 9, 27, __", options: ["54", "81", "90", "108"], correct: 1 },
    { id: 10, question: "Если 4 × 3 = 12, а 12 ÷ 3 = 4, то 6 × 2 = ?", options: ["8", "10", "12", "14"], correct: 2 },
    { id: 11, question: "Найдите следующую букву: A, C, E, G, __", options: ["H", "J", "I", "K"], correct: 2 },
    { id: 12, question: "Если CAT = 24 (3+1+20), то DOG = ?", options: ["26", "27", "28", "29"], correct: 2 },
    { id: 13, question: "Если A = 1, B = 2, то сумма C + D = ?", options: ["5", "6", "7", "8"], correct: 1 },
    { id: 14, question: "Что идет следующим в последовательности? Z, X, V, T, __", options: ["R", "S", "P", "Q"], correct: 0 },
    { id: 15, question: "Если APPLE = 50, то BANANA = ?", options: ["40", "45", "60", "55"], correct: 2 },
    { id: 16, question: "Найдите лишнее слово:", options: ["КНИГА", "РУЧКА", "КАРАНДАШ", "МЕЛОК"], correct: 0 },
    { id: 17, question: "Если ШКОЛА = 60, то КЛАСС = ?", options: ["55", "60", "65", "70"], correct: 1 },
    { id: 18, question: "Какое слово отличается от остальных?", options: ["Яблоко", "Банан", "Морковь", "Манго"], correct: 2 },
    { id: 19, question: "Если СИНИЙ = 2, ЗЕЛЕНЫЙ = 3, то КРАСНЫЙ = ?", options: ["2", "3", "4", "5"], correct: 0 },
    { id: 20, question: "Найдите следующую пару: AB, BC, CD, DE, __", options: ["EF", "FG", "GH", "HI"], correct: 0 },
  ],
  russian: [
    { id: 1, question: "Укажи правильно написанное слово:", options: ["жи-раф", "жирав", "жираф", "жыраф"], correct: 2 },
    { id: 2, question: "Найди синоним к слову 'большой':", options: ["маленький", "огромный", "тихий", "быстрый"], correct: 1 },
    { id: 3, question: "Где допущена ошибка?", options: ["школа", "учитель", "учиник", "книга"], correct: 2 },
    { id: 4, question: "Выбери правильное окончание: 'Я чита__ книгу'", options: ["ет", "ю", "ем", "ишь"], correct: 1 },
    { id: 5, question: "Главная мысль предложения: 'Мальчик помог бабушке перейти дорогу.'", options: ["Мальчик играл", "Помощь старшим", "Он шел домой", "Был дождь"], correct: 1 },
  ],
  kazakh: [
    { id: 6, question: "Дұрыс жазылған сөзді таңда:", options: ["мектеб", "мектеп", "мектепп", "мектепь"], correct: 1 },
    { id: 7, question: "'Үлкен' сөзінің синонимі:", options: ["кіші", "зор", "баяу", "ұзын"], correct: 1 },
    { id: 8, question: "Қай сөзде қате бар?", options: ["бала", "кітап", "окушы", "мұғалім"], correct: 2 },
    { id: 9, question: "Сөйлемді толықтыр: 'Мен мектепке ___'", options: ["барды", "барамын", "бардың", "бардысың"], correct: 1 },
    { id: 10, question: "'Бала анасына көмектесті' мәтінінің негізгі ойы:", options: ["Ойын", "Көмек", "Жүгіру", "Ұйықтау"], correct: 1 },
  ],
  english: [
    { id: 11, question: "Choose the correct word:", options: ["scool", "school", "shool", "scol"], correct: 1 },
    { id: 12, question: "Synonym of 'big':", options: ["small", "large", "slow", "short"], correct: 1 },
    { id: 13, question: "Choose the correct sentence:", options: ["He go to school", "He goes to school", "He going school", "He gone school"], correct: 1 },
    { id: 14, question: "Fill the gap: 'I ___ a student.'", options: ["is", "are", "am", "be"], correct: 2 },
    { id: 15, question: "Main idea: 'The boy helped his friend.'", options: ["Playing", "Helping", "Running", "Sleeping"], correct: 1 },
  ],
  reading: [
    { id: 1, question: "Алия начала читать книги каждый день. Сначала было сложно, но через неделю она стала быстрее понимать тексты. Почему ей сначала было трудно?", options: ["Книги скучные", "Она не привыкла", "Нет времени", "Не умела читать"], correct: 1 },
    { id: 2, question: "Какой вывод можно сделать из истории Алии?", options: ["Читать бесполезно", "Привычки развиваются со временем", "Книги не помогают", "Нужно читать редко"], correct: 1 },
    { id: 3, question: "Один класс готовился к тесту заранее, другой — за день. Первый класс сдал лучше. Почему?", options: ["Они умнее", "Они готовились заранее", "Легче задания", "Помог учитель"], correct: 1 },
    { id: 4, question: "Главная идея текста про подготовку к тесту:", options: ["Экзамены сложные", "Подготовка заранее важна", "Учителя помогают", "Ученики ленивые"], correct: 1 },
    { id: 5, question: "Мальчик сменил дешевый телефон на дорогой и качественный. Почему?", options: ["Захотел новый", "Понял, что качество важнее", "Потерял старый", "Ему подарили"], correct: 1 },
    { id: 6, question: "Ученики, делающие ДЗ сразу, получают лучшие оценки. Какова особенность второй группы?", options: ["Они лучше учатся", "Они откладывают дела", "Они умнее", "Они быстрее"], correct: 1 },
    { id: 7, question: "В городе посадили деревья, и через года воздух стал чище. Почему?", options: ["Меньше машин", "Деревья очищают воздух", "Люди уехали", "Пошел дождь"], correct: 1 },
    { id: 8, question: "Учитель объяснил тему дважды, и ученики лучше ее поняли. Что помогло ученикам?", options: ["Сами выучили", "Повторное объяснение", "Легкая тема", "Удача"], correct: 1 },
    { id: 9, question: "Два друга тренировались: один ежедневно, другой редко. Первый стал сильнее. Почему?", options: ["Старше", "Регулярные тренировки", "Талант", "Рост"], correct: 1 },
    { id: 10, question: "Девочка боялась выступать, но после нескольких попыток стала уверенной. Что помогло?", options: ["Удача", "Практика", "Помощь друзей", "Время"], correct: 1 },
  ]
};

export default function IntroQuiz() {
  const [searchParams] = useSearchParams();
  const subject = searchParams.get('subject') || 'math';
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [lives, setLives] = useState(3);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    const pool = QUIZ_DATA[subject] || QUIZ_DATA.math;
    // Shuffle and take 5
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
    setQuestions(shuffled);
  }, [subject]);

  const handleAnswer = (index: number) => {
    if (selectedOption !== null || questions.length === 0) return;
    
    setSelectedOption(index);
    const correct = index === questions[currentStep].correct;
    setIsCorrect(correct);

    if (!correct) {
      setLives(prev => prev - 1);
      if (lives <= 1) {
        setTimeout(() => setIsGameOver(true), 1000);
      }
    }

    setTimeout(() => {
      if (currentStep < questions.length - 1) {
        if (lives > (correct ? 0 : 1)) {
          setCurrentStep(prev => prev + 1);
          setSelectedOption(null);
          setIsCorrect(null);
        }
      } else if (lives > (correct ? 0 : 1)) {
        setIsFinished(true);
      }
    }, 1500);
  };

  const retry = () => {
    const pool = QUIZ_DATA[subject] || QUIZ_DATA.math;
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
    setQuestions(shuffled);
    setCurrentStep(0);
    setLives(3);
    setSelectedOption(null);
    setIsCorrect(null);
    setIsGameOver(false);
  };

  if (isGameOver) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card bg-white p-10 text-center max-w-sm shadow-2xl">
          <XCircle className="mx-auto text-red-500 mb-4" size={80} />
          <h2 className="text-3xl font-bold mb-2">Попытки закончились!</h2>
          <p className="text-slate-500 mb-8">Не расстраивайтесь, это отличный повод начать обучение.</p>
          <div className="space-y-3">
            <button onClick={retry} className="w-full py-4 bg-slate-100 font-bold rounded-xl hover:bg-slate-200 transition-all">Попробовать снова</button>
            <button onClick={() => navigate('/register')} className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:shadow-lg transition-all">Зарегистрироваться</button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card bg-white p-10 text-center max-w-md shadow-2xl">
          <Trophy className="mx-auto text-yellow-500 mb-4 animate-bounce" size={80} />
          <h2 className="text-4xl font-black text-primary mb-4 tracking-tighter">ПОЗДРАВЛЯЕМ!</h2>
          <p className="text-slate-600 text-lg mb-8 font-medium">Вы успешно прошли вступительный тест! У вас отличный потенциал для поступления в НИШ или БИЛ.</p>
          <button 
            onClick={() => navigate('/register')}
            className="w-full btn-primary bg-primary py-5 text-xl font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all"
          >
            Продолжить обучение <ChevronRight />
          </button>
        </motion.div>
      </div>
    );
  }

  const q = questions[currentStep];

  if (questions.length === 0 || !q) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-200" />
          <div className="h-4 w-32 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 pt-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-1">
            {[...Array(3)].map((_, i) => (
              <Heart 
                key={i} 
                className={`${i < lives ? 'text-red-500 fill-red-500' : 'text-slate-200'} transition-all duration-500`} 
                size={28} 
              />
            ))}
          </div>
          <div className="text-slate-400 font-bold">
            Вопрос {currentStep + 1} из {questions.length}
          </div>
          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500" 
              style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentStep}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className="card bg-white p-8 sm:p-10 shadow-xl relative overflow-hidden"
          >
            <h3 className="text-2xl font-bold text-slate-800 mb-8 leading-tight">{q.question}</h3>
            
            <div className="space-y-4">
              {q.options.map((opt, i) => {
                const isSelected = selectedOption === i;
                const isCorrectOpt = q.correct === i;
                const showSuccess = selectedOption !== null && isCorrectOpt;
                const showDanger = isSelected && !isCorrectOpt;

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={selectedOption !== null}
                    className={`w-full p-5 text-left rounded-2xl border-2 font-bold transition-all flex items-center justify-between group
                      ${selectedOption === null ? 'border-slate-100 hover:border-primary hover:bg-slate-50' : ''}
                      ${showSuccess ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : ''}
                      ${showDanger ? 'border-red-500 bg-red-50 text-red-700' : ''}
                      ${selectedOption !== null && !showSuccess && !showDanger ? 'border-slate-50 text-slate-300' : ''}
                    `}
                  >
                    <span>{opt}</span>
                    {showSuccess && <CheckCircle2 className="text-emerald-500" />}
                    {showDanger && <XCircle className="text-red-500" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-slate-400 text-sm mt-8 font-medium">
          Пройдите этот короткий тест, чтобы мы оценили ваш уровень
        </p>
      </div>
    </div>
  );
}
