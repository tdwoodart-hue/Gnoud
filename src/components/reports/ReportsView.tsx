import React from 'react';
import { CheckCircle2, Clock, Flame } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../common/PageHeader';
import { EmptyState } from '../common/EmptyState';

export const ReportsView: React.FC = () => {
  const { tasks, projects, habits } = useApp();
  const done = tasks.filter((task) => task.status === 'done').length;
  const rate = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const hours = (tasks.reduce((sum, task) => sum + task.actualMinutes, 0) / 60).toFixed(1);
  const streak = Math.max(0, ...habits.map((habit) => habit.streak));
  const stats = [{ label: 'Hoàn thành', value: `${rate}%`, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' }, { label: 'Tập trung', value: `${hours}h`, icon: Clock, color: 'text-blue-600 bg-blue-50' }, { label: 'Chuỗi tốt nhất', value: `${streak}`, icon: Flame, color: 'text-orange-500 bg-orange-50' }];
  return <div className="mx-auto max-w-2xl"><PageHeader title="Báo cáo" />
    <div className="grid grid-cols-3 gap-2">{stats.map(({label,value,icon:Icon,color}) => <div key={label} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"><span className={`mb-5 grid h-8 w-8 place-items-center rounded-xl ${color}`}><Icon className="h-4 w-4" /></span><b className="block text-xl">{value}</b><span className="text-[11px] font-medium text-slate-400">{label}</span></div>)}</div>
    <h2 className="mb-3 mt-7 text-sm font-bold">Theo dự án</h2>
    {projects.length ? <div className="space-y-2">{projects.map((project) => { const related = tasks.filter((task) => task.projectId === project.id); const projectDone = related.filter((task) => task.status === 'done').length; const projectRate = related.length ? Math.round(projectDone / related.length * 100) : 0; return <div key={project.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"><div className="mb-3 flex justify-between gap-3"><p className="truncate font-semibold">{project.name}</p><b className="text-sm text-slate-500">{projectRate}%</b></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{width:`${projectRate}%`,backgroundColor:project.color}} /></div></div>; })}</div> : <EmptyState title="Chưa có dữ liệu để báo cáo" />}
  </div>;
};
