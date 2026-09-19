import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Flame,
  Footprints,
  Layers,
  Scale,
  Target,
  UtensilsCrossed,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { loadNutritionState, type NutritionState } from '../../services/nutritionService';
import {
  buildDailyTaskActivity,
  buildHabitReport,
  buildNutritionReport,
  buildProjectReport,
  buildReportSummary,
  formatLocalDate,
  type ReportRange,
} from '../../services/reportService';
import { EmptyState } from '../common/EmptyState';
import { PageHeader } from '../common/PageHeader';

const whole = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

const rangeLabels: Record<ReportRange, string> = {
  '7d': '7 ngày',
  '30d': '30 ngày',
  all: 'Toàn bộ',
};

const weekday = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(new Date(year, month - 1, day));
};

const shortDate = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(year, month - 1, day));
};

const clamp = (value: number) => Math.min(100, Math.max(0, value));

const ProgressBar: React.FC<{ value: number; className?: string }> = ({ value, className = 'bg-indigo-500' }) => (
  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
    <div className={`h-full rounded-full transition-all duration-500 ${className}`} style={{ width: `${clamp(value)}%` }} />
  </div>
);

const StatCard: React.FC<{
  label: string;
  value: string;
  meta: string;
  icon: React.FC<{ className?: string }>;
  tone: string;
}> = ({ label, value, meta, icon: Icon, tone }) => (
  <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs">
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-semibold text-slate-400">{label}</span>
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl border ${tone}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
    </div>
    <p className="mt-2 text-[22px] font-bold tracking-tight tabular-nums text-slate-900">{value}</p>
    <p className="mt-0.5 text-[10px] font-medium text-slate-400">{meta}</p>
  </div>
);

const ReportSection: React.FC<{
  title: string;
  icon: React.FC<{ className?: string }>;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon: Icon, trailing, children }) => (
  <section className="space-y-2.5">
    <div className="flex min-h-7 items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <Icon className="h-4 w-4 text-slate-400" /> {title}
      </h2>
      {trailing}
    </div>
    {children}
  </section>
);

const NutritionCell: React.FC<{
  label: string;
  value: string;
  target?: string;
  progress?: number;
  progressClassName?: string;
  footer?: string;
  icon: React.FC<{ className?: string }>;
}> = ({ label, value, target, progress, progressClassName, footer, icon: Icon }) => (
  <div className="min-w-0 p-3.5 sm:p-4">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-bold text-slate-500">{label}</span>
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-300" />
    </div>
    <div className="mt-1.5 flex min-w-0 items-baseline gap-1">
      <span className="truncate text-lg font-bold tabular-nums text-slate-900">{value}</span>
      {target ? <span className="truncate text-[9px] font-semibold text-slate-400">{target}</span> : null}
    </div>
    {typeof progress === 'number' ? <div className="mt-2.5"><ProgressBar value={progress} className={progressClassName} /></div> : null}
    {footer ? <p className="mt-2 truncate text-[9px] font-medium text-slate-400">{footer}</p> : null}
  </div>
);

