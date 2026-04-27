import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { BookOpen, GraduationCap, ChevronRight, Star, Clock, FilterX } from 'lucide-react';
import { motion } from 'motion/react';

interface Course {
  id: string;
  title: string;
  subject: string;
  description: string;
}

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const subjectFilter = searchParams.get('subject');

  useEffect(() => {
    api.get('/courses').then(res => {
      // Ensure unique courses by ID
      const uniqueCourses = res.data.reduce((acc: Course[], current: Course) => {
        const x = acc.find(item => item.id === current.id);
        if (!x) return acc.concat([current]);
        return acc;
      }, []);
      setCourses(uniqueCourses);
    });
  }, []);

  const filteredCourses = useMemo(() => {
    if (!subjectFilter) return courses;
    return courses.filter(c => c.subject.toLowerCase() === subjectFilter.toLowerCase());
  }, [courses, subjectFilter]);

  const getSubjectTitle = () => {
    switch(subjectFilter?.toLowerCase()) {
      case 'math': return 'Математика';
      case 'logic': return 'Логика & IQ';
      case 'lang': return 'Анализ текста';
      default: return 'Все курсы';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border p-4 shadow-sm">
          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Академическая готовность</p>
          <p className="text-2xl font-bold text-primary mt-1">84.2%</p>
          <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full overflow-hidden">
            <div className="bg-accent h-full" style={{ width: '84%' }}></div>
          </div>
        </div>
        <div className="bg-white border p-4 shadow-sm">
          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Тестов завершено</p>
          <p className="text-2xl font-bold text-primary mt-1">142 <span className="text-xs text-slate-400 font-normal">/ 200</span></p>
          <p className="text-[10px] text-green-600 font-bold mt-2">+12 на этой неделе</p>
        </div>
        <div className="bg-white border p-4 shadow-sm">
          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Пробные экзамены</p>
          <p className="text-2xl font-bold text-primary mt-1">
            {user?.subInfo?.exams_left ?? 0} <span className="text-xs text-slate-400 font-normal">осталось</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-2">Доступно в вашем тарифе</p>
        </div>
        <div className="bg-white border p-4 border-accent/30 bg-accent/5 shadow-sm">
          <p className="text-[10px] uppercase text-primary font-bold tracking-wider">Ваша подписка</p>
          <p className="text-lg font-bold text-accent mt-1 capitalize">
            {user?.subInfo?.plan ? `${user.subInfo.plan} план` : 'Пробный период'}
          </p>
          <p className="text-[10px] text-slate-500 mt-2">
            {user?.subInfo?.end_date 
              ? `Действует до ${new Date(user.subInfo.end_date).toLocaleDateString()}`
              : 'Ограниченный доступ'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Course Listing */}
          <div className="bg-white border shadow-sm">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold uppercase tracking-tight text-primary">
                {subjectFilter ? `Раздел: ${getSubjectTitle()}` : 'Доступные курсы и программы'}
              </h3>
              {subjectFilter && (
                <Link to="/dashboard" className="text-[10px] font-bold text-slate-400 hover:text-primary uppercase tracking-widest flex items-center gap-1">
                  <FilterX size={12} /> Сбросить фильтр
                </Link>
              )}
            </div>
            <div className="p-0 divide-y">
              {filteredCourses.length > 0 ? filteredCourses.map((course) => (
                <div key={course.id} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-slate-50 transition-colors group">
                  <div className="w-full md:w-48 aspect-video bg-primary flex items-center justify-center rounded shrink-0 overflow-hidden relative">
                    <BookOpen className="text-white opacity-20" size={32} />
                    <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-all"></div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">{course.subject}</div>
                    <h4 className="font-bold text-lg text-primary leading-tight mb-2">{course.title}</h4>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">{course.description}</p>
                    <div className="flex items-center gap-4">
                      <Link to={`/courses/${course.id}`} className="btn-primary !py-2 !px-4">Продолжить</Link>
                      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Clock size={12} /> Обновлено недавно
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-20 text-center text-slate-400">
                  <BookOpen className="mx-auto mb-4 opacity-20" size={48} />
                  <p className="text-sm font-bold uppercase tracking-widest">В этом разделе курсы пока не добавлены</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          <div className="bg-white border shadow-sm">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-tight text-primary">Ближайшие цели</h3>
            </div>
            <div className="p-0">
              <div className="p-4 border-b hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded">СРОЧНО</span>
                  <span className="text-[10px] text-slate-400 font-mono">12 Май, 14:00</span>
                </div>
                <p className="text-xs font-bold mt-1">Симуляция НИШ №8</p>
                <p className="text-[10px] text-slate-500 uppercase mt-1">25 вопросов | 45 мин</p>
              </div>
              <div className="p-4 border-b hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded">ОБЫЧНО</span>
                  <span className="text-[10px] text-slate-400 font-mono">14 Май, 09:00</span>
                </div>
                <p className="text-xs font-bold mt-1">Тест на паттерны IQ</p>
                <p className="text-[10px] text-slate-500 uppercase mt-1">15 вопросов | 20 мин</p>
              </div>
            </div>
          </div>

          <div className="bg-primary text-white p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-widest text-accent mb-4">Академическая справка</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Ваши показатели в разделе "Математика" выросли на 12% за текущий месяц. Рекомендуем уделить внимание разделу "Анализ текста".
            </p>
            <button className="w-full btn-accent">Скачать отчет</button>
          </div>
        </div>
      </div>
    </div>
  );
}
