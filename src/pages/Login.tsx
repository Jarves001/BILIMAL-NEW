import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Chrome } from 'lucide-react';

export default function Login() {
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError('');
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setError('Не удалось войти через Google. Попробуйте снова.');
      console.error(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="card shadow-lg p-10 bg-white text-center">
          <h2 className="text-3xl font-bold text-center text-primary mb-2 tracking-tighter">Вход в BILIMAL</h2>
          <p className="text-slate-400 text-sm mb-8">Платформа подготовки к НИШ, БИЛ и РФМШ</p>
          
          {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-6 text-sm text-center font-medium border border-red-100">{error}</div>}
          
          <button 
            onClick={handleGoogleLogin} 
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 py-4 px-6 rounded-xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-200 transition-all shadow-sm group active:scale-95 disabled:opacity-50"
          >
            <Chrome className="text-primary group-hover:scale-110 transition-transform" size={24} />
            {isLoggingIn ? 'Вход...' : 'Войти через Google'}
          </button>

          <div className="mt-8 pt-8 border-t border-slate-100">
            <p className="text-gray-500 text-sm">
              Нет аккаунта? Мы создадим его автоматически при первом входе
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
