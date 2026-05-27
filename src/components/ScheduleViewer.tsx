import React from 'react';
import { Calendar } from 'lucide-react';
import { ScheduleItem } from './ScheduleEditor';

interface ScheduleViewerProps {
  scheduleData?: ScheduleItem[];
  fallbackText?: string;
  groupName?: string;
}

const DAYS_ORDER = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

export default function ScheduleViewer({ scheduleData, fallbackText, groupName }: ScheduleViewerProps) {
  if (!scheduleData || scheduleData.length === 0) {
    if (fallbackText) {
      return (
        <div className="mt-4 p-4 bg-blue-50/50 border-2 border-blue-100 rounded-xl">
           <p className="text-[10px] uppercase text-blue-500 font-bold tracking-widest mb-2">Общее расписание</p>
           <p className="text-sm font-medium text-blue-900">{fallbackText}</p>
        </div>
      );
    }
    return (
      <div className="mt-4 p-4 text-center border-2 border-dashed border-slate-200 rounded-xl">
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Расписание еще не составлено</p>
      </div>
    );
  }

  // Group by day
  const grouped = scheduleData.reduce((acc, item) => {
    if (!acc[item.day]) acc[item.day] = [];
    acc[item.day].push(item);
    return acc;
  }, {} as Record<string, ScheduleItem[]>);

  // Sort according to DAYS_ORDER
  const sortedDays = Object.keys(grouped).sort((a, b) => DAYS_ORDER.indexOf(a) - DAYS_ORDER.indexOf(b));

  // Sort times within days
  sortedDays.forEach(day => {
    grouped[day].sort((a, b) => a.time.localeCompare(b.time));
  });

  return (
    <div className="mt-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2">
        <Calendar size={16} className="text-primary" />
        <h4 className="text-xs font-bold text-primary uppercase tracking-widest">
          Академическое Расписание {groupName ? `(${groupName})` : ''}
        </h4>
      </div>
      <div className="divide-y divide-slate-100">
        {sortedDays.map(day => (
          <div key={day} className="flex flex-col sm:flex-row hover:bg-slate-50/50 transition-colors">
             <div className="sm:w-1/3 p-4 bg-slate-50/30 sm:border-r border-slate-100">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{day}</span>
             </div>
             <div className="sm:w-2/3 p-0 flex flex-col divide-y divide-slate-50">
                {grouped[day].map(item => (
                   <div key={item.id} className="p-4 flex justify-between items-center group">
                      <span className="font-bold text-primary text-sm">{item.subject || 'Без названия'}</span>
                      <span className="text-xs font-black bg-blue-50 text-blue-600 px-2 py-1 rounded inline-block">
                        {item.time || '--:--'}
                      </span>
                   </div>
                ))}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
