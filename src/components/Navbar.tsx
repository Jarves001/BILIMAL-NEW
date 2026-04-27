import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BookOpen, LogOut, User as UserIcon, Shield } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-primary text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-accent rounded flex items-center justify-center font-bold text-primary text-xl">B</div>
            <span className="text-2xl font-bold tracking-tighter">BILIMAL</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="hover:text-accent transition-colors">Главная</Link>
            {user && (
              <>
                <Link to="/dashboard" className="hover:text-accent transition-colors">Обучение</Link>
                {user.role === 'admin' && <Link to="/admin" className="hover:text-accent transition-colors">Админ</Link>}
              </>
            )}
            
            {!user ? (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="hover:text-accent transition-colors font-medium">Войти</Link>
                <Link to="/register" className="bg-accent text-primary px-4 py-2 rounded font-semibold hover:bg-opacity-90 transition-all">Регистрация</Link>
              </div>
            ) : (
              <div className="flex items-center space-x-4 border-l border-gray-700 pl-4">
                <div className="flex items-center space-x-2 text-sm text-gray-300">
                  <UserIcon size={16} />
                  <span>{user.name}</span>
                </div>
                <button onClick={handleLogout} className="text-gray-300 hover:text-white transition-colors">
                  <LogOut size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
