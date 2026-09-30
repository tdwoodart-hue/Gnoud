import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  Clock3,
  Footprints,
  Headphones,
  Layers,
  Scale,
  Target,
  TimerReset,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { loadNutritionState, type NutritionState } from '../../services/nutritionService';
import {
  buildDailyTaskActivity,
  buildExerciseReport,
  buildNutritionReport,
  buildPeriodComparison,
  buildReadingReport,
  buildProjectReport,
  buildReportSummary,
  buildWorkTimeReport,
  formatLocalDate,
  type ReportRange,
} from '../../services/reportService';
import { EmptyState } from '../common/EmptyState';
import { PageHeader } from '../common/PageHeader';
import { loadReaderLibrary, type ReaderBook } from '../../services/readerService';
import { fetchCloudReaderBooks, mergeReaderLibraries } from '../../services/readerCloudService';
import { loadExerciseProgress, type ExerciseProgressStore } from '../../services/exerciseService';

const whole = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

const rangeLabels: Record<ReportRange, string> = {
  '7d': '7 ngày',
  '30d': '30 ngày',
  all: 'Toàn bộ',
};

const clamp = (value: number) => Math.min(100, Math.max(0, value));
const shortDay = (date: string) => new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(new Date(`${date}T12:00:00`));

const formatReadingTime = (seconds: number) => {
  const minutes = Math.round(Math.max(0, seconds) / 60);
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}g ${rest}p` : `${hours} giờ`;
};

const formatMinutes = (minutes: number) => {
  if (minutes < 60) return `${Math.round(minutes)} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours}g ${rest}p` : `${hours} giờ`;
};

const ProgressBar: React.FC<{ value: number; className?: string }> = ({ value, className = 'bg-indigo-500' }) => (
  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
    <div className={`h-full rounded-full transition-all duration-500 ${className}`} style={{ width: `${clamp(value)}%` }} />
  </div>
);

const DeltaBadge: React.FC<{ value: number; suffix?: string }> = ({ value, suffix = '' }) => {
  if (value === 0) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-400">= kỳ trước</span>;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${value > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
      {value > 0 ? '+' : ''}{value}{suffix}
    </span>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string;
  meta: string;
  icon: React.FC<{ className?: string }>;
  tone: string;
  delta?: React.ReactNode;
  className?: string;
}> = ({ label, value, meta, icon: Icon, tone, delta, className = '' }) => (
  <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs ${className}`}>
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-semibold text-slate-400">{label}</span>
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl border ${tone}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
    </div>
    <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
      <p className="text-[22px] font-bold tracking-tight tabular-nums text-slate-900">{value}</p>
      {delta}
    </div>
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
  const { tasks, projects, user } = useApp();
  const [range, setRange] = useState<ReportRange>('7d');
  const [nutrition, setNutrition] = useState<NutritionState>(() => loadNutritionState());
  const [readerBooks, setReaderBooks] = useState<ReaderBook[]>(() => loadReaderLibrary(user?.uid));
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgressStore>(() => loadExerciseProgress(user?.uid));
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

  useEffect(() => {
    const refresh = () => setExerciseProgress(loadExerciseProgress(user?.uid));
    refresh();
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
  }, [user?.uid]);

  useEffect(() => {
    let disposed = false;
    const refresh = async () => {
      const local = loadReaderLibrary(user?.uid);
      if (!disposed) setReaderBooks(local);
      if (!user?.uid) return;
      try {
        const remote = await fetchCloudReaderBooks(user.uid);
        if (!disposed) setReaderBooks(mergeReaderLibraries(local, remote));
      } catch {
        // Báo cáo vẫn dùng dữ liệu local nếu cloud tạm thời không truy cập được.
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    void refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.uid]);

  const summary = useMemo(() => buildReportSummary(tasks, range, today), [tasks, range, today]);
  const comparison = useMemo(() => buildPeriodComparison(tasks, range, today), [tasks, range, today]);
  const activity = useMemo(() => buildDailyTaskActivity(tasks, today, 7), [tasks, today]);
  const projectRows = useMemo(() => buildProjectReport(projects, tasks, range, today), [projects, tasks, range, today]);
  const nutritionReport = useMemo(() => buildNutritionReport(nutrition, range, today), [nutrition, range, today]);
  const readingReport = useMemo(() => buildReadingReport(readerBooks, range, today), [readerBooks, range, today]);
  const exerciseReport = useMemo(() => buildExerciseReport(exerciseProgress, range, today), [exerciseProgress, range, today]);
  const workTimeReport = useMemo(() => buildWorkTimeReport(tasks, range, today), [tasks, range, today]);

  const calorieProgress = nutritionReport.averageCalories === null ? 0 : (nutritionReport.averageCalories / nutrition.profile.calorieTarget) * 100;
  const proteinProgress = nutritionReport.averageProtein === null ? 0 : (nutritionReport.averageProtein / nutrition.profile.proteinTarget) * 100;
  const stepProgress = nutritionReport.averageSteps === null ? 0 : (nutritionReport.averageSteps / nutrition.profile.stepTarget) * 100;

  const activityMax = Math.max(1, ...activity.flatMap((row) => [row.planned, row.completed]));
  const weekCompleted = activity.reduce((sum, row) => sum + row.completed, 0);
  const weekPlanned = activity.reduce((sum, row) => sum + row.planned, 0);
  const bestDay = activity.some((row) => row.completed > 0)
    ? [...activity].sort((a, b) => b.completed - a.completed || b.planned - a.planned)[0]
    : null;
  const readingWindowMax = Math.max(1, ...readingReport.timeWindows.map((item) => item.seconds));

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-6">
      <PageHeader title="Báo cáo" />

      <div className="flex rounded-xl border border-slate-200/70 bg-white p-1 shadow-xs">
        {(Object.keys(rangeLabels) as ReportRange[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRange(value)}
            className={`h-8 flex-1 rounded-lg px-3 text-[11px] font-bold transition ${
              range === value ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            {rangeLabels[value]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
        <StatCard
          label="Tỷ lệ hoàn thành"
          value={`${summary.completionRate}%`}
          meta={`${summary.doneTasks}/${summary.totalTasks} việc`}
          icon={CheckCircle2}
          tone="border-emerald-200/70 bg-emerald-50 text-emerald-700"
          delta={comparison ? <DeltaBadge value={comparison.completionRateDelta} suffix="đ" /> : undefined}
        />
        <StatCard
          label="Đúng hạn"
          value={summary.onTimeRate === null ? '—' : `${summary.onTimeRate}%`}
          meta={summary.deadlineDone ? `${summary.onTimeDone}/${summary.deadlineDone} việc có deadline` : 'Chưa có dữ liệu deadline'}
          icon={Target}
          tone="border-sky-200/70 bg-sky-50 text-sky-700"
        />
        <StatCard
          label="Đang trễ"
          value={`${summary.overdueOpen}`}
          meta={`${summary.importantOpen} việc quan trọng đang mở`}
          icon={AlertTriangle}
          tone="border-amber-200/70 bg-amber-50 text-amber-700"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <ReportSection
        title="Nhịp công việc 7 ngày"
        icon={TrendingUp}
        trailing={<span className="text-[10px] font-semibold text-slate-400">{weekCompleted}/{weekPlanned} việc</span>}
      >
        <div className="rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-xs sm:p-4">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {activity.map((row) => (
              <div key={row.date} className="min-w-0 text-center">
                <div className="mx-auto flex h-24 max-w-10 items-end justify-center gap-1 rounded-xl bg-slate-50 px-1.5 pb-2 pt-2">
                  <span className="w-2 rounded-full bg-slate-300" style={{ height: `${Math.max(5, (row.planned / activityMax) * 72)}%` }} title={`${row.planned} việc đã lên lịch`} />
                  <span className="w-2 rounded-full bg-indigo-500" style={{ height: `${Math.max(5, (row.completed / activityMax) * 72)}%` }} title={`${row.completed} việc hoàn thành`} />
                </div>
                <p className="mt-1.5 truncate text-[9px] font-bold text-slate-500">{shortDay(row.date)}</p>
                <p className="mt-0.5 text-[8px] font-medium tabular-nums text-slate-400">{row.completed}/{row.planned}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <p className="text-[9px] font-semibold text-slate-400">Ngày hoàn thành nhiều nhất</p>
              <p className="mt-0.5 text-xs font-bold text-slate-800">{bestDay ? `${shortDay(bestDay.date)} · ${bestDay.completed} việc` : '—'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <p className="text-[9px] font-semibold text-slate-400">Tổng 7 ngày</p>
              <p className="mt-0.5 text-xs font-bold text-slate-800">{weekCompleted} hoàn thành · {weekPlanned} lên lịch</p>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-3 text-[8px] font-semibold text-slate-400">
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-slate-300" /> Đã lên lịch</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-indigo-500" /> Hoàn thành</span>
          </div>
        </div>
      </ReportSection>

      <ReportSection title="Thời gian làm việc" icon={TimerReset} trailing={<span className="text-[10px] font-semibold text-slate-400">Từ Focus timer</span>}>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
          <StatCard
            label="Tập trung thực tế"
            value={formatMinutes(workTimeReport.actualMinutes)}
            meta={workTimeReport.loggedTasks ? `${workTimeReport.loggedTasks} việc có đo thời gian` : 'Chưa có phiên Focus'}
            icon={Clock3}
            tone="border-indigo-200/70 bg-indigo-50 text-indigo-700"
          />
          <StatCard
            label="Ước tính cùng các việc"
            value={formatMinutes(workTimeReport.estimatedMinutes)}
            meta="Chỉ so các việc đã có thời gian thực tế"
            icon={Target}
            tone="border-sky-200/70 bg-sky-50 text-sky-700"
          />
          <StatCard
            label="Phiên dài nhất"
            value={workTimeReport.longestTaskMinutes ? formatMinutes(workTimeReport.longestTaskMinutes) : '—'}
            meta={workTimeReport.longestTaskTitle || 'Chưa có dữ liệu'}
            icon={TimerReset}
            tone="border-violet-200/70 bg-violet-50 text-violet-700"
            className="col-span-2 lg:col-span-1"
          />
        </div>
      </ReportSection>

      <ReportSection
        title="Đọc sách"
        icon={BookOpen}
        trailing={<span className="text-[10px] font-semibold text-slate-400">Tính từ v0.8.4</span>}
      >
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <StatCard
            label="Thời gian đọc"
            value={formatReadingTime(readingReport.readingSeconds)}
            meta="Đọc chủ động"
            icon={Clock3}
            tone="border-indigo-200/70 bg-indigo-50 text-indigo-700"
          />
          <StatCard
            label="Nghe sách"
            value={formatReadingTime(readingReport.listeningSeconds)}
            meta="TTS khi đang phát"
            icon={Headphones}
            tone="border-violet-200/70 bg-violet-50 text-violet-700"
          />
          <StatCard
            label="Tổng với sách"
            value={formatReadingTime(readingReport.totalSeconds)}
            meta={readingReport.booksTouched ? `${readingReport.booksTouched} cuốn có hoạt động` : 'Chưa có dữ liệu'}
            icon={BookOpen}
            tone="border-sky-200/70 bg-sky-50 text-sky-700"
          />
          <StatCard
            label="Ngày có đọc"
            value={`${readingReport.activeDays}`}
            meta={range === 'all' ? 'Toàn bộ dữ liệu' : `Trong ${range === '7d' ? '7' : '30'} ngày`}
            icon={CalendarDays}
            tone="border-emerald-200/70 bg-emerald-50 text-emerald-700"
          />
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
            <div>
              <p className="text-[9px] font-semibold text-slate-400">Số phiên</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{readingReport.sessionCount || '—'}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-slate-400">Lâu nhất</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{readingReport.longestSessionSeconds ? formatReadingTime(readingReport.longestSessionSeconds) : '—'}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-slate-400">Thường đọc</p>
              <p className="mt-1 truncate text-sm font-bold text-slate-800">{readingReport.favoriteTimeLabel || '—'}</p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {readingReport.timeWindows.map((window) => (
              <div key={window.key} className="grid grid-cols-[92px_minmax(0,1fr)_48px] items-center gap-2">
                <span className="truncate text-[9px] font-semibold text-slate-500">{window.label}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <span className="block h-full rounded-full bg-indigo-400" style={{ width: `${Math.max(0, (window.seconds / readingWindowMax) * 100)}%` }} />
                </span>
                <span className="text-right text-[9px] font-bold tabular-nums text-slate-400">{window.seconds ? Math.round(window.seconds / 60) : 0}p</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[9px] leading-4 text-slate-400">Khung giờ, số phiên và phiên lâu nhất chỉ được đo từ v0.9.19; tổng thời gian cũ vẫn được giữ nguyên.</p>
        </div>
      </ReportSection>

      <ReportSection title="Gym" icon={Dumbbell} trailing={<span className="text-[10px] font-semibold text-slate-400">Lịch sử kg & reps</span>}>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <StatCard label="Ngày có tập" value={`${exerciseReport.activeDays}`} meta="Ngày có ít nhất 1 bài được ghi" icon={CalendarDays} tone="border-indigo-200/70 bg-indigo-50 text-indigo-700" />
          <StatCard label="Lần ghi bài" value={`${exerciseReport.loggedEntries}`} meta="Mỗi bài / mỗi ngày tính 1 lần" icon={Dumbbell} tone="border-sky-200/70 bg-sky-50 text-sky-700" />
          <StatCard label="Bài tiến bộ" value={`${exerciseReport.improvedExercises}`} meta="Tăng kg hoặc reps so lần trước" icon={TrendingUp} tone="border-emerald-200/70 bg-emerald-50 text-emerald-700" />
          <StatCard label="Đang theo dõi" value={`${exerciseReport.trackedExercises}`} meta="Bài có lịch sử trong máy" icon={Target} tone="border-violet-200/70 bg-violet-50 text-violet-700" />
        </div>

        {exerciseReport.trends.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xs">
            {exerciseReport.trends.slice(0, 5).map((trend, index) => (
              <div key={trend.key} className={`flex items-center justify-between gap-3 px-4 py-3 ${index ? 'border-t border-slate-100' : ''}`}>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-800">{trend.label}</p>
                  <p className="mt-0.5 text-[9px] font-medium text-slate-400">{trend.latest.date}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-bold tabular-nums text-slate-700">
                    {trend.latest.weight ? `${trend.latest.weight} kg` : '—'} · {trend.latest.reps ? `${trend.latest.reps} reps` : '—'}
                  </p>
                  <p className="mt-0.5 text-[9px] font-semibold text-slate-400">
                    {trend.weightDelta !== null ? `${trend.weightDelta > 0 ? '+' : ''}${decimal.format(trend.weightDelta)} kg` : 'kg —'}
                    {' · '}
                    {trend.repsDelta !== null ? `${trend.repsDelta > 0 ? '+' : ''}${decimal.format(trend.repsDelta)} reps` : 'reps —'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa có lịch sử gym trong khoảng này" description="" />
        )}
      </ReportSection>

      <ReportSection title="Dinh dưỡng & cơ thể" icon={UtensilsCrossed}>
        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xs lg:grid-cols-4">
          <div className="border-b border-r border-slate-100 lg:border-b-0">
            <NutritionCell label="Calories TB" value={nutritionReport.averageCalories === null ? '—' : whole.format(nutritionReport.averageCalories)} target={`/ ${whole.format(nutrition.profile.calorieTarget)} kcal`} progress={calorieProgress} footer={`${nutritionReport.calorieTargetDays}/${nutritionReport.loggedDays} ngày đạt`} icon={UtensilsCrossed} />
          </div>
          <div className="border-b border-slate-100 lg:border-b-0 lg:border-r">
            <NutritionCell label="Protein TB" value={nutritionReport.averageProtein === null ? '—' : `${whole.format(nutritionReport.averageProtein)} g`} target={`/ ${whole.format(nutrition.profile.proteinTarget)} g`} progress={proteinProgress} progressClassName="bg-sky-500" footer={`${nutritionReport.proteinTargetDays}/${nutritionReport.loggedDays} ngày đạt`} icon={Target} />
          </div>
          <div className="border-r border-slate-100">
            <NutritionCell label="Steps TB" value={nutritionReport.averageSteps === null ? '—' : whole.format(nutritionReport.averageSteps)} target={`/ ${whole.format(nutrition.profile.stepTarget)}`} progress={stepProgress} progressClassName="bg-emerald-500" footer={`${nutritionReport.stepTargetDays}/${nutritionReport.stepLoggedDays} ngày đạt`} icon={Footprints} />
          </div>
          <NutritionCell
            label="Cân nặng"
            value={nutritionReport.latestWeightKg === null ? '—' : `${decimal.format(nutritionReport.latestWeightKg)} kg`}
            target={nutritionReport.weightChangeKg === null ? 'chưa đủ dữ liệu' : `${nutritionReport.weightChangeKg > 0 ? '+' : ''}${decimal.format(nutritionReport.weightChangeKg)} kg`}
            footer={`C ${nutritionReport.averageCarbs === null ? '—' : `${whole.format(nutritionReport.averageCarbs)}g`} · F ${nutritionReport.averageFat === null ? '—' : `${whole.format(nutritionReport.averageFat)}g`}`}
            icon={Scale}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-xs">
          <div>
            <p className="text-[9px] font-semibold text-slate-400">Calories đạt vùng</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{nutritionReport.calorieAdherenceRate === null ? '—' : `${nutritionReport.calorieAdherenceRate}%`}</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold text-slate-400">Protein đạt</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{nutritionReport.proteinAdherenceRate === null ? '—' : `${nutritionReport.proteinAdherenceRate}%`}</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold text-slate-400">Steps đạt</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{nutritionReport.stepAdherenceRate === null ? '—' : `${nutritionReport.stepAdherenceRate}%`}</p>
          </div>
        </div>
        {nutritionReport.averageCalorieDeviation !== null ? (
          <p className="px-1 text-[9px] font-medium text-slate-400">Sai lệch calories trung bình: {whole.format(nutritionReport.averageCalorieDeviation)} kcal/ngày so với mục tiêu.</p>
        ) : null}
      </ReportSection>

      <ReportSection title="Tiến độ dự án" icon={Layers} trailing={<span className="text-[10px] font-semibold text-slate-400">{projectRows.length} dự án</span>}>
        {projectRows.length > 0 ? (
          <div className="space-y-2">
            {projectRows.map(({ project, total, done, rate }) => (
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
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa có dữ liệu dự án" description="" />
        )}
      </ReportSection>
    </div>
  );
};
