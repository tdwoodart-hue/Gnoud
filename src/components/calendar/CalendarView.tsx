import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../common/PageHeader';
import { EmptyState } from '../common/EmptyState';

const iso = (date: Date) => date.toISOString().slice(0, 10);
const dateLabel = (date: Date) => new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);

export const CalendarView: React.FC = () => {
  const { calendarEvents, tasks, openTaskModal } = useApp();
  const [date, setDate] = useState(() => new Date());
  const key = iso(date);
  const items = useMemo(() => [
    ...calendarEvents.filter((event) => event.date === key).map((event) => ({ id: `e-${event.id}`, title: event.title, time: event.startTime, end: event.endTime, color: event.color || '#2563eb' })),
    ...tasks.filter((task) => task.plannedDate === key && task.status !== 'done' && !calendarEvents.some((event) => event.taskId === task.id)).map((task) => ({ id: `t-${task.id}`, title: task.title, time: task.startTime || '--:--', end: '', color: task.priority === 'urgent' ? '#f43f5e' : '#2563eb' })),
  ].sort((a,b) => a.time.localeCompare(b.time)), [calendarEvents, tasks, key]);
  const move = (days: number) => setDate((current) => { const next = new Date(current); next.setDate(next.getDate() + days); return next; });
  return <div className="mx-auto max-w-2xl">
    <PageHeader title="Lịch" action={<button onClick={() => openTaskModal()} className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-white" aria-label="Thêm"><Plus className="h-5 w-5" /></button>} />
    <div className="mb-5 flex items-center justify-between rounded-2xl bg-white p-2 ring-1 ring-slate-200"><button onClick={() => move(-1)} className="p-2 text-slate-400"><ChevronLeft /></button><button onClick={() => setDate(new Date())} className="text-center"><p className="text-sm font-bold capitalize">{dateLabel(date)}</p>{key !== iso(new Date()) && <span className="text-[11px] font-semibold text-blue-600">Về hôm nay</span>}</button><button onClick={() => move(1)} className="p-2 text-slate-400"><ChevronRight /></button></div>
    {items.length === 0 ? <EmptyState title="Ngày này đang trống" action={<button onClick={() => openTaskModal()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Thêm việc</button>} /> : <div className="space-y-2">{items.map((item) => <div key={item.id} className="flex min-h-[70px] items-center gap-4 rounded-2xl bg-white px-4 ring-1 ring-slate-200"><div className="w-11 text-sm font-bold text-slate-700">{item.time}</div><span className="h-9 w-1 rounded-full" style={{backgroundColor: item.color}} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{item.title}</p>{item.end && <p className="mt-1 text-xs text-slate-400">đến {item.end}</p>}</div></div>)}</div>}
  </div>;
};
