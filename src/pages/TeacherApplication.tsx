import { useState, FormEvent, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Send, Upload, FileSignature, Image as ImageIcon, Briefcase, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function TeacherApplication() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    education_level: '',
    university: '',
    experience: '',
    phone: '',
    subject: 'math',
    about: '',
    resume_file: '',
    diploma_file: '',
    photo_file: ''
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof formData) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 250 * 1024) {
      alert('Файл слишком большой. Максимальный размер 250 КБ.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, [field]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'teacher_applications'), {
        ...formData,
        user_id: user.id,
        status: 'pending',
        applied_at: new Date().toISOString()
      });
      setIsSubmitted(true);
    } catch (err) {
      console.error('Error submitting application:', err);
      alert('Ошибка при отправке анкеты');
    } finally {
      setLoading(false);
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
            Ваша расширенная анкета успешно получена. Администратор рассмотрит ее. Мы свяжемся с вами по указанному номеру.
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
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-black text-primary mb-2 uppercase tracking-tighter">Расширенная анкета преподавателя</h1>
            <p className="text-slate-500 font-medium">Пожалуйста, заполните форму максимально подробно, чтобы мы могли оценить ваши компетенции.</p>
          </motion.div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg p-6 md:p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column: text inputs */}
            <div className="space-y-5">
              <h3 className="font-black text-primary border-b pb-2 mb-4">Личные данные</h3>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">ФИО *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-accent outline-none font-medium text-primary"
                  placeholder="Иван Иванов"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Номер телефона *</label>
                <input 
                  type="tel" 
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-accent outline-none font-medium text-primary"
                  placeholder="+7 (___) ___-__-__"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Уровень образования *</label>
                <select 
                  required
                  value={formData.education_level}
                  onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
                  className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-accent outline-none font-medium text-primary appearance-none"
                >
                  <option value="">Выберите уровень</option>
                  <option value="bachelor">Бакалавр</option>
                  <option value="master">Магистр</option>
                  <option value="phd">PhD / Доктор наук</option>
                  <option value="student">Студент вуза</option>
                  <option value="other">Другое</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">ВУЗ / Учебное заведение *</label>
                <input 
                  type="text" 
                  required
                  value={formData.university}
                  onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                  className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-accent outline-none font-medium text-primary"
                  placeholder="Например: Назарбаев Университет"
                />
              </div>
            </div>

            {/* Right Column: details and files */}
            <div className="space-y-5">
              <h3 className="font-black text-primary border-b pb-2 mb-4">Профессиональный профиль</h3>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Направление (предмет) *</label>
                <select 
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-accent outline-none font-medium text-primary appearance-none"
                >
                  <option value="math">Математика</option>
                  <option value="logic">Логика & IQ</option>
                  <option value="kazakh">Казахский язык</option>
                  <option value="russian">Русский язык</option>
                  <option value="english">Английский язык</option>
                  <option value="reading">Анализ текста</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Опыт работы (лет) *</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-accent outline-none font-medium text-primary"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Обо мне / Достижения</label>
                <textarea 
                  rows={4}
                  value={formData.about}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-accent outline-none font-medium text-primary resize-none"
                  placeholder="Расскажите о своих успехах, методике преподавания, опыте подготовки к экзаменам НИШ/БИЛ..."
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <h3 className="font-black text-primary mb-4">Документы (по желанию, макс. 250КБ каждый)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="relative group cursor-pointer bg-slate-50 rounded-xl p-4 border-2 border-dashed border-slate-200 hover:border-accent hover:bg-white transition-all text-center">
                <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'resume_file')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <Briefcase className={`mx-auto mb-2 ${formData.resume_file ? 'text-accent' : 'text-slate-400 group-hover:text-accent'} transition-colors`} />
                <span className="text-xs font-bold block text-slate-700">Резюме / CV</span>
                {formData.resume_file && <span className="text-[10px] text-green-600 font-bold mt-1 block">Загружено ✓</span>}
              </div>

              <div className="relative group cursor-pointer bg-slate-50 rounded-xl p-4 border-2 border-dashed border-slate-200 hover:border-accent hover:bg-white transition-all text-center">
                <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'diploma_file')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <GraduationCap className={`mx-auto mb-2 ${formData.diploma_file ? 'text-accent' : 'text-slate-400 group-hover:text-accent'} transition-colors`} />
                <span className="text-xs font-bold block text-slate-700">Диплом / Сертификаты</span>
                {formData.diploma_file && <span className="text-[10px] text-green-600 font-bold mt-1 block">Загружено ✓</span>}
              </div>

              <div className="relative group cursor-pointer bg-slate-50 rounded-xl p-4 border-2 border-dashed border-slate-200 hover:border-accent hover:bg-white transition-all text-center">
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo_file')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <ImageIcon className={`mx-auto mb-2 ${formData.photo_file ? 'text-accent' : 'text-slate-400 group-hover:text-accent'} transition-colors`} />
                <span className="text-xs font-bold block text-slate-700">Личное фото</span>
                {formData.photo_file && <span className="text-[10px] text-green-600 font-bold mt-1 block">Загружено ✓</span>}
              </div>

            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-accent/5 rounded-2xl border border-accent/10">
            <input type="checkbox" required className="mt-1 accent-accent" id="teacher-checkbox" />
            <label htmlFor="teacher-checkbox" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
              Я подтверждаю достоверность всех предоставленных данных и выражаю готовность пройти собеседование.
            </label>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 group shadow-xl"
          >
            {loading ? (
              <span className="animate-pulse">Отправка...</span>
            ) : (
              <>
                <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                Отправить анкету
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