export const ReportsView: React.FC = () => {
  const { tasks, projects, habits, goals } = useApp();
  const [range, setRange] = useState<ReportRange>('7d');
  const [nutrition, setNutrition] = useState<NutritionState>(() => loadNutritionState());
  const today = formatLocalDate(new Date());

  useEffect(() => {
    const refresh = () => setNutrition(loadNutritionState());
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const summary = useMemo(() => buildReportSummary(tasks, range, today), [tasks, range, today]);
  const projectRows = useMemo(() => buildProjectReport(projects, tasks, range, today), [projects, tasks, range, today]);
  const recentActivity = useMemo(() => buildDailyTaskActivity(tasks, today, 7), [tasks, today]);
  const habitRows = useMemo(() => buildHabitReport(habits, today, 7), [habits, today]);
  const nutritionReport = useMemo(() => buildNutritionReport(nutrition, range, today), [nutrition, range, today]);

  const maxTaskCount = Math.max(1, ...recentActivity.map((item) => Math.max(item.planned, item.completed)));
  const calorieProgress = nutritionReport.averageCalories === null
    ? 0
    : (nutritionReport.averageCalories / nutrition.profile.calorieTarget) * 100;
  const proteinProgress = nutritionReport.averageProtein === null
    ? 0
    : (nutritionReport.averageProtein / nutrition.profile.proteinTarget) * 100;
  const stepProgress = nutritionReport.averageSteps === null
    ? 0
    : (nutritionReport.averageSteps / nutrition.profile.stepTarget) * 100;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-6">
      <PageHeader title="Báo cáo & Hiệu suất" />

      <div className="flex rounded-xl border border-slate-200/70 bg-white p-1 shadow-xs">
        {(Object.keys(rangeLabels) as ReportRange[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRange(value)}
            className={`h-8 flex-1 rounded-lg px-3 text-[11px] font-bold transition ${
              range === value
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            {rangeLabels[value]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard
          label="Tỷ lệ hoàn thành"
          value={`${summary.completionRate}%`}
          meta={`${summary.doneTasks}/${summary.totalTasks} việc`}
          icon={CheckCircle2}
          tone="border-emerald-200/70 bg-emerald-50 text-emerald-700"
        />
        <StatCard
          label="Tập trung"
          value={`${decimal.format(summary.focusMinutes / 60)}h`}
          meta={`${whole.format(summary.focusMinutes)} phút`}
          icon={Clock3}
          tone="border-indigo-200/70 bg-indigo-50 text-indigo-700"
        />
        <StatCard
          label="Đúng hạn"
          value={summary.onTimeRate === null ? '—' : `${summary.onTimeRate}%`}
          meta={summary.deadlineDone ? `${summary.onTimeDone}/${summary.deadlineDone} việc` : 'Chưa có dữ liệu'}
          icon={Target}
          tone="border-sky-200/70 bg-sky-50 text-sky-700"
        />
        <StatCard
          label="Đang trễ"
          value={`${summary.overdueOpen}`}
          meta={`${summary.importantOpen} việc quan trọng`}
          icon={AlertTriangle}
          tone="border-amber-200/70 bg-amber-50 text-amber-700"
        />
      </div>

      <ReportSection
        title="Nhịp làm việc"
        icon={Activity}
        trailing={(
          <div className="hidden items-center gap-3 text-[9px] font-medium text-slate-400 sm:flex">
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-slate-200" />Lịch</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-500" />Xong</span>
            <span className="text-indigo-500">phút tập trung</span>
          </div>
        )}
      >
        <div className="rounded-2xl border border-slate-200/70 bg-white px-3 py-3.5 shadow-xs sm:px-4">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
            {recentActivity.map((item) => {
              const plannedHeight = item.planned ? Math.max(16, (item.planned / maxTaskCount) * 100) : 5;
              const completedHeight = item.completed ? Math.max(12, (item.completed / maxTaskCount) * 100) : 0;
              return (
                <div key={item.date} className="min-w-0 text-center">
                  <div className="flex h-20 items-end justify-center gap-1 rounded-xl bg-slate-50 px-1 py-1.5">
                    <div
                      className="w-2 rounded-full bg-slate-200 transition-all sm:w-2.5"
                      style={{ height: `${plannedHeight}%` }}
                      title={`${item.planned} việc lên lịch`}
                    />
                    <div
                      className="w-2 rounded-full bg-emerald-500 transition-all sm:w-2.5"
                      style={{ height: `${completedHeight}%` }}
                      title={`${item.completed} việc hoàn thành`}
                    />
                  </div>
                  <p className="mt-1.5 truncate text-[9px] font-bold text-slate-500">{weekday(item.date)}</p>
                  <p className="text-[8px] text-slate-400">{shortDate(item.date)}</p>
                  <p className="mt-0.5 text-[8px] font-semibold tabular-nums text-indigo-500">
                    {item.focusMinutes > 0 ? `${item.focusMinutes}p` : '—'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </ReportSection>

      <ReportSection title="Dinh dưỡng & cơ thể" icon={UtensilsCrossed}>
        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xs lg:grid-cols-4">
          <div className="border-b border-r border-slate-100 lg:border-b-0">
            <NutritionCell
              label="Calories TB"
              value={nutritionReport.averageCalories === null ? '—' : whole.format(nutritionReport.averageCalories)}
              target={`/ ${whole.format(nutrition.profile.calorieTarget)} kcal`}
              progress={calorieProgress}
              footer={`${nutritionReport.calorieTargetDays}/${nutritionReport.loggedDays} ngày đạt`}
              icon={UtensilsCrossed}
            />
          </div>
          <div className="border-b border-slate-100 lg:border-b-0 lg:border-r">
            <NutritionCell
              label="Protein TB"
              value={nutritionReport.averageProtein === null ? '—' : `${whole.format(nutritionReport.averageProtein)} g`}
              target={`/ ${whole.format(nutrition.profile.proteinTarget)} g`}
              progress={proteinProgress}
              progressClassName="bg-sky-500"
              footer={`${nutritionReport.proteinTargetDays}/${nutritionReport.loggedDays} ngày đạt`}
              icon={Target}
            />
          </div>
          <div className="border-r border-slate-100">
            <NutritionCell
              label="Steps TB"
              value={nutritionReport.averageSteps === null ? '—' : whole.format(nutritionReport.averageSteps)}
              target={`/ ${whole.format(nutrition.profile.stepTarget)}`}
              progress={stepProgress}
              progressClassName="bg-emerald-500"
              footer={`${nutritionReport.stepTargetDays}/${nutritionReport.stepLoggedDays} ngày đạt`}
              icon={Footprints}
            />
          </div>
          <NutritionCell
            label="Cân nặng"
            value={nutritionReport.latestWeightKg === null ? '—' : `${decimal.format(nutritionReport.latestWeightKg)} kg`}
            target={nutritionReport.weightChangeKg === null
              ? 'chưa đủ dữ liệu'
              : `${nutritionReport.weightChangeKg > 0 ? '+' : ''}${decimal.format(nutritionReport.weightChangeKg)} kg`}
            footer={`C ${nutritionReport.averageCarbs === null ? '—' : `${whole.format(nutritionReport.averageCarbs)}g`} · F ${nutritionReport.averageFat === null ? '—' : `${whole.format(nutritionReport.averageFat)}g`}`}
            icon={Scale}
          />
        </div>
      </ReportSection>

      <ReportSection
        title="Tiến độ dự án"
        icon={Layers}
        trailing={<span className="text-[10px] font-semibold text-slate-400">{projectRows.length} dự án</span>}
      >
        {projectRows.length > 0 ? (
          <div className="space-y-2">
            {projectRows.map(({ project, total, done, rate, focusMinutes }) => (
              <div key={project.id} className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3.5 shadow-xs">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color || '#6366f1' }} />
                    <p className="truncate text-sm font-bold text-slate-900">{project.name}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-[10px]">
                    <span className="font-medium text-slate-400">{done}/{total}</span>
                    <span className="font-bold tabular-nums text-slate-700">{rate}%</span>
                  </div>
                </div>
                <ProgressBar value={rate} />
                {focusMinutes > 0 ? (
                  <p className="mt-1.5 text-right text-[9px] font-medium text-slate-400">{whole.format(focusMinutes)}p tập trung</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa có dữ liệu dự án" description="" />
        )}
      </ReportSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <ReportSection title="Thói quen" icon={Flame}>
          {habitRows.length > 0 ? (
            <div className="space-y-2">
              {habitRows.map(({ habit, completed, target, rate }) => (
                <div key={habit.id} className="rounded-2xl border border-slate-200/70 bg-white px-3.5 py-3 shadow-xs">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-bold text-slate-900">{habit.name}</p>
                    <div className="flex shrink-0 items-center gap-2 text-[10px]">
                      <span className="font-medium text-slate-400">🔥 {habit.streak || 0}</span>
                      <span className="font-bold tabular-nums text-slate-600">{completed}/{target}</span>
                    </div>
                  </div>
                  <ProgressBar value={rate} className="bg-amber-500" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Chưa có thói quen" description="" />
          )}
        </ReportSection>

        <ReportSection title="Mục tiêu" icon={Target}>
          {goals.length > 0 ? (
            <div className="space-y-2">
              {[...goals]
                .sort((a, b) => b.progress - a.progress || a.targetDate.localeCompare(b.targetDate))
                .slice(0, 6)
                .map((goal) => (
                  <div key={goal.id} className="rounded-2xl border border-slate-200/70 bg-white px-3.5 py-3 shadow-xs">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-bold text-slate-900">{goal.title}</p>
                      <span className="shrink-0 text-xs font-bold tabular-nums text-indigo-600">{Math.round(goal.progress || 0)}%</span>
                    </div>
                    <ProgressBar value={goal.progress || 0} />
                    {goal.targetDate ? <p className="mt-1.5 text-right text-[9px] font-medium text-slate-400">{goal.targetDate}</p> : null}
                  </div>
                ))}
            </div>
          ) : (
            <EmptyState title="Chưa có mục tiêu" description="" />
          )}
        </ReportSection>
      </div>
    </div>
  );
};
