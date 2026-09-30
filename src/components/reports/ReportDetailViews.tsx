
import React from 'react';
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Dumbbell,
  Footprints,
  Headphones,
  Layers,
  Scale,
  Target,
  TimerReset,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react';
import { EmptyState } from '../common/EmptyState';
import type {
  DailyTaskActivity,
  ExerciseDeepReport,
  NutritionDayReport,
  NutritionDeepReport,
  ProjectDeepReport,
  ProjectReportRow,
  ReadingBookReport,
  ReadingDayReport,
  ReadingDeepReport,
  ReportComparison,
  ReportRange,
  ReportSummary,
  WorkTimeReport,
} from '../../services/reportService';
import {
  ActivityBars,
  decimal,
  DetailHeader,
  formatDate,
  formatDuration,
  formatMinutes,
  formatSessionTime,
  MetricCard,
  ProgressBar,
  RangeControl,
  ReadingDailyBars,
  Section,
  whole,
} from './reportUi';

const statusLabels = {
  todo: 'Chưa làm',
  in_progress: 'Đang làm',
  waiting: 'Đang chờ',
  deferred: 'Hoãn',
  done: 'Đã xong',
} as const;

const priorityLabels = {
  urgent: 'Khẩn cấp',
  high: 'Cao',
  medium: 'Vừa',
  low: 'Thấp',
} as const;

export const WorkReportView: React.FC<{
  summary: ReportSummary;
  comparison: ReportComparison | null;
  workTime: WorkTimeReport;
  activity: DailyTaskActivity[];
  projects: ProjectReportRow[];
  range: ReportRange;
  onRange: (range: ReportRange) => void;
  onBack: () => void;
  onOpenProject: (id: string) => void;
}> = ({ summary, comparison, workTime, activity, projects, range, onRange, onBack, onOpenProject }) => (
  <div className="mx-auto max-w-5xl space-y-5 pb-6">
    <DetailHeader title="Công việc" subtitle="Báo cáo tổng công việc và các dự án" onBack={onBack} />
    <RangeControl value={range} onChange={onRange} />
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <MetricCard label="Hoàn thành" value={summary.completionRate + '%'} meta={summary.doneTasks + '/' + summary.totalTasks + ' việc'} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" />
      <MetricCard label="Đúng hạn" value={summary.onTimeRate === null ? '—' : summary.onTimeRate + '%'} meta={summary.deadlineDone ? summary.onTimeDone + '/' + summary.deadlineDone : 'Chưa có deadline đã xong'} icon={Target} tone="bg-sky-50 text-sky-700" />
      <MetricCard label="Đang trễ" value={String(summary.overdueOpen)} meta={summary.importantOpen + ' việc quan trọng đang mở'} icon={AlertTriangle} tone="bg-amber-50 text-amber-700" />
      <MetricCard label="Focus" value={formatMinutes(workTime.actualMinutes)} meta={workTime.loggedTasks ? workTime.loggedTasks + ' việc có đo' : 'Chưa có Focus timer'} icon={TimerReset} tone="bg-violet-50 text-violet-700" />
    </div>
    {comparison ? (
      <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-xs">
        <p className="text-[10px] text-slate-400">So với kỳ trước cùng độ dài</p>
        <p className="mt-1 text-sm font-bold text-slate-800">
          {(comparison.completedDelta > 0 ? '+' : '') + comparison.completedDelta + ' việc hoàn thành · ' + (comparison.completionRateDelta > 0 ? '+' : '') + comparison.completionRateDelta + ' điểm tỷ lệ'}
        </p>
      </div>
    ) : null}
    <Section title="Nhịp công việc" subtitle={range === '7d' ? '7 ngày gần nhất' : '14 ngày gần nhất'}>
      <ActivityBars rows={activity} />
    </Section>
    <Section title="Các dự án" subtitle="Bấm vào từng dự án để mở báo cáo chuyên sâu">
      {projects.length ? (
        <div className="space-y-2">
          {projects.map((row) => (
            <button key={row.project.id} type="button" onClick={() => onOpenProject(row.project.id)} className="w-full rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-xs active:bg-slate-50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.project.color || '#6366f1' }} />
                  <p className="truncate text-sm font-bold text-slate-900">{row.project.name}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </div>
              <div className="mt-3"><ProgressBar value={row.rate} /></div>
              <div className="mt-2 flex items-center justify-between text-[10px]"><span className="font-semibold text-slate-500">{row.rate}%</span><span className="text-slate-400">{row.done}/{row.total} việc</span></div>
            </button>
          ))}
        </div>
      ) : <EmptyState title="Chưa có dự án trong khoảng này" />}
    </Section>
  </div>
);

