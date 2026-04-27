import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { Users, GraduationCap, Plus, Trash2, Edit } from 'lucide-react';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const { user, isLoading: authLoading } = useAuth();
  
  useEffect(() => {
    // В будущем здесь будет загрузка всех пользователей для админа
    // Сейчас оставим заглушку, но с проверкой прав доступа
    if (user?.role === 'admin') {
      setUsers([
        { id: '1', name: 'Admin User', email: user.email, role: 'admin' },
      ]);
    }
  }, [user]);

  if (authLoading) return <div className="p-20 text-center uppercase tracking-widest text-xs font-bold text-slate-400">Проверка прав...</div>;

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-3xl font-bold text-primary mb-4">Доступ ограничен</h2>
        <p className="text-slate-500 mb-8 max-w-md">Эта страница доступна только администраторам системы BILIMAL.</p>
        <Link to="/dashboard" className="btn-primary">Вернуться в кабинет</Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-primary mb-8 border-b-4 border-accent inline-block pb-2">Панель управления</h1>
        
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="card bg-white flex items-center gap-6">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-lg"><Users size={32}/></div>
            <div>
              <div className="text-2xl font-bold">248</div>
              <div className="text-gray-500 text-sm">Всего учеников</div>
            </div>
          </div>
          <div className="card bg-white flex items-center gap-6">
            <div className="p-4 bg-accent/20 text-accent rounded-lg"><GraduationCap size={32}/></div>
            <div>
              <div className="text-2xl font-bold">12</div>
              <div className="text-gray-500 text-sm">Активных учителей</div>
            </div>
          </div>
          <div className="card bg-white flex items-center gap-6">
            <div className="p-4 bg-green-50 text-green-600 rounded-lg"><Plus size={32}/></div>
            <div>
              <div className="text-2xl font-bold">15</div>
              <div className="text-gray-500 text-sm">Новых заявок</div>
            </div>
          </div>
        </div>

        <section className="card bg-white p-0 overflow-hidden shadow-md">
          <div className="p-6 border-b flex justify-between items-center bg-gray-50">
            <h2 className="text-xl font-bold text-primary">Управление пользователями</h2>
            <button className="btn-primary flex items-center gap-2 text-sm !py-2 !px-4">
              <Plus size={16}/> Добавить пользователя
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-widest font-bold border-b">
                  <th className="px-6 py-4">Имя</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Роль</th>
                  <th className="px-6 py-4">Статус</th>
                  <th className="px-6 py-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-primary">{u.name}</td>
                    <td className="px-6 py-4 text-gray-500">{u.email}</td>
                    <td className="px-6 py-4 lowercase">
                      <span className={`px-2 py-1 rounded text-xs font-bold border ${
                        u.role === 'admin' ? 'bg-red-50 text-red-700 border-red-100' : 
                        u.role === 'teacher' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-700 border-gray-100'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-xs text-green-600 font-bold">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span> Активен
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 text-gray-400 hover:text-primary"><Edit size={18}/></button>
                        <button className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
