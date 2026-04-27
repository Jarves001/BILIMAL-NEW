import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, User, CreditCard } from 'lucide-react';

export default function MobileNav() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: <Home size={24} />, label: 'Главная' },
    { path: '/dashboard', icon: <BookOpen size={24} />, label: 'Портал' },
    { path: '/subscriptions', icon: <CreditCard size={24} />, label: 'Тарифы' },
    { path: '/profile', icon: <User size={24} />, label: 'Профиль' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around items-center h-20 px-4 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link 
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-500'}`}
          >
            <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-primary/5' : ''}`}>
              {item.icon}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-tighter transition-all ${isActive ? 'opacity-100 translate-y-0' : 'opacity-60 -translate-y-1'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