export const ProjectReportView: React.FC<{
  report: ProjectDeepReport;
  range: ReportRange;
  onRange: (range: ReportRange) => void;
  onBack: () => void;
  onOpenDay: (date: string) => void;
}> = ({ report, range, onRange, onBack, onOpenDay }) => {
  const variance = report.timeVarianceMinutes === 0
    ? 'đúng ước tính'
    : report.timeVarianceMinutes > 0
      ? '+ ' + formatMinutes(report.timeVarianceMinutes) + ' so với ước tính'
      : '- ' + formatMinutes(Math.abs(report.timeVarianceMinutes)) + ' so với ước tính';
  const statuses: Array<{ label: string; value: number }> = [
    { label: 'Chưa làm', value: report.statusBreakdown.todo },
    { label: 'Đang làm', value: report.statusBreakdown.inProgress },
    { label: 'Đang chờ', value: report.statusBreakdown.waiting },
    { label: 'Hoãn', value: report.statusBreakdown.deferred },
    { label: 'Đã xong', value: report.statusBreakdown.done },
  ];
  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-6">
      <DetailHeader title={report.project.name} subtitle="Báo cáo chuyên sâu theo dự án" onBack={onBack} />
      <RangeControl value={range} onChange={onRange} />
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <MetricCard label="Hoàn thành" value={report.completionRate + '%'} meta={report.doneTasks + '/' + report.totalTasks + ' việc'} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" />
        <MetricCard label="Đang mở" value={String(report.openTasks)} meta={report.overdueOpen + ' việc đang trễ'} icon={Layers} />
        <MetricCard label="Đúng hạn" value={report.onTimeRate === null ? '—' : report.onTimeRate + '%'} meta={report.deadlineDone ? report.onTimeDone + '/' + report.deadlineDone + ' việc có deadline' : 'Chưa đủ dữ liệu'} icon={Target} tone="bg-sky-50 text-sky-700" />
        <MetricCard label="Focus" value={formatMinutes(report.actualMinutes)} meta={report.measuredTasks + ' việc có đo · ' + variance} icon={TimerReset} tone="bg-violet-50 text-violet-700" />
      </div>
      <Section title="Tiến độ dự án" subtitle={report.project.targetDate ? 'Mốc mục tiêu: ' + formatDate(report.project.targetDate) : undefined}>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs">
          <div className="flex items-end justify-between gap-3"><div><p className="text-[11px] font-semibold text-slate-400">Công việc</p><p className="mt-1 text-2xl font-bold text-slate-900">{report.completionRate}%</p></div><p className="text-xs font-semibold text-slate-500">{report.doneTasks}/{report.totalTasks}</p></div>
          <div className="mt-3"><ProgressBar value={report.completionRate} /></div>
          {report.milestoneTotal > 0 ? <div className="mt-4 border-t border-slate-100 pt-4"><div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-500">Milestone</span><span className="font-bold text-slate-700">{report.milestoneDone}/{report.milestoneTotal} · {report.milestoneRate}%</span></div><div className="mt-2"><ProgressBar value={report.milestoneRate} className="bg-emerald-500" /></div></div> : null}
        </div>
      </Section>
      <Section title="Trạng thái công việc">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">{statuses.map((item) => <div key={item.label} className="rounded-xl bg-white p-3 text-center shadow-xs"><p className="text-lg font-bold text-slate-900">{item.value}</p><p className="mt-0.5 text-[9px] font-semibold text-slate-400">{item.label}</p></div>)}</div>
      </Section>
      <Section title="Nhịp dự án" subtitle={range === '7d' ? '7 ngày gần nhất' : '14 ngày gần nhất'}><ActivityBars rows={report.activity} /></Section>
      <Section title="Công việc trong dự án" subtitle={report.importantOpen + ' việc ưu tiên cao đang mở'}>
        {report.tasks.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xs">
            {report.tasks.map((task, index) => (
              <div key={task.id} className={'px-4 py-3 ' + (index ? 'border-t border-slate-100' : '')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className={'truncate text-xs font-bold ' + (task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800')}>{task.title}</p><p className="mt-1 text-[9px] text-slate-400">{statusLabels[task.status]} · {priorityLabels[task.priority]}{task.deadline ? ' · hạn ' + formatDate(task.deadline) : ''}</p></div>
                  {task.actualMinutes > 0 ? <span className="shrink-0 text-[10px] font-bold text-slate-500">{formatMinutes(task.actualMinutes)}</span> : null}
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState title="Chưa có công việc trong khoảng này" />}
      </Section>
    </div>
  );
};

export const ReadingReportView: React.FC<{
  report: ReadingDeepReport;
  range: ReportRange;
  onRange: (range: ReportRange) => void;
  onBack: () => void;
  onOpenBook: (id: string) => void;
  onOpenDay: (date: string) => void;
}> = ({ report, range, onRange, onBack, onOpenBook, onOpenDay }) => {
  const windowMax = Math.max(1, ...report.summary.timeWindows.map((item) => item.seconds));
  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-6">
      <DetailHeader title="Đọc sách" subtitle="Báo cáo riêng cho việc đọc và nghe sách" onBack={onBack} />
      <RangeControl value={range} onChange={onRange} />
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <MetricCard label="Đọc chủ động" value={formatDuration(report.summary.readingSeconds)} meta={report.readingSharePercent + '% tổng thời gian'} icon={BookOpen} />
        <MetricCard label="Nghe sách" value={formatDuration(report.summary.listeningSeconds)} meta={report.listeningSharePercent + '% tổng thời gian'} icon={Headphones} tone="bg-violet-50 text-violet-700" />
        <MetricCard label="Phiên đọc" value={String(report.summary.sessionCount)} meta={'TB ' + formatDuration(report.summary.averageSessionSeconds)} icon={TimerReset} tone="bg-sky-50 text-sky-700" />
        <MetricCard label="Ngày hoạt động" value={String(report.summary.activeDays)} meta={'TB ' + formatDuration(report.averageActiveDaySeconds) + '/ngày'} icon={CalendarDays} tone="bg-emerald-50 text-emerald-700" />
      </div>
      <Section title="Phân tích hoạt động">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs"><p className="text-[10px] font-semibold text-slate-400">Phiên lâu nhất</p><p className="mt-1 text-lg font-bold text-slate-900">{formatDuration(report.summary.longestSessionSeconds)}</p></div>
          <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs"><p className="text-[10px] font-semibold text-slate-400">Khung giờ chính</p><p className="mt-1 text-sm font-bold text-slate-900">{report.summary.favoriteTimeLabel || '—'}</p></div>
          <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs"><p className="text-[10px] font-semibold text-slate-400">Sách có hoạt động</p><p className="mt-1 text-lg font-bold text-slate-900">{report.summary.booksTouched}</p></div>
          <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs"><p className="text-[10px] font-semibold text-slate-400">Đã đọc xong</p><p className="mt-1 text-lg font-bold text-slate-900">{report.completedBooks}</p><p className="mt-0.5 text-[9px] text-slate-400">Trạng thái hiện tại, không gán ngày hoàn thành giả</p></div>
        </div>
      </Section>
      <Section title="Nhịp đọc theo ngày" subtitle="Tối đa 14 ngày gần nhất trên biểu đồ"><ReadingDailyBars rows={report.dailyActivity} /></Section>
      <Section title="Theo từng ngày" subtitle="Bấm vào một ngày để xem sách và từng session">
        <div className="space-y-2">
          {report.dailyActivity.filter((day) => day.totalSeconds > 0 || day.sessionCount > 0).slice().reverse().slice(0, 14).map((day) => (
            <button key={day.date} type="button" onClick={() => onOpenDay(day.date)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-left shadow-xs active:bg-slate-50">
              <div>
                <p className="text-xs font-bold text-slate-800">{formatDate(day.date)}</p>
                <p className="mt-0.5 text-[9px] text-slate-400">Đọc {Math.round(day.readingSeconds / 60)}p · Nghe {Math.round(day.listeningSeconds / 60)}p · {day.sessionCount} phiên</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">{formatDuration(day.totalSeconds)}</span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </button>
          ))}
        </div>
      </Section>
      <Section title="Khung giờ đọc">
        <div className="space-y-2 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs">
          {report.summary.timeWindows.map((window) => (
            <div key={window.key} className="grid grid-cols-[92px_minmax(0,1fr)_54px] items-center gap-2">
              <span className="truncate text-[9px] font-semibold text-slate-500">{window.label}</span>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-400" style={{ width: (window.seconds / windowMax) * 100 + '%' }} /></div>
              <span className="text-right text-[9px] font-bold text-slate-400">{Math.round(window.seconds / 60)}p</span>
            </div>
          ))}
          <p className="border-t border-slate-100 pt-2 text-[9px] leading-4 text-slate-400">Khung giờ và session chi tiết chỉ có dữ liệu từ v0.9.19; tổng phút đọc cũ vẫn được giữ.</p>
        </div>
      </Section>
      <Section title="Theo từng cuốn" subtitle="Bấm một cuốn để xem báo cáo riêng">
        {report.books.length ? <div className="space-y-2">{report.books.map((book) => (
          <button key={book.book.id} type="button" onClick={() => onOpenBook(book.book.id)} className="w-full rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-xs active:bg-slate-50">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{book.book.title}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{book.book.author || book.book.format.toUpperCase()}</p></div><ChevronRight className="h-4 w-4 shrink-0 text-slate-300" /></div>
            <div className="mt-3"><ProgressBar value={book.progressPercent} /></div>
            <div className="mt-2 flex items-center justify-between gap-3 text-[10px]"><span className="font-semibold text-slate-500">{book.progressPercent}% · {formatDuration(book.totalSeconds)}</span><span className="text-slate-400">{book.activeDays} ngày · {book.sessionCount} phiên</span></div>
          </button>
        ))}</div> : <EmptyState title="Chưa có sách" />}
      </Section>
      <Section title="Session gần đây">
        {report.recentSessions.length ? <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xs">{report.recentSessions.slice(0, 8).map((session, index) => (
          <div key={session.id} className={'flex items-center justify-between gap-3 px-4 py-3 ' + (index ? 'border-t border-slate-100' : '')}><div className="min-w-0"><p className="truncate text-[11px] font-bold text-slate-700">{session.bookTitle}</p><p className="mt-0.5 text-[9px] text-slate-400">{formatSessionTime(session.startedAt)}</p></div><p className="shrink-0 text-xs font-bold text-slate-800">{formatDuration(session.totalSeconds)}</p></div>
        ))}</div> : <EmptyState title="Chưa có session chi tiết" />}
      </Section>
    </div>
  );
};

export const BookReportView: React.FC<{
  report: ReadingBookReport;
  range: ReportRange;
  onRange: (range: ReportRange) => void;
  onBack: () => void;
}> = ({ report, range, onRange, onBack }) => (
  <div className="mx-auto max-w-5xl space-y-5 pb-6">
    <DetailHeader title={report.book.title} subtitle={report.book.author || 'Báo cáo theo từng cuốn'} onBack={onBack} />
    <RangeControl value={range} onChange={onRange} />
    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs"><div className="flex items-end justify-between gap-3"><div><p className="text-[11px] font-semibold text-slate-400">Tiến độ hiện tại</p><p className="mt-1 text-3xl font-bold text-slate-900">{report.progressPercent}%</p></div><p className="text-[10px] text-slate-400">{report.book.format.toUpperCase()}</p></div><div className="mt-3"><ProgressBar value={report.progressPercent} /></div></div>
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <MetricCard label="Tổng thời gian" value={formatDuration(report.totalSeconds)} icon={Clock3} />
      <MetricCard label="Đọc chủ động" value={formatDuration(report.readingSeconds)} icon={BookOpen} />
      <MetricCard label="Nghe sách" value={formatDuration(report.listeningSeconds)} icon={Headphones} tone="bg-violet-50 text-violet-700" />
      <MetricCard label="Ngày hoạt động" value={String(report.activeDays)} meta={report.sessionCount + ' phiên được ghi'} icon={CalendarDays} tone="bg-emerald-50 text-emerald-700" />
    </div>
    <Section title="Phiên đọc" subtitle={'Trung bình ' + formatDuration(report.averageSessionSeconds) + ' · lâu nhất ' + formatDuration(report.longestSessionSeconds)}>
      {report.recentSessions.length ? <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xs">{report.recentSessions.map((session, index) => (
        <div key={session.id} className={'flex items-center justify-between gap-3 px-4 py-3 ' + (index ? 'border-t border-slate-100' : '')}><div><p className="text-[11px] font-bold text-slate-700">{formatSessionTime(session.startedAt)}</p><p className="mt-0.5 text-[9px] text-slate-400">{session.mode === 'mixed' ? 'Đọc + nghe' : session.mode === 'listening' ? 'Nghe sách' : 'Đọc chủ động'}</p></div><div className="text-right"><p className="text-xs font-bold text-slate-800">{formatDuration(session.totalSeconds)}</p><p className="mt-0.5 text-[9px] text-slate-400">Đọc {Math.round(session.readingSeconds / 60)}p · Nghe {Math.round(session.listeningSeconds / 60)}p</p></div></div>
      ))}</div> : <EmptyState title="Chưa có session chi tiết" description="Session chi tiết chỉ được ghi từ v0.9.19." />}
    </Section>
    <Section title="Nhịp đọc theo ngày"><ReadingDailyBars rows={report.dailyActivity} /></Section>
  </div>
);

