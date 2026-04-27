import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  LayoutDashboard, 
  BookOpen, 
  Trophy, 
  Settings, 
  Shield, 
  GraduationCap,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const links = [
    { name: 'Дашборд', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Каталог курсов', path: '/dashboard', icon: BookOpen }, // Reusing dashboard for catalog for now
    { name: 'Настроить тариф', path: '/subscriptions', icon: Trophy },
  ];

  const subjects = [
    { name: 'Математика', path: '/dashboard?subject=math' },
    { name: 'Логика & IQ', path: '/dashboard?subject=logic' },
    { name: 'Анализ текста', path: '/dashboard?subject=lang' },
  ];

  return (
    <aside className="w-64 bg-primary text-white flex flex-col shrink-0 h-screen sticky top-0 overflow-hidden">
      <div className="p-6 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent flex items-center justify-center font-bold text-primary rounded">B</div>
          <span className="text-xl font-bold tracking-tight">BILIMAL</span>
        </div>
        <p className="text-[10px] text-accent uppercase tracking-[0.2em] mt-1 font-semibold">Academic Platform</p>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto px-3 space-y-1">
        <div className="text-[10px] uppercase text-white/40 font-bold px-3 py-2 tracking-widest">Основное меню</div>
        {links.map(link => (
          <Link
            key={link.path}
            to={link.path}
            className={`sidebar-link ${isActive(link.path) ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
          >
            <link.icon size={18} />
            <span>{link.name}</span>
          </Link>
        ))}

        {user?.role === 'admin' && (
          <Link
            to="/admin"
            className={`sidebar-link ${isActive('/admin') ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
          >
            <Shield size={18} />
            <span>Админ-панель</span>
          </Link>
        )}

        <div className="text-[10px] uppercase text-white/40 font-bold px-3 py-2 tracking-widest mt-4">Предметы НИШ/БИЛ</div>
        {subjects.map(subject => (
          <Link
            key={subject.name}
            to={subject.path}
            className="sidebar-link sidebar-link-inactive !text-xs"
          >
            {subject.name}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 bg-primary/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-accent/20 flex items-center justify-center text-accent">
            <UserIcon size={20} />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold truncate">{user?.name}</p>
            <p className="text-[10px] text-accent truncate uppercase font-bold">
              {user?.subscription === 'active' ? 'PRO Подписка' : 'Обычный аккаунт'}
            </p>
          </div>
          <button onClick={() => logout()} className="text-white/40 hover:text-white">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
