import React, { useState } from 'react';
import { Bell, ChevronRight, Flame, Settings, Sparkles, Target } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../common/PageHeader';
import { EmptyState } from '../common/EmptyState';

type Mode = 'goals' | 'habits' | 'life';

export const PersonalView: React.FC = () => {
  const { goals, habits, lifeMetrics, toggleHabitForDate, setIsAssistantOpen } = useApp();
  const [mode, setMode] = useState<Mode>('goals');
  const today = new Date().toISOString().slice(0, 10);
  return <div className="mx-auto max-w-2xl">
    <PageHeader title="Cá nhân" action={<button onClick={() => window.dispatchEvent(new Event('lich-song-open-settings'))} aria-label="Cài đặt" className="rounded-full bg-white p-2.5 text-slate-500 shadow-sm ring-1 ring-slate-200"><Settings className="h-4 w-4" /></button>} />
    <div className="mb-5 grid grid-cols-3 rounded-xl bg-slate-200/70 p-1 text-xs font-semibold">{([['goals','Mục tiêu'],['habits','Thói quen'],['life','Cuộc sống']] as const).map(([id,label]) => <button key={id} onClick={() => setMode(id)} className={`rounded-lg py-2.5 ${mode === id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>{label}</button>)}</div>
    <div className="space-y-2">
      {mode === 'goals' && (goals.length ? goals.map((goal) => <div key={goal.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"><div className="flex items-center gap-3"><Target className="h-5 w-5 text-blue-600" /><p className="min-w-0 flex-1 truncate font-semibold">{goal.title}</p><b className="text-sm text-blue-600">{goal.progress}%</b></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{width: `${goal.progress}%`}} /></div></div>) : <EmptyState title="Chưa có mục tiêu" />)}
      {mode === 'habits' && (habits.length ? habits.map((habit) => { const done = habit.completedDates.includes(today); return <button key={habit.id} onClick={() => toggleHabitForDate(habit.id, today)} className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200"><span className={`grid h-9 w-9 place-items-center rounded-xl ${done ? 'bg-emerald-500 text-white' : 'bg-orange-50 text-orange-500'}`}><Flame className="h-5 w-5" /></span><span className="min-w-0 flex-1 truncate font-semibold">{habit.name}</span><span className="text-xs font-semibold text-slate-400">{done ? 'Xong' : `${habit.streak} ngày`}</span></button>; }) : <EmptyState title="Chưa có thói quen" />)}
      {mode === 'life' && (lifeMetrics.length ? lifeMetrics.map((metric) => <div key={metric.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200"><span className={`h-2.5 w-2.5 rounded-full ${metric.status === 'good' ? 'bg-emerald-500' : metric.status === 'attention' ? 'bg-rose-500' : 'bg-amber-400'}`} /><span className="min-w-0 flex-1 truncate font-semibold">{metric.labelVi}</span><b className="text-sm">{metric.score}/10</b></div>) : <EmptyState title="Chưa có dữ liệu" />)}
    </div>
    <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <button onClick={() => setIsAssistantOpen(true)} className="flex w-full items-center gap-3 px-4 py-4 text-left"><Sparkles className="h-5 w-5 text-violet-500" /><span className="flex-1 font-semibold">Trợ lý</span><ChevronRight className="h-4 w-4 text-slate-300" /></button>
      <button onClick={() => window.dispatchEvent(new Event('lich-song-open-settings'))} className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-4 text-left"><Bell className="h-5 w-5 text-blue-500" /><span className="flex-1 font-semibold">Thông báo & cài đặt</span><ChevronRight className="h-4 w-4 text-slate-300" /></button>
    </div>
  </div>;
};