export const NutritionReportView: React.FC<{
  report: NutritionDeepReport;
  range: ReportRange;
  onRange: (range: ReportRange) => void;
  onBack: () => void;
}> = ({ report, range, onRange, onBack }) => {
  const summary = report.summary;
  const adherence: Array<{ label: string; value: number | null }> = [
    { label: 'Calories', value: summary.calorieAdherenceRate },
    { label: 'Protein', value: summary.proteinAdherenceRate },
    { label: 'Steps', value: summary.stepAdherenceRate },
  ];
  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-6">
      <DetailHeader title="Dinh dưỡng" subtitle="Báo cáo ăn uống, bước chân và cân nặng" onBack={onBack} />
      <RangeControl value={range} onChange={onRange} />
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <MetricCard label="Calories TB" value={summary.averageCalories === null ? '—' : whole.format(summary.averageCalories) + ' kcal'} meta={summary.calorieAdherenceRate === null ? undefined : summary.calorieAdherenceRate + '% ngày đạt vùng'} icon={UtensilsCrossed} />
        <MetricCard label="Protein TB" value={summary.averageProtein === null ? '—' : whole.format(summary.averageProtein) + ' g'} meta={summary.proteinAdherenceRate === null ? undefined : summary.proteinAdherenceRate + '% ngày đạt'} icon={Target} tone="bg-sky-50 text-sky-700" />
        <MetricCard label="Steps TB" value={summary.averageSteps === null ? '—' : whole.format(summary.averageSteps)} meta={summary.stepAdherenceRate === null ? undefined : summary.stepAdherenceRate + '% ngày đạt'} icon={Footprints} tone="bg-emerald-50 text-emerald-700" />
        <MetricCard label="Cân nặng" value={summary.latestWeightKg === null ? '—' : decimal.format(summary.latestWeightKg) + ' kg'} meta={summary.weightChangeKg === null ? 'Chưa đủ mốc so sánh' : (summary.weightChangeKg > 0 ? '+' : '') + decimal.format(summary.weightChangeKg) + ' kg trong khoảng'} icon={Scale} tone="bg-violet-50 text-violet-700" />
      </div>
      <Section title="Độ bám mục tiêu"><div className="grid grid-cols-3 gap-2.5">{adherence.map((item) => <div key={item.label} className="rounded-2xl border border-slate-200/70 bg-white p-3 text-center shadow-xs"><p className="text-xl font-bold text-slate-900">{item.value === null ? '—' : item.value + '%'}</p><p className="mt-0.5 text-[9px] font-semibold text-slate-400">{item.label}</p></div>)}</div>{summary.averageCalorieDeviation !== null ? <p className="text-[10px] text-slate-400">Sai lệch calories trung bình: {whole.format(summary.averageCalorieDeviation)} kcal/ngày.</p> : null}</Section>
      <Section title="Lịch sử theo ngày" subtitle="Mỗi dòng là dữ liệu thật đã ghi trong ngày">
        {report.daily.length ? <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xs">{report.daily.slice(0, 20).map((day, index) => <button key={day.date} type="button" onClick={() => onOpenDay(day.date)} className={'flex w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-slate-50 ' + (index ? 'border-t border-slate-100' : '')}><div className="min-w-0"><p className="text-xs font-bold text-slate-800">{formatDate(day.date)}</p><div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-slate-400"><span>{day.mealCount} món</span><span>C {whole.format(day.carbs)}g</span><span>F {whole.format(day.fat)}g</span>{day.steps !== null ? <span>{whole.format(day.steps)} bước</span> : null}{day.weightKg !== null ? <span>{decimal.format(day.weightKg)} kg</span> : null}</div></div><div className="flex shrink-0 items-center gap-2"><p className="text-[10px] font-semibold text-slate-500">{whole.format(day.calories)} kcal · P {whole.format(day.protein)}g</p><ChevronRight className="h-4 w-4 text-slate-300" /></div></button>)}</div> : <EmptyState title="Chưa có dữ liệu trong khoảng này" />}
      </Section>
    </div>
  );
};

