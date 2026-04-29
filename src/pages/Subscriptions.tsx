import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Check, Zap, Award, Crown } from 'lucide-react';
import { motion } from 'motion/react';

const PLANS = [
  {
    id: 'single',
    title: '1 Предмет',
    price: '6 990',
    duration: '30 дней',
    features: [
      'Доступ к 1 выбранному предмету',
      'Видео-уроки и лекции',
      'Тематические тесты',
      'Еженедельные экзамены',
      'Чат с учителем',
    ],
    icon: Zap,
    color: 'blue'
  },
  {
    id: 'monthly',
    title: 'Все предметы (Месяц)',
    price: '29 990',
    duration: '30 дней',
    features: [
      'Доступ ко всем предметам',
      'Все видео-уроки',
      'Безлимитные тесты',
      'Еженедельные экзамены',
      'Чат со всеми учителями',
      'Экономия 5 000 ₸',
    ],
    icon: Award,
    color: 'primary',
    popular: true
  },
  {
    id: 'yearly',
    title: 'Все предметы (Год)',
    price: '299 990',
    duration: '1 год',
    features: [
      'Полный доступ на 12 месяцев',
      'Все видео-уроки и обновления',
      'Все тесты и экзамены',
      'Приоритетный чат с учителями',
      'Экономия 119 000 ₸',
    ],
    icon: Crown,
    color: 'accent'
  }
];

export default function Subscriptions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentSub, setCurrentSub] = useState<any>(null);

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'users', user.id, 'subscription', 'current'))
        .then(snap => snap.exists() ? setCurrentSub(snap.data()) : setCurrentSub(null))
        .catch(err => console.error('Failed to fetch subscription:', err));
    }
  }, [user]);

  const handleManualPayment = () => {
    const message = encodeURIComponent(`Здравствуйте! Я хочу оплатить подписку на BILIMAL. Мой ID: ${user?.id}`);
    window.open(`https://wa.me/77474193512?text=${message}`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-primary mb-4 uppercase tracking-tighter">Планы обучения</h1>
        <p className="text-slate-500 font-medium">Выберите подходящий формат и начните путь к успеху</p>
      </div>

      <div className="mb-12 bg-white border-2 border-dashed border-slate-200 p-8 rounded-3xl text-center">
        <h3 className="text-xl font-black text-primary mb-4 uppercase tracking-tighter">Как оплатить?</h3>
        <p className="text-slate-500 mb-6 font-medium">Оплатите выбранную сумму на карту и отправьте чек в WhatsApp для активации</p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          <div className="bg-slate-50 px-8 py-4 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Номер карты (Kaspi/Halyk)</p>
            <p className="text-xl font-black text-primary tracking-widest whitespace-nowrap">4400 4303 0464 5945</p>
          </div>
          <button 
            onClick={handleManualPayment}
            className="bg-[#25D366] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-lg shadow-[#25D366]/20"
          >
            Отправить чек в WhatsApp
          </button>
        </div>
      </div>

      {currentSub && (
        <div className="mb-12 bg-accent/10 border border-accent/20 p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60">Текущая подписка активна</p>
            </div>
            <h2 className="text-2xl font-black text-primary uppercase tracking-tighter">{currentSub.plan === 'yearly' ? 'Годовой доступ' : currentSub.plan === 'monthly' ? 'Месячный доступ' : '1 Предмет'}</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Истекает: {new Date(currentSub.end_date).toLocaleDateString()}</p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-3xl font-black text-primary tracking-tighter">{currentSub.exams_left || 0}</p>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Экзаменов осталось</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        {PLANS.map((plan) => (
          <div 
            key={plan.id} 
            className={`bg-white border-2 p-8 flex flex-col rounded-3xl relative transition-all hover:translate-y-[-8px] ${plan.popular ? 'border-primary shadow-2xl scale-105 z-10' : 'border-slate-100 shadow-sm'}`}
          >
            {plan.popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                Лучшая цена
              </div>
            )}
            
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${plan.id === 'yearly' ? 'bg-accent/20 text-accent' : 'bg-primary/10 text-primary'}`}>
              <plan.icon size={28} />
            </div>

            <h3 className="text-2xl font-black text-primary mb-2 uppercase tracking-tighter">{plan.title}</h3>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-black text-primary tracking-tighter">{plan.price} ₸</span>
              <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">/ {plan.duration}</span>
            </div>

            <ul className="space-y-4 mb-10 flex-1">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-600">
                  <div className="mt-1 bg-green-100 rounded-full p-0.5 shrink-0">
                    <Check size={12} className="text-green-600" />
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={handleManualPayment}
              className={`w-full py-4 text-xs font-black uppercase tracking-widest rounded-2xl transition-all ${
                plan.id === 'yearly' 
                ? 'bg-accent text-primary hover:bg-accent/90 shadow-xl shadow-accent/20' 
                : 'bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/20'
              }`}
            >
              Выбрать план
            </button>
          </div>
        ))}
      </div>

      <div className="mt-20 bg-slate-900 border border-white/10 p-12 rounded-[2.5rem] text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full -ml-32 -mb-32 blur-3xl"></div>
        
        <div className="relative z-10">
          <h4 className="font-black text-3xl text-white mb-4 uppercase tracking-tighter">Нужна консультация?</h4>
          <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto font-medium">Свяжитесь с нами для получения специальных условий или помощи с выбором тарифа.</p>
          <button 
            onClick={handleManualPayment}
            className="bg-white text-primary px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-accent hover:text-primary transition-all shadow-2xl"
          >
            Связаться с нами
          </button>
        </div>
      </div>
    </div>
  );
}
