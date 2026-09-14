import React, { useMemo, useState } from 'react';
import { Check, ChevronRight, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TaskStatus } from '../../types';
import { PageHeader } from '../common/PageHeader';
import { EmptyState } from '../common/EmptyState';

type Filter = 'open' | 'done' | 'all';
const priorityColor = { urgent: 'bg-rose-500', high: 'bg-amber-400', medium: 'bg-blue-500', low: 'bg-slate-300' };

export const TasksView: React.FC = () => {
  const { tasks, projects, toggleTaskComplete, openTaskModal } = useApp();
  const [filter, setFilter] = useState<Filter>('open');
  const visible = useMemo(() => tasks.filter((task) => filter === 'all' || (filter === 'done' ? task.status === 'done' : task.status !== 'done')).sort((a,b) => (a.plannedDate || '9999').localeCompare(b.plannedDate || '9999') || (a.startTime || '99:99').localeCompare(b.startTime || '99:99')), [tasks, filter]);
  const projectName = (id?: string) => projects.find((project) => project.id === id)?.name;
  const statusLabel: Record<TaskStatus, string> = { todo: 'Chưa làm', in_progress: 'Đang làm', waiting: 'Đang chờ', done: 'Hoàn thành', deferred: 'Để sau' };

  return <div className="mx-auto max-w-2xl">
    <PageHeader title="Công việc" meta={`${tasks.filter((task) => task.status !== 'done').length} việc đang mở`} action={<button onClick={() => openTaskModal()} className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-white shadow-sm" aria-label="Thêm việc"><Plus className="h-5 w-5" /></button>} />
    <div className="mb-4 flex gap-1 rounded-xl bg-slate-200/70 p-1">{([['open','Đang làm'],['done','Đã xong'],['all','Tất cả']] as const).map(([id,label]) => <button key={id} onClick={() => setFilter(id)} className={`flex-1 rounded-lg py-2.5 text-xs font-semibold ${filter === id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>{label}</button>)}</div>
    {visible.length === 0 ? <EmptyState title="Không có công việc" action={<button onClick={() => openTaskModal()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Thêm việc đầu tiên</button>} /> : <div className="space-y-2">{visible.map((task) => <div key={task.id} className="flex min-h-[76px] items-center gap-3 rounded-2xl bg-white px-4 ring-1 ring-slate-200">
      <button onClick={() => toggleTaskComplete(task.id)} aria-label={task.status === 'done' ? 'Mở lại' : 'Hoàn thành'} className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${task.status === 'done' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>{task.status === 'done' && <Check className="h-4 w-4" />}</button>
      <button onClick={() => openTaskModal(task)} className="min-w-0 flex-1 py-3 text-left"><div className="flex items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${priorityColor[task.priority]}`} /><p className={`truncate font-semibold ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.title}</p></div><p className="mt-1 truncate text-xs text-slate-400">{[task.plannedDate, task.startTime, projectName(task.projectId) || statusLabel[task.status]].filter(Boolean).join(' · ')}</p></button>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
    </div>)}</div>}
  </div>;
};