export const GymReportView: React.FC<{
  report: ExerciseDeepReport;
  range: ReportRange;
  onRange: (range: ReportRange) => void;
  onBack: () => void;
}> = ({ report, range, onRange, onBack }) => (
  <div className="mx-auto max-w-5xl space-y-5 pb-6">
    <DetailHeader title="Gym" subtitle="Báo cáo theo từng bài và lịch sử kg/reps" onBack={onBack} />
    <RangeControl value={range} onChange={onRange} />
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <MetricCard label="Ngày có tập" value={String(report.summary.activeDays)} icon={CalendarDays} />
      <MetricCard label="Lần ghi bài" value={String(report.summary.loggedEntries)} icon={Dumbbell} tone="bg-sky-50 text-sky-700" />
      <MetricCard label="Bài tiến bộ" value={String(report.summary.improvedExercises)} icon={TrendingUp} tone="bg-emerald-50 text-emerald-700" />
      <MetricCard label="Đang theo dõi" value={String(report.summary.trackedExercises)} icon={Target} tone="bg-violet-50 text-violet-700" />
    </div>
    <Section title="Theo từng bài tập" subtitle="Lịch sử chỉ lấy trong khoảng thời gian đã chọn">
      {report.exercises.length ? <div className="space-y-2.5">{report.exercises.map((item) => <div key={item.key} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-slate-900">{item.label}</p><p className="mt-0.5 text-[9px] text-slate-400">{item.history.length} lần ghi</p></div><div className="text-right text-[10px] font-bold text-slate-500">{item.latest?.weight || '—'} kg · {item.latest?.reps || '—'} reps</div></div><div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-[10px]"><span className="text-slate-400">Δ kg <strong className="ml-1 text-slate-700">{item.weightDelta === null ? '—' : (item.weightDelta > 0 ? '+' : '') + decimal.format(item.weightDelta)}</strong></span><span className="text-slate-400">Δ reps <strong className="ml-1 text-slate-700">{item.repsDelta === null ? '—' : (item.repsDelta > 0 ? '+' : '') + decimal.format(item.repsDelta)}</strong></span></div><div className="mt-3 overflow-x-auto"><div className="flex min-w-max gap-2">{item.history.slice(0, 8).map((entry) => <div key={entry.date} className="w-24 rounded-xl border border-slate-100 px-3 py-2"><p className="text-[9px] font-semibold text-slate-400">{formatDate(entry.date)}</p><p className="mt-1 text-[11px] font-bold text-slate-800">{entry.weight || '—'} kg</p><p className="text-[9px] text-slate-400">{entry.reps || '—'} reps</p></div>)}</div></div></div>)}</div> : <EmptyState title="Chưa có lịch sử gym trong khoảng này" />}
    </Section>
  </div>
);
