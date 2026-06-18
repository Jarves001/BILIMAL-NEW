import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, where, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Users, GraduationCap, CheckCircle2, XCircle, Clock, BookOpen, UserCheck, ShieldAlert, RefreshCw, ChevronDown, Phone, MessageCircle, Shield as ShieldIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getSubjectLabel, SUBJECTS } from '../constants';
import api from '../api/client';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'applications' | 'admins'>('students');

  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      // Fetch Users (Teachers and Students)
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      const studentsList: any[] = [];
      const teachersList: any[] = [];
      const adminsList: any[] = [];
      
      for (const u of allUsers) {
        if (u.role === 'admin' || u.role === 'moderator' || u.role === 'curator') {
          adminsList.push(u);
        } else if (u.role === 'teacher') {
          teachersList.push(u);
        } else if (u.role === 'student' || !u.role) {
          studentsList.push({
            ...u,
            level: 1, 
            totalScore: 0
          });
        }
      }

      setStudents(studentsList);
      setTeachers(teachersList);
      setAdmins(adminsList);

      // Fetch Applications
      const appsSnap = await getDocs(collection(db, 'teacher_applications'));
      setApplications(appsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
    } catch (err: any) {
      console.error('Error fetching admin data:', err.response?.data || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const handleApprove = async (app: any) => {
    if (!app || !app.id || !app.user_id) {
      alert('Ошибка: Данные заявки неполные');
      return;
    }
    
    try {
      // 1. Update application status
      const appRef = doc(db, 'teacher_applications', app.id);
      await updateDoc(appRef, { status: 'approved' });
      
      // 2. Update user role and subject
      const userRef = doc(db, 'users', app.user_id);
      await updateDoc(userRef, { 
        role: 'teacher',
        subject: (app.subject || 'general').toLowerCase(),
        teacherStatus: 'active'
      });
      
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'approved' } : a));
      alert('Учитель успешно одобрен!');
      fetchData(); // re-fetch data
    } catch (err: any) {
      console.error('Error approving teacher:', err);
      alert('Ошибка при одобрении: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleReject = async (appId: string) => {
    try {
      await updateDoc(doc(db, 'teacher_applications', appId), { status: 'rejected' });
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: 'rejected' } : a));
    } catch (err: any) {
      console.error('Error rejecting teacher:', err);
      alert('Ошибка при отклонении: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateTeacherSubject = async (teacherId: string, newSubject: string) => {
    try {
      await updateDoc(doc(db, 'users', teacherId), { subject: newSubject });
      setTeachers(prev => prev.map(t => t.id === teacherId ? { ...t, subject: newSubject } : t));
      alert('Предмет успешно обновлен!');
    } catch (err: any) {
      console.error('Error updating subject:', err);
      alert('Ошибка при обновлении предмета: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!window.confirm("Вы уверены, что хотите изменить роль этого пользователя на " + newRole + "?")) return;
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      alert('Роль успешно обновлена!');
      fetchData(); // re-fetch to move user to correct list
    } catch (err: any) {
      console.error('Error updating role:', err);
      alert('Ошибка при обновлении роли: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleGrantSubscription = async (studentId: string, plan: string) => {
    try {
      const subRef = doc(db, 'users', studentId, 'subscription', 'current');
      const endDate = new Date();
      if (plan === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      await updateDoc(doc(db, 'users', studentId), { has_video_access: true });
      try {
        await updateDoc(subRef, {
          plan,
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          exams_left: plan === 'yearly' ? 50 : 5,
          has_video_access: true
        });
      } catch (e) {
        await setDoc(subRef, {
          plan,
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          exams_left: plan === 'yearly' ? 50 : 5,
          has_video_access: true
        });
      }
      alert(`Подписка "${plan}" успешно выдана!`);
      fetchData();
    } catch (err: any) {
      console.error('Error granting subscription:', err);
      alert('Ошибка при выдаче подписки: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <div className="p-20 text-center uppercase tracking-widest text-xs font-bold text-slate-400">Сбор данных системы...</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary uppercase tracking-tighter">Панель администратора</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Глобальное управление системой</p>
        </div>
        <button 
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-3 rounded-none text-xs font-bold uppercase tracking-widest text-primary hover:bg-slate-50 transition-all disabled:opacity-50"
        >
          <RefreshCw className={refreshing ? 'animate-spin' : ''} size={16} />
          {refreshing ? 'Обновление...' : 'Обновить данные'}
        </button>
      </div>

      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-primary p-6 rounded-none text-white">
          <div className="flex justify-between items-start mb-4">
            <Users className="text-accent" size={32} />
            <span className="text-[10px] bg-white/10 px-2 py-1 rounded-full uppercase font-bold tracking-widest">Live</span>
          </div>
          <h3 className="text-3xl font-black">{students.length}</h3>
          <p className="text-xs uppercase font-bold text-white/50 tracking-widest mt-1">Всего учеников</p>
        </div>
        <div className="bg-white p-6 rounded-none border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <GraduationCap className="text-primary" size={32} />
            <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-full uppercase font-bold tracking-widest">Active</span>
          </div>
          <h3 className="text-3xl font-black text-primary">{teachers.length}</h3>
          <p className="text-xs uppercase font-bold text-slate-400 tracking-widest mt-1">Преподавателей</p>
        </div>
        <div className="bg-accent p-6 rounded-none text-primary">
          <div className="flex justify-between items-start mb-4">
            <Clock className="text-primary" size={32} />
            <span className="text-[10px] bg-primary/10 px-2 py-1 rounded-full uppercase font-bold tracking-widest">Waitlist</span>
          </div>
          <h3 className="text-3xl font-black">{applications.filter(a => a.status === 'pending').length}</h3>
          <p className="text-xs uppercase font-bold text-primary/50 tracking-widest mt-1">Новых заявок</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto pb-px no-scrollbar">
        {[
          { id: 'students', label: 'Ученики', icon: Users },
          { id: 'teachers', label: 'Учителя', icon: GraduationCap },
          { id: 'admins', label: 'Персонал', icon: ShieldIcon },
          { id: 'applications', label: 'Заявки', icon: Clock }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all relative ${
              activeTab === tab.id ? 'text-primary' : 'text-slate-400'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-accent" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'students' && (
          <motion.div 
            key="students"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-none border border-slate-200 overflow-hidden shadow-sm"
          >
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-4">Студент</th>
                  <th className="px-6 py-4">Уровень</th>
                  <th className="px-6 py-4">Подписка</th>
                  <th className="px-6 py-4">Баллы</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/5 rounded-none flex items-center justify-center font-bold text-primary">
                          {s.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-primary">{s.name}</p>
                          <p className="text-[10px] text-slate-400">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-none bg-accent/20 flex items-center justify-center text-xs font-black text-primary">
                          {s.level}
                        </span>
                        <div className="flex-1 max-w-[100px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="bg-accent h-full" style={{ width: `${s.totalScore % 100}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        {s.subscription ? (
                          <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-green-100">
                            {s.subscription.plan === 'math' ? 'МАТЕМАТИКА' : s.subscription.plan === 'english' ? 'АНГЛИЙСКИЙ' : s.subscription.plan === 'yearly' ? 'ГОД' : s.subscription.plan === 'monthly' ? 'МЕСЯЦ' : s.subscription.plan}
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-100">
                            Нет
                          </span>
                        )}
                        <select 
                          onChange={(e) => handleGrantSubscription(s.id, e.target.value)}
                          className="bg-slate-100 border-none rounded-none text-[8px] font-black uppercase px-2 py-1 outline-none cursor-pointer"
                          value=""
                        >
                          <option value="" disabled>Выдать</option>
                          <option value="math">Математика (Месяц)</option>
                          <option value="english">Английский (Месяц)</option>
                          <option value="monthly">Все предметы (Месяц)</option>
                          <option value="yearly">Все предметы (Год)</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-primary">{s.totalScore} XP</span>
                        <select
                           onChange={(e) => handleUpdateRole(s.id, e.target.value)}
                           value={s.role || "student"}
                           className="bg-white border-2 border-slate-200 focus:border-primary text-xs font-bold text-slate-700 md:ml-4 px-3 py-1.5 outline-none cursor-pointer rounded-lg shadow-sm transition-all hover:border-slate-300"
                        >
                           <option value="student">Ученик</option>
                           <option value="teacher">Учитель</option>
                           <option value="moderator">Модератор</option>
                           <option value="curator">Куратор</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {activeTab === 'teachers' && (
          <motion.div 
            key="teachers"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {teachers.map(t => (
              <div key={t.id} className="bg-white p-6 rounded-none border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[100%] translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform" />
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-primary text-white rounded-none flex items-center justify-center font-bold text-xl mb-4">
                    {t.name?.charAt(0)}
                  </div>
                  <h3 className="font-black text-primary text-lg mb-1">{t.name}</h3>
                  <div className="mb-4">
                    <select 
                      value={t.subject || 'general'}
                      onChange={(e) => handleUpdateTeacherSubject(t.id, e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-none px-4 py-2 text-[10px] font-black uppercase tracking-widest text-accent outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <option value="general">Выберите предмет</option>
                      {SUBJECTS.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 mb-6">
                    <UserCheck size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Active Member</span>
                    <select
                           onChange={(e) => handleUpdateRole(t.id, e.target.value)}
                           value={t.role || "teacher"}
                           className="bg-white border-2 border-slate-200 focus:border-primary text-xs font-bold text-slate-700 ml-auto px-3 py-1.5 outline-none cursor-pointer rounded-lg shadow-sm transition-all hover:border-slate-300"
                        >
                           <option value="student">Ученик</option>
                           <option value="teacher">Учитель</option>
                           <option value="moderator">Модератор</option>
                           <option value="curator">Куратор</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Link 
                      to={`/profile?uid=${t.id}`}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 rounded-none text-[10px] font-black uppercase tracking-widest transition-all text-center flex items-center justify-center"
                    >
                      Профиль
                    </Link>
                    <button className="py-2 px-4 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-none transition-all">
                      <ShieldAlert size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'admins' && (
          <motion.div 
            key="admins"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {admins.map(a => (
              <div key={a.id} className="bg-white p-6 rounded-none border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-bl-[100%] translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform" />
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-accent text-primary rounded-none flex items-center justify-center font-bold text-xl mb-4">
                    {a.name?.charAt(0)}
                  </div>
                  <h3 className="font-black text-primary text-lg mb-1">{a.name}</h3>
                  <p className="text-[10px] text-slate-400 mb-4">{a.email}</p>
                  
                  <div className="flex items-center gap-2 text-slate-400 mb-6">
                    <ShieldIcon size={14} className="text-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{
                       a.role === 'admin' ? 'Administrator' : 
                       a.role === 'moderator' ? 'Moderator' : 'Curator'
                    }</span>
                    <select
                           onChange={(e) => handleUpdateRole(a.id, e.target.value)}
                           value={a.role}
                           disabled={a.role === 'admin'}
                           className={`bg-white border-2 border-slate-200 focus:border-primary text-xs font-bold px-3 py-1.5 mt-2 outline-none rounded-lg shadow-sm w-full transition-all hover:border-slate-300 ${a.role === 'admin' ? 'text-slate-400 cursor-not-allowed opacity-70' : 'cursor-pointer text-primary'}`}
                        >
                           {a.role === 'admin' ? (
                              <option value="admin">Админ (Нельзя изменить)</option>
                           ) : (
                             <>
                               <option value="student">Ученик</option>
                               <option value="teacher">Учитель</option>
                               <option value="moderator">Модератор</option>
                               <option value="curator">Куратор</option>
                             </>
                           )}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'applications' && (
          <motion.div 
            key="applications"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {applications.filter(a => a.status === 'pending').map(app => (
              <div key={app.id} className="bg-white p-6 rounded-none border border-slate-200 shadow-sm flex flex-col gap-6 relative overflow-hidden">
                {app.photo_file && (
                  <div className="absolute top-6 right-6 w-16 h-16 rounded-full overflow-hidden border-2 border-slate-100 hidden md:block">
                    <img src={app.photo_file} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                )}
                
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-black text-primary text-xl">{app.name}</h3>
                    <span className="px-2 py-0.5 bg-accent/20 text-primary text-[10px] font-bold uppercase tracking-widest rounded">
                      {app.subject}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        Опыт: <span className="text-primary">{app.experience} лет</span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        Тел: <span className="text-primary">{app.phone}</span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        Уровень: <span className="text-primary">{
                          app.education_level === 'bachelor' ? 'Бакалавр' :
                          app.education_level === 'master' ? 'Магистр' :
                          app.education_level === 'phd' ? 'PhD/Доктор' :
                          app.education_level === 'student' ? 'Студент' :
                          app.education_level || (app.education === 'yes' ? 'Высшее' : 'В процессе')
                        }</span>
                      </div>
                      {app.university && (
                         <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           ВУЗ: <span className="text-primary">{app.university}</span>
                         </div>
                      )}
                    </div>
                    {app.about && (
                      <div className="bg-slate-50 p-4 rounded-none text-xs text-slate-600 leading-relaxed italic border border-slate-100">
                        "{app.about}"
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
                  {app.resume_file && (
                    <a href={app.resume_file} download={`resume_${app.name}`} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-primary rounded-none text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
                      Резюме
                    </a>
                  )}
                  {app.diploma_file && (
                    <a href={app.diploma_file} download={`diploma_${app.name}`} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-primary rounded-none text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
                      Диплом
                    </a>
                  )}
                  
                  {app.phone && (
                    <div className="flex items-center gap-2 ml-4">
                      <a 
                        href={`https://wa.me/${app.phone.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-none text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 title-tooltip"
                        title="Написать в WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </a>
                      <a 
                        href={`tel:${app.phone.replace(/\D/g, '')}`} 
                        className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-none text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 title-tooltip"
                        title="Позвонить"
                      >
                        <Phone size={14} />
                      </a>
                    </div>
                  )}

                  <div className="flex gap-2 ml-auto w-full md:w-auto mt-4 md:mt-0">
                    <button 
                      onClick={() => handleReject(app.id)}
                      className="flex-1 md:flex-none p-3 rounded-none bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all group"
                    >
                      <XCircle size={18} className="group-hover:scale-110 transition-transform mx-auto" />
                    </button>
                    <button 
                      onClick={() => handleApprove(app)}
                      className="flex-[2] md:flex-none px-6 py-3 rounded-none bg-primary text-white hover:bg-primary/90 transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-[10px]"
                    >
                      <CheckCircle2 size={18} />
                      Принять
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {applications.filter(a => a.status === 'pending').length === 0 && (
              <div className="text-center py-20 bg-white rounded-none border border-dotted border-slate-300">
                <Clock className="mx-auto text-slate-200 mb-4" size={48} />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Нет новых заявок</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

