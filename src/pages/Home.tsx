import { Link } from 'react-router-dom';
import { BookOpen, Target, Award, ShieldCheck, GraduationCap, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Home() {
  const subjects = [
    { title: 'Математика', icon: <BookOpen className="w-8 h-8" />, description: 'Углубленная программа НИШ/БИЛ', slug: 'math', image: '/math-bg.png' },
    { title: 'Логика & IQ', icon: <Target className="w-8 h-8" />, description: 'Решение нестандартных задач', slug: 'logic', image: '/logic-bg.png' },
    { title: 'Казахский язык', icon: <Award className="w-8 h-8" />, description: 'Грамматика және мәтін талдау', slug: 'kazakh', image: '/kazakh-bg.png' },
    { title: 'Русский язык', icon: <Award className="w-8 h-8" />, description: 'Грамотность чтения и язык', slug: 'russian', image: '/russian-bg.png' },
    { title: 'Английский язык', icon: <Award className="w-8 h-8" />, description: 'Reading & Grammar skills', slug: 'english', image: '/english-bg.png' },
    { title: 'Анализ текста', icon: <GraduationCap className="w-8 h-8" />, description: 'Критическое чтение и понимание', slug: 'reading', image: '/reading-bg.png' },
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative min-h-[500px] md:h-[600px] flex items-center py-12 overflow-hidden bg-primary">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-luminosity"
          style={{ backgroundImage: "url('/hero-bg.png')" }}
        />
        <div className="absolute inset-0 bg-primary/70 z-0" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-accent uppercase tracking-[0.3em] font-bold text-sm mb-4 block">Professional Preparation</span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-8 max-w-3xl drop-shadow-md">
              Ваш путь в <span className="text-accent italic drop-shadow-md">НИШ и БИЛ</span> начинается здесь
            </h1>
            <p className="text-xl text-gray-200 mb-10 max-w-2xl leading-relaxed drop-shadow-md font-medium">
              Академическая платформа с реальными тестами, видеоуроками и глубоким анализом прогресса. Подготовьтесь к НИШ и БИЛ по профессиональным стандартам.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 drop-shadow-lg">
              <Link to="/login" className="btn-primary !bg-accent !text-primary text-lg !px-8 !py-4 text-center border-2 border-accent hover:bg-accent/90">Начать подготовку</Link>
              <Link to="/login" className="btn-outline !bg-primary/50 !border-white !text-white text-lg !px-8 !py-4 text-center backdrop-blur-sm hover:!bg-white hover:!text-primary transition-all">Пробный доступ</Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Subjects Grid */}
      <section className="py-24 max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-primary mb-4">Направления обучения</h2>
          <div className="h-1 w-20 bg-accent mx-auto" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {subjects.map((subject, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -10 }}
              className="card flex flex-col items-center text-center bg-white shadow-lg shadow-black/5 hover:shadow-2xl transition-all overflow-hidden rounded-none border border-slate-100 relative group min-h-[320px]"
            >
              <div 
                className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url(${subject.image})` }}
              />
              <div className="absolute inset-0 z-0 bg-gradient-to-b from-primary/90 via-primary/80 to-primary/90 opacity-90 group-hover:opacity-80 transition-opacity" />

              <div className="relative z-10 p-8 w-full h-full flex flex-col items-center text-white">
                <div className="mb-6 p-4 bg-white/10 backdrop-blur-md rounded-full mt-4 border border-white/20 text-accent group-hover:bg-accent group-hover:text-primary transition-colors">{subject.icon}</div>
                <h3 className="text-2xl font-bold mb-3">{subject.title}</h3>
                <p className="text-gray-200 text-sm mb-6">{subject.description}</p>
                <Link 
                  to={`/quiz?subject=${subject.slug}`} 
                  className="mt-auto text-accent font-bold flex items-center gap-1 hover:gap-2 transition-all drop-shadow-md"
                >
                Пройти тест <ChevronRight size={18} />
              </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats/Proof */}
      <section className="bg-gray-50 py-20 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-12 text-center">
          <div>
            <div className="text-4xl font-bold text-primary mb-2">94%</div>
            <div className="text-gray-500 uppercase tracking-widest text-xs">Поступаемость учеников</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary mb-2">5000+</div>
            <div className="text-gray-500 uppercase tracking-widest text-xs">Тестовых вопросов</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary mb-2">24/7</div>
            <div className="text-gray-500 uppercase tracking-widest text-xs">Доступ к материалам</div>
          </div>
        </div>
      </section>
    </div>
  );
}
