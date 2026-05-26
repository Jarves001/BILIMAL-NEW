import { useState, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Send, Briefcase } from 'lucide-react';
import { motion } from 'motion/react';

export default function CuratorApplication() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: '',
    about: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'teacher_applications'), { // using same collection for simplicity, just marking role
        ...formData,
        role_type: 'curator',
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
          className="bg-white p-12 rounded-none shadow-xl text-center max-w-md w-full"
        >
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-primary mb-2">Заявка отправлена!</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Ваша анкета на куратора получена. Модератор рассмотрит ее и свяжется с вами.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 bg-primary text-white rounded-none font-bold uppercase tracking-widest text-sm hover:bg-primary/90"
          >
            На главную
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-xl mx-auto bg-white p-8 border">
         <h1 className="text-2xl font-black uppercase text-primary mb-2 text-center">Анкета Куратора</h1>
         <p className="text-xs text-slate-500 uppercase tracking-widest text-center border-b pb-6 mb-6">Заполните поля ниже</p>
         
         <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">ФИО</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full border-b-2 border-slate-200 py-2 focus:border-primary outline-none" 
              />
            </div>
            
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Телефон</label>
              <input 
                required
                type="tel" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full border-b-2 border-slate-200 py-2 focus:border-primary outline-none" 
              />
            </div>
            
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">О себе (Почему хотите стать куратором?)</label>
              <textarea 
                required
                rows={4}
                value={formData.about}
                onChange={e => setFormData({...formData, about: e.target.value})}
                className="w-full border-b-2 border-slate-200 py-2 focus:border-primary outline-none resize-none" 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest text-xs hover:bg-primary/90 flex justify-center items-center gap-2"
            >
              {loading ? 'Отправка...' : <><Send size={16}/> Отправить Анкету</>}
            </button>
         </form>
      </div>
    </div>
  );
}
