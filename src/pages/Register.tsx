import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { User, Mail, Lock, ShieldCheck } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { registerEmail } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      setIsLoading(false);
      return;
    }

    try {
      await registerEmail(email, password, name);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Пользователь с таким email уже существует');
      } else if (err.code === 'auth/invalid-email') {
        setError('Некорректный формат email');
      } else {
        setError('Ошибка при регистрации. Проверьте данные.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full">
        <div className="card shadow-xl p-8 sm:p-10 bg-white">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-primary mb-2 tracking-tighter">Регистрация</h2>
            <p className="text-slate-400 text-sm">Присоединяйтесь к сообществу BILIMAL</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center font-medium border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Имя и Фамилия</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  placeholder="Иван Иванов"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  placeholder="example@mail.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Пароль (мин. 6 символов)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-start gap-2 pt-2 pb-4">
              <ShieldCheck className="text-emerald-500 mt-0.5 shrink-0" size={16} />
              <p className="text-[10px] text-slate-400 leading-tight">
                Нажимая «Зарегистрироваться», вы соглашаетесь с правилами пользования и политикой конфиденциальности.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full btn-primary bg-primary py-4 font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {isLoading ? 'Создание аккаунта...' : 'Зарегистрироваться'}
            </button>
          </form>

          <div className="mt-8 text-center pt-8 border-t border-slate-100">
            <p className="text-slate-500 text-sm">
              Уже есть аккаунт? <Link to="/login" className="text-primary font-bold hover:underline">Войти</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
