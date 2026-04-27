import { useState, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Send } from 'lucide-react';
import { motion } from 'motion/react';

export default function TeacherApplication() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    education: '',
    experience: '',
    phone: '',
    subject: 'math',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      await addDoc(collection(db, 'teacher_applications'), {
        user_id: user.id,
        name: formData.name,
        education: formData.education,
        experience: formData.experience,
        phone: formData.phone,
        subject: formData.subject,
        status: 'pending',
        applied_at: new Date().toISOString()
      });
      setIsSubmitted(true);
    } catch (err) {
      console.error('Error submitting application:', err);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-3xl shadow-xl text-center max-w-md w-full"
        >
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-primary mb-2">Заявка отправлена!</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Ваша анкета успешно получена. Администратор рассмотрит ее в течение 48 часов. Мы свяжемся с вами по указанному номеру.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-primary/90 transition-all shadow-lg"
          >
            Вернуться на главную
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-primary mb-2 uppercase tracking-tighter">Анкета преподавателя</h1>
          <p className="text-slate-500 font-medium">Станьте частью команды BILIMAL и помогайте ученикам поступать в НИШ и БИЛ</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">ФИО</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-accent outline-none font-medium"
                placeholder="Иван Иванов"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Высшее образование</label>
              <select 
                required
                value={formData.education}
                onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-accent outline-none font-medium appearance-none"
              >
                <option value="">Выберите вариант</option>
                <option value="yes">Есть (профильное)</option>
                <option value="in_progress">В процессе обучения</option>
                <option value="no">Нет</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Опыт работы (лет)</label>
              <input 
                type="text" 
                required
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-accent outline-none font-medium"
                placeholder="Например: 5 лет"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Номер телефона</label>
              <input 
                type="tel" 
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-accent outline-none font-medium"
                placeholder="+7 (___) ___-__-__"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Направление (предмет)</label>
              <select 
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-accent outline-none font-medium appearance-none"
              >
                <option value="math">Математика</option>
                <option value="logic">Логика & IQ</option>
                <option value="languages">Языки</option>
                <option value="reading">Анализ текста</option>
              </select>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-accent/5 rounded-2xl border border-accent/10">
            <input type="checkbox" required className="mt-1 accent-accent" id="teacher-checkbox" />
            <label htmlFor="teacher-checkbox" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
              Я подтверждаю свое желание работать учителем и обязуюсь предоставлять качественный контент согласно академическим стандартам BILIMAL.
            </label>
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group shadow-xl"
          >
            <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            Отправить анкету
          </button>
        </form>
      </div>
    </div>
  );
}
