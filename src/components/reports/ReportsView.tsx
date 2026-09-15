import React from 'react';
import { CheckCircle2, Clock, Flame, Layers } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../common/PageHeader';
import { EmptyState } from '../common/EmptyState';

export const ReportsView: React.FC = () => {
  const { tasks, projects, habits } = useApp();

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((task) => task.status === 'done').length;
  const completionRate = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const focusHours = (tasks.reduce((sum, task) => sum + (task.actualMinutes || 0), 0) / 60).toFixed(1);
  const bestStreak = habits.length ? Math.max(0, ...habits.map((habit) => habit.streak || 0)) : 0;

  const stats = [
    {
      label: 'Tỷ lệ hoàn thành',
      value: `${completionRate}%`,
      subtext: `${doneTasks}/${totalTasks} công việc`,
      icon: CheckCircle2,
      badgeColor: 'text-emerald-700 bg-emerald-50 border border-emerald-200/60',
    },
    {
      label: 'Tổng giờ tập trung',
      value: `${focusHours}h`,
      subtext: 'Tính trên các việc đã làm',
      icon: Clock,
      badgeColor: 'text-indigo-700 bg-indigo-50 border border-indigo-200/60',
    },
    {
      label: 'Chuỗi thói quen',
      value: `${bestStreak} ngày`,
      subtext: 'Kỷ lục streak hiện tại',
      icon: Flame,
      badgeColor: 'text-amber-700 bg-amber-50 border border-amber-200/60',
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Báo cáo & Hiệu suất" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map(({ label, value, subtext, icon: Icon, badgeColor }) => (
          <div
            key={label}
            className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs transition hover:border-slate-300/80 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">{label}</span>
              <span className={`grid h-8 w-8 place-items-center rounded-2xl ${badgeColor}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-400">{subtext}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Layers className="h-4 w-4 text-slate-400" /> Tiến độ theo dự án
          </h2>
          <span className="text-xs font-medium text-slate-400">{projects.length} dự án</span>
        </div>

        {projects.length > 0 ? (
          <div className="space-y-2.5">
            {projects.map((project) => {
              const relatedTasks = tasks.filter((task) => task.projectId === project.id);
              const projectDone = relatedTasks.filter((task) => task.status === 'done').length;
              const projectRate = relatedTasks.length
                ? Math.round((projectDone / relatedTasks.length) * 100)
                : 0;

              return (
                <div
                  key={project.id}
                  className="rounded-3xl border border-slate-200/70 bg-white p-4.5 shadow-xs transition hover:border-slate-300/80 hover:shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: project.color || '#6366f1' }}
                      />
                      <p className="truncate text-sm font-bold text-slate-900">{project.name}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs font-medium text-slate-400">
                        {projectDone}/{relatedTasks.length} việc
                      </span>
                      <span className="text-xs font-bold tabular-nums text-slate-700">{projectRate}%</span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${projectRate}%`, backgroundColor: project.color || '#6366f1' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Chưa có dữ liệu để báo cáo"
            description="Hãy tạo dự án và giao nhiệm vụ để bắt đầu theo dõi tiến độ chi tiết."
          />
        )}
      </div>
    </div>
  );
};
