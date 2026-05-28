import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SUBJECTS } from '../constants';

export interface ScheduleItem {
  id: string;
  day: string;
  time: string;
  subject: string;
}

interface ScheduleEditorProps {
  groupId: string;
  initialSchedule: ScheduleItem[];
  fallbackText?: string;
}

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

export default function ScheduleEditor({ groupId, initialSchedule, fallbackText }: ScheduleEditorProps) {
  const [schedule, setSchedule] = useState<ScheduleItem[]>(initialSchedule || []);
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = () => {
    setSchedule([...schedule, { id: Date.now().toString(), day: 'Понедельник', time: '', subject: SUBJECTS[0].name }]);
  };

  const handleRemove = (id: string) => {
    setSchedule(schedule.filter(item => item.id !== id));
  };

  const handleChange = (id: string, field: keyof ScheduleItem, value: string) => {
    setSchedule(schedule.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'groups', groupId), { schedule_data: schedule });
      alert('Расписание успешно сохранено');
    } catch (err) {
      alert('Ошибка при сохранении расписания');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border-2 border-slate-100 rounded-xl overflow-hidden mt-4">
      <div className="bg-slate-50 p-3 border-b border-slate-100 flex justify-between items-center">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Академическое Расписание</h4>
        <button 
           onClick={handleAdd}
           className="flex items-center gap-1 text-[10px] font-black uppercase text-primary bg-white border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-50 transition-colors"
        >
          <Plus size={14} /> Добавить урок
        </button>
      </div>
      
      {(!schedule || schedule.length === 0) ? (
         <div className="p-6 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
           {fallbackText && !schedule?.length ? (
             <div className="mb-2 text-slate-500 bg-slate-50 p-2 inline-block rounded">
               Старое расписание: {fallbackText}
             </div>
           ) : null}
           Расписание не задано. Добавьте первый урок.
         </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                <th className="p-3 border-b border-slate-100 w-[30%]">День Недели</th>
                <th className="p-3 border-b border-slate-100 w-[20%]">Время</th>
                <th className="p-3 border-b border-slate-100 w-[40%]">Предмет</th>
                <th className="p-3 border-b border-slate-100 w-[10%] text-center">Действие</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map(item => (
                <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="p-2">
                    <select 
                      value={item.day} 
                      onChange={(e) => handleChange(item.id, 'day', e.target.value)}
                      className="w-full bg-white border-2 border-slate-100 p-2 text-xs outline-none rounded focus:border-primary text-slate-700 font-medium"
                    >
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <input 
                      type="time" 
                      value={item.time} 
                      onChange={(e) => handleChange(item.id, 'time', e.target.value)}
                      className="w-full bg-white border-2 border-slate-100 p-2 text-xs outline-none rounded focus:border-primary text-slate-700 font-medium"
                    />
                  </td>
                  <td className="p-2">
                    <select 
                      value={item.subject} 
                      onChange={(e) => handleChange(item.id, 'subject', e.target.value)}
                      className="w-full bg-white border-2 border-slate-100 p-2 text-xs outline-none rounded focus:border-primary text-slate-700 font-medium"
                    >
                      <option value="" disabled>Выберите предмет</option>
                      {SUBJECTS.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 text-center">
                    <button 
                      onClick={() => handleRemove(item.id)}
                      className="text-red-400 hover:text-red-600 p-2 rounded hover:bg-red-50 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-primary text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Сохранение...' : 'Сохранить расписание'}
        </button>
      </div>
    </div>
  );
}
