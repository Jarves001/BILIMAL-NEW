import { ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import MobileNav from './components/MobileNav';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import IntroQuiz from './pages/IntroQuiz';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import CourseView from './pages/CourseView';
import TestView from './pages/TestView';
import AdminDashboard from './pages/AdminDashboard';
import AppLayout from './layouts/AppLayout';
import Logo from './components/Logo';
import TeacherApplication from './pages/TeacherApplication';
import TeacherDashboard from './pages/TeacherDashboard';

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
  const isAuthPage = ['/login', '/register', '/quiz'].includes(location.pathname);
  const isHomePage = location.pathname === '/';

  return (
    <>
      {(isHomePage || isAuthPage) && <Navbar />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/quiz" element={<IntroQuiz />} />
          <Route path="/teacher-application" element={<TeacherApplication />} />
          
          <Route path="/dashboard" element={<PrivateRoute title="Студенческий портал"><Dashboard /></PrivateRoute>} />
          <Route path="/teacher" element={<PrivateRoute title="Панель учителя"><TeacherDashboard /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute title="Личный кабинет"><Profile /></PrivateRoute>} />
          <Route path="/subscriptions" element={<PrivateRoute title="Тарифные планы"><Subscriptions /></PrivateRoute>} />
          <Route path="/courses/:id" element={<PrivateRoute title="Просмотр курса"><CourseView /></PrivateRoute>} />
          <Route path="/lessons/:lessonId/test" element={<PrivateRoute title="Студенческий портал"><TestView /></PrivateRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        </Routes>
      </main>
      {(isHomePage || isAuthPage) && (
        <footer className="bg-primary text-gray-400 py-16 border-t border-gray-800 mb-20 md:mb-0">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex justify-center mb-6">
              <Logo light className="h-12" />
            </div>
            <p className="text-sm max-w-md mx-auto text-gray-400 leading-relaxed">
              BILIMAL — ведущая образовательная платформа для фундаментальной подготовки к поступлению в НИШ и БИЛ.
            </p>
            <div className="h-px w-16 bg-accent/30 mx-auto my-8" />
            <Link to="/teacher-application" className="mb-8 inline-block px-6 py-2 border border-accent/30 text-accent rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-accent hover:text-primary transition-all">
              Вакансии для учителей
            </Link>
            <p className="text-xs">© 2026 BILIMAL. Все права защищены.</p>
            <p className="text-[10px] mt-4 uppercase tracking-[0.3em] text-gray-600 font-bold">Strict Academic Excellence</p>
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
        <MobileNav />
      </div>
    </AuthProvider>
  );
}
