import { ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CourseView from './pages/CourseView';
import TestView from './pages/TestView';
import AdminDashboard from './pages/AdminDashboard';
import AppLayout from './layouts/AppLayout';

import Subscriptions from './pages/Subscriptions';

function PrivateRoute({ children, title }: { children: ReactNode; title?: string }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="p-20 text-center uppercase tracking-widest text-xs font-bold text-slate-400">Инициализация системы...</div>;
  if (!user) return <Navigate to="/login" />;
  return <AppLayout title={title}>{children}</AppLayout>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="p-20 text-center uppercase tracking-widest text-xs font-bold text-slate-400">Аутентификация...</div>;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" />;
  return <AppLayout title="Админ-панель">{children}</AppLayout>;
}

function MainRoutes() {
  const location = useLocation();
  const isAuthPage = ['/login'].includes(location.pathname);
  const isHomePage = location.pathname === '/';

  return (
    <>
      {(isHomePage || isAuthPage) && <Navbar />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={<PrivateRoute title="Дашборд"><Dashboard /></PrivateRoute>} />
          <Route path="/subscriptions" element={<PrivateRoute title="Тарифные планы"><Subscriptions /></PrivateRoute>} />
          <Route path="/courses/:id" element={<PrivateRoute title="Просмотр курса"><CourseView /></PrivateRoute>} />
          <Route path="/lessons/:lessonId/test" element={<PrivateRoute title="Академическое тестирование"><TestView /></PrivateRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        </Routes>
      </main>
      {(isHomePage || isAuthPage) && (
        <footer className="bg-primary text-gray-400 py-12 border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="text-white font-bold text-xl mb-4 tracking-tighter italic">BILIMAL</div>
            <p className="text-sm">© 2026 BILIMAL. Платформа для академической подготовки к НИШ и БИЛ.</p>
            <p className="text-xs mt-2 uppercase tracking-widest text-gray-600">Strict Academic Excellence</p>
          </div>
        </footer>
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col font-sans">
        <MainRoutes />
      </div>
    </AuthProvider>
  );
}
