import React, { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', { name, email, password, role });
      navigate('/login');
    } catch (err: any) {
      setError('Ошибка при регистрации. Возможно, email уже занят.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="card shadow-lg p-10 bg-white">
          <h2 className="text-3xl font-bold text-center text-primary mb-8 tracking-tighter">Регистрация в BILIMAL</h2>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-6 text-sm text-center font-medium border border-red-100">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Имя и Фамилия</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-accent outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-accent outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Пароль</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-accent outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Роль</label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-accent outline-none"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="student">Ученик</option>
                <option value="teacher">Учитель</option>
              </select>
            </div>
            <button type="submit" className="w-full btn-primary bg-primary py-4 font-bold text-lg hover:scale-[1.02] active:scale-[0.98]">
              Зарегистрироваться
            </button>
          </form>
          <p className="mt-8 text-center text-gray-500">
            Уже есть аккаунт? <Link to="/login" className="text-accent font-bold hover:underline">Войти</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
