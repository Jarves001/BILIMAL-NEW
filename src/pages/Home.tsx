import { Link } from 'react-router-dom';
import { BookOpen, Target, Award, ShieldCheck, GraduationCap, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Home() {
  const subjects = [
    { title: 'Математика', icon: <BookOpen className="text-accent" />, description: 'Углубленная программа НИШ/БИЛ', slug: 'math' },
    { title: 'Логика & IQ', icon: <Target className="text-accent" />, description: 'Решение нестандартных задач', slug: 'logic' },
    { title: 'Языки', icon: <Award className="text-accent" />, description: 'Казахский, Русский, Английский', slug: 'languages' },
    { title: 'Анализ текста', icon: <GraduationCap className="text-accent" />, description: 'Критическое чтение и понимание', slug: 'reading' },
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative min-h-[500px] md:h-[600px] flex items-center py-12 overflow-hidden bg-primary">
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-12 gap-4 h-full transform -rotate-12 scale-150">
            {Array.from({ length: 48 }).map((_, i) => (
              <div key={i} className="border border-white h-32 rounded-lg" />
            ))}
          </div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-accent uppercase tracking-[0.3em] font-bold text-sm mb-4 block">Professional Preparation</span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-8 max-w-3xl">
              Ваш путь в <span className="text-accent italic">НИШ и БИЛ</span> начинается здесь
            </h1>
            <p className="text-xl text-gray-300 mb-10 max-w-2xl leading-relaxed">
              Академическая платформа с реальными тестами, видеоуроками и глубоким анализом прогресса. Подготовьтесь к государственным экзаменам по профессиональным стандартам.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/login" className="btn-primary !bg-accent !text-primary text-lg !px-8 !py-4 text-center">Начать подготовку</Link>
              <Link to="/login" className="btn-outline !border-white !text-white text-lg !px-8 !py-4 text-center">Пробный доступ</Link>
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
        
        <div className="grid md:grid-cols-4 gap-8">
          {subjects.map((subject, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -10 }}
              className="card border-t-4 border-t-accent flex flex-col items-center text-center p-8 bg-white shadow-lg hover:shadow-2xl transition-all"
            >
              <div className="mb-6 p-4 bg-gray-50 rounded-full">{subject.icon}</div>
              <h3 className="text-xl font-bold mb-3">{subject.title}</h3>
              <p className="text-gray-600 text-sm mb-6">{subject.description}</p>
              <Link 
                to={`/quiz?subject=${subject.slug}`} 
                className="mt-auto text-primary font-bold flex items-center gap-1 hover:gap-2 transition-all"
              >
                Пройти тест <ChevronRight size={18} />
              </Link>
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
