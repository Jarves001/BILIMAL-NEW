import { useAuth } from '../hooks/useAuth';

export default function Header({ title }: { title: string }) {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-10">
      <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm font-medium text-slate-500">
        <span className="text-slate-900 font-bold sm:font-medium">{title}</span>
      </div>
      <div className="flex items-center gap-3 md:gap-6">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 text-[11px] font-bold border border-green-200 rounded-full">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
          <span>Система онлайн</span>
        </div>
        <div className="hidden sm:block w-px h-6 bg-slate-200"></div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-bold leading-none">{user?.name}</p>
            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">
              {user?.role === 'admin' ? 'Администратор' : user?.role === 'teacher' ? 'Преподаватель' : 'Студент НИШ/БИЛ'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
