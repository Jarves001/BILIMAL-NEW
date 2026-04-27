import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';
import { Check, Zap, Award, Crown } from 'lucide-react';
import { motion } from 'motion/react';

const PLANS = [
  {
    id: 'test',
    title: 'Тесты',
    price: '4 990',
    duration: '30 дней',
    features: [
      'Доступ ко всем тестам',
      'Статистика успеваемости',
      'Без видео-уроков',
      'Без AI чата',
      'Без пробных экзаменов',
    ],
    icon: Zap,
    color: 'blue'
  },
  {
    id: 'basic',
    title: 'Стандарт',
    price: '9 990',
    duration: '30 дней',
    features: [
      'Доступ к видео-урокам',
      'Доступ ко всем тестам',
      '1 Пробный экзамен',
      'Без AI чата',
      'Профессиональная поддержка',
    ],
    icon: Award,
    color: 'primary',
    popular: true
  },
  {
    id: 'premium',
    title: 'Премиум',
    price: '24 990',
    duration: '90 дней',
    features: [
      'Видео-уроки всех разделов',
      'Доступ ко всем тестам',
      '3 Пробных экзамена',
      'AI Чат с учителем',
      'Персональные рекомендации',
    ],
    icon: Crown,
    color: 'accent'
  }
];

export default function Subscriptions() {
  const { user, isLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentSub, setCurrentSub] = useState<any>(null);

  useEffect(() => {
    if (user) {
      api.get('/my-subscription').then(res => setCurrentSub(res.data));
    }
  }, [user]);

  const handleSubscribe = async (planId: string) => {
    if (!user) return alert('Пожалуйста, войдите в систему');
    setLoading(true);
    try {
      await api.post('/subscribe', { plan: planId });
      // Данные обновятся автоматически через onSnapshot в AuthProvider
      const updatedSub = await api.get('/my-subscription');
      setCurrentSub(updatedSub.data);
      alert('Подписка успешно оформлена!');
    } catch (err) {
      console.error(err);
      alert('Ошибка при оформлении подписки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-primary mb-4">Выберите ваш план обучения</h1>
        <p className="text-slate-500">Инвестируйте в свое будущее с BILIMAL</p>
      </div>

      {currentSub && (
        <div className="mb-12 bg-accent/10 border border-accent/30 p-6 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary opacity-60">Текущая подписка</p>
            <h2 className="text-xl font-bold text-primary capitalize">{currentSub.plan} Планирование</h2>
            <p className="text-xs text-slate-500 mt-1">Истекает: {new Date(currentSub.end_date).toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{currentSub.exams_left}</p>
            <p className="text-[10px] font-bold uppercase text-slate-400">Экзаменов осталось</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        {PLANS.map((plan) => (
          <div 
            key={plan.id} 
            className={`bg-white border-2 p-8 flex flex-col relative ${plan.popular ? 'border-primary shadow-xl scale-105 z-10' : 'border-slate-100 shadow-sm'}`}
          >
            {plan.popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full">
                Популярный выбор
              </div>
            )}
            
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-6 ${plan.id === 'premium' ? 'bg-accent/20 text-accent' : 'bg-primary/10 text-primary'}`}>
              <plan.icon size={24} />
            </div>

            <h3 className="text-xl font-bold text-primary mb-2">{plan.title}</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-3xl font-bold text-primary">{plan.price} ₸</span>
              <span className="text-slate-400 text-sm">/ {plan.duration}</span>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                  <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button 
              disabled={loading || currentSub?.plan === plan.id}
              onClick={() => handleSubscribe(plan.id)}
              className={`w-full py-3 text-sm font-bold uppercase tracking-widest rounded transition-all ${
                plan.id === 'premium' 
                ? 'bg-accent text-primary hover:bg-accent/90 shadow-lg shadow-accent/20' 
                : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {currentSub?.plan === plan.id ? 'Текущий план' : 'Выбрать план'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-16 bg-slate-50 p-8 text-center border">
        <h4 className="font-bold text-primary mb-2">Нужна корпоративная подписка?</h4>
        <p className="text-sm text-slate-500 mb-6">Свяжитесь с нами для специальных условий для школ и образовательных центров.</p>
        <button className="btn-outline">Связаться с нами</button>
      </div>
    </div>
  );
}
