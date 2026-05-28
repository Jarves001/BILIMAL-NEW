import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';
import { User as UserIcon, X, Check, XCircle, Clock, Calendar as CalendarIcon, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: any;
}

export default function AttendanceModal({ isOpen, onClose, group }: AttendanceModalProps) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && group) {
      fetchData();
    }
  }, [isOpen, group, date]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch group students
      if (group.students && group.students.length > 0) {
        // Students are stored as IDs or full objects? Let's check 
        // In CuratorDashboard: `group.students?.length`
        // Assume group.students is array of userIds
        const studentDocs = await Promise.all(
          group.students.map(async (id: string) => {
            const d = await getDoc(doc(db, 'users', id));
            if (d.exists()) {
              return { id: d.id, ...d.data() };
            }
            return null;
          })
        );
        const validStudents = studentDocs.filter(Boolean) as any[];
        setStudents(validStudents);

        // 2. Fetch existing attendance for this date
        const attendanceId = `${group.id}_${date}`;
        const attDoc = await getDoc(doc(db, 'attendance', attendanceId));
        if (attDoc.exists()) {
          setRecords(attDoc.data().records || {});
        } else {
          // Initialize empty
          const initialRecords: Record<string, any> = {};
          validStudents.forEach(s => {
            initialRecords[s.id] = 'present'; // Default
          });
          setRecords(initialRecords);
        }
      } else {
        setStudents([]);
        setRecords({});
      }
    } catch (err) {
      console.error('Failed to fetch attendance data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!group) return;
    setSaving(true);
    try {
      const attendanceId = `${group.id}_${date}`;
      await setDoc(doc(db, 'attendance', attendanceId), {
        group_id: group.id,
        date: date,
        records: records,
        updatedAt: new Date()
      }, { merge: true });
      onClose();
    } catch (err) {
      console.error('Failed to save attendance', err);
    } finally {
      setSaving(false);
    }
  };

  const getPercentage = () => {
    const total = students.length;
    if (total === 0) return 0;
    const present = Object.values(records).filter(r => r === 'present' || r === 'late').length;
    return Math.round((present / total) * 100);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h2 className="text-xl font-black text-primary uppercase tracking-tight flex items-center gap-2">
                <CalendarIcon size={20} className="text-accent" />
                Журнал посещаемости
              </h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                Группа: <span className="text-primary">{group.name}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Controls */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Дата занятия:
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border-2 border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-primary focus:border-accent outline-none"
              />
            </div>
            {!loading && students.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Явка:</div>
                <div className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 font-black text-sm border border-emerald-100">
                  {getPercentage()}%
                </div>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-xs font-bold uppercase tracking-widest">Загрузка списка...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserIcon size={24} className="text-slate-300" />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest">Нет студентов в группе</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {students.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors rounded-xl mx-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                        {student.avatar_url ? (
                          <img src={student.avatar_url} alt={student.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <UserIcon size={18} />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm max-w-[150px] md:max-w-[200px] truncate">{student.name || 'Анонимный студент'}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{student.email || student.id.slice(0,8)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <button
                        onClick={() => setRecords({ ...records, [student.id]: 'present' })}
                        className={`flex flex-col md:flex-row items-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all ${
                          records[student.id] === 'present'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                        }`}
                        title="Присутствует"
                      >
                        <Check size={16} /> <span className="text-[10px] font-bold uppercase tracking-wider hidden md:block">Присутствует</span>
                      </button>
                      <button
                        onClick={() => setRecords({ ...records, [student.id]: 'late' })}
                        className={`flex flex-col md:flex-row items-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all ${
                          records[student.id] === 'late'
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                        }`}
                        title="Опоздал"
                      >
                        <Clock size={16} /> <span className="text-[10px] font-bold uppercase tracking-wider hidden md:block">Опоздал</span>
                      </button>
                      <button
                        onClick={() => setRecords({ ...records, [student.id]: 'absent' })}
                        className={`flex flex-col md:flex-row items-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all ${
                          records[student.id] === 'absent'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                        }`}
                        title="Отсутствует"
                      >
                        <XCircle size={16} /> <span className="text-[10px] font-bold uppercase tracking-wider hidden md:block">Отсутствует</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={loading || students.length === 0 || saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 active:scale-95"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Сохранить
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
