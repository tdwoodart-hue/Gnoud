
import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, BookOpen, ChevronRight, Dumbbell, UtensilsCrossed } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { loadNutritionState, type NutritionState } from '../../services/nutritionService';
import {
  buildDailyTaskActivity,
  buildExerciseDeepReport,
  buildNutritionDayReport,
  buildNutritionDeepReport,
  buildPeriodComparison,
  buildProjectDeepReport,
  buildProjectReport,
  buildReadingDayReport,
  buildReadingDeepReport,
  buildReportSummary,
  buildWorkTimeReport,
  formatLocalDate,
  type ReportRange,
} from '../../services/reportService';
import { PageHeader } from '../common/PageHeader';
import { EmptyState } from '../common/EmptyState';
import { loadReaderLibrary, type ReaderBook } from '../../services/readerService';
import { fetchCloudReaderBooks, mergeReaderLibraries } from '../../services/readerCloudService';
import { loadExerciseProgress, type ExerciseProgressStore } from '../../services/exerciseService';
import { DomainButton, formatDuration, formatMinutes, ProgressBar, RangeControl, Section } from './reportUi';
import { BookReportView, GymReportView, NutritionDayReportView, NutritionReportView, ProjectReportView, ReadingDayReportView, ReadingReportView, WorkReportView } from './ReportDetailViews';

type ReportPage = 'overview' | 'work' | 'project' | 'reading' | 'reading-day' | 'book' | 'nutrition' | 'nutrition-day' | 'gym';

export const ReportsView: React.FC = () => {
  const { tasks, projects, user } = useApp();
  const [page, setPage] = useState<ReportPage>('overview');
  const [range, setRange] = useState<ReportRange>('7d');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedReadingDate, setSelectedReadingDate] = useState<string | null>(null);
  const [selectedNutritionDate, setSelectedNutritionDate] = useState<string | null>(null);
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
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    refresh();
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
        // Dùng dữ liệu local nếu cloud tạm thời không truy cập được.
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
  const activity = useMemo(() => buildDailyTaskActivity(tasks, today, range === '7d' ? 7 : 14), [tasks, today, range]);
  const projectRows = useMemo(() => buildProjectReport(projects, tasks, range, today), [projects, tasks, range, today]);
  const workTime = useMemo(() => buildWorkTimeReport(tasks, range, today), [tasks, range, today]);
  const reading = useMemo(() => buildReadingDeepReport(readerBooks, range, today), [readerBooks, range, today]);
  const nutritionReport = useMemo(() => buildNutritionDeepReport(nutrition, range, today), [nutrition, range, today]);
  const exercise = useMemo(() => buildExerciseDeepReport(exerciseProgress, range, today), [exerciseProgress, range, today]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || null;
  const projectReport = useMemo(
    () => selectedProject ? buildProjectDeepReport(selectedProject, tasks, range, today) : null,
    [selectedProject, tasks, range, today],
  );
  const selectedBook = reading.books.find((item) => item.book.id === selectedBookId) || null;
  const readingDay = useMemo(
    () => selectedReadingDate ? buildReadingDayReport(readerBooks, selectedReadingDate) : null,
    [readerBooks, selectedReadingDate],
  );
  const nutritionDay = useMemo(
    () => selectedNutritionDate ? buildNutritionDayReport(nutrition, selectedNutritionDate) : null,
    [nutrition, selectedNutritionDate],
  );

  const openProject = (id: string) => {
    setSelectedProjectId(id);
    setPage('project');
  };

  const openBook = (id: string) => {
    setSelectedBookId(id);
    setPage('book');
  };

  const openReadingDay = (date: string) => {
    setSelectedReadingDate(date);
    setPage('reading-day');
  };

  const openNutritionDay = (date: string) => {
    setSelectedNutritionDate(date);
    setPage('nutrition-day');
  };

  if (page === 'work') return <WorkReportView summary={summary} comparison={comparison} workTime={workTime} activity={activity} projects={projectRows} range={range} onRange={setRange} onBack={() => setPage('overview')} onOpenProject={openProject} />;
  if (page === 'project' && projectReport) return <ProjectReportView report={projectReport} range={range} onRange={setRange} onBack={() => setPage('work')} />;
  if (page === 'reading') return <ReadingReportView report={reading} range={range} onRange={setRange} onBack={() => setPage('overview')} onOpenBook={openBook} onOpenDay={openReadingDay} />;
  if (page === 'reading-day' && readingDay) return <ReadingDayReportView report={readingDay} onBack={() => setPage('reading')} onOpenBook={openBook} />;
  if (page === 'book' && selectedBook) return <BookReportView report={selectedBook} range={range} onRange={setRange} onBack={() => setPage('reading')} />;
  if (page === 'nutrition') return <NutritionReportView report={nutritionReport} range={range} onRange={setRange} onBack={() => setPage('overview')} onOpenDay={openNutritionDay} />;
  if (page === 'nutrition-day' && nutritionDay) return <NutritionDayReportView report={nutritionDay} onBack={() => setPage('nutrition')} />;
  if (page === 'gym') return <GymReportView report={exercise} range={range} onRange={setRange} onBack={() => setPage('overview')} />;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-6">
      <PageHeader title="Báo cáo" />
      <p className="-mt-3 text-[11px] leading-5 text-slate-400">Chọn một lĩnh vực để xem phân tích chuyên sâu. Báo cáo dự án được tách riêng để không trộn số liệu.</p>
      <RangeControl value={range} onChange={setRange} />
      <div className="grid grid-cols-2 gap-2.5">
        <DomainButton title="Công việc" value={summary.completionRate + '%'} meta={summary.doneTasks + '/' + summary.totalTasks + ' việc · ' + formatMinutes(workTime.actualMinutes) + ' Focus'} icon={BarChart3} tone="bg-indigo-50 text-indigo-600" onClick={() => setPage('work')} />
        <DomainButton title="Đọc sách" value={formatDuration(reading.summary.totalSeconds)} meta={reading.summary.activeDays + ' ngày · ' + reading.summary.sessionCount + ' phiên'} icon={BookOpen} tone="bg-violet-50 text-violet-700" onClick={() => setPage('reading')} />
        <DomainButton title="Dinh dưỡng" value={nutritionReport.summary.loggedDays + ' ngày'} meta={nutritionReport.summary.proteinAdherenceRate === null ? 'Chưa đủ dữ liệu' : 'Protein đạt ' + nutritionReport.summary.proteinAdherenceRate + '% ngày'} icon={UtensilsCrossed} tone="bg-emerald-50 text-emerald-700" onClick={() => setPage('nutrition')} />
        <DomainButton title="Gym" value={exercise.summary.activeDays + ' ngày'} meta={exercise.summary.improvedExercises + ' bài tiến bộ · ' + exercise.summary.loggedEntries + ' lần ghi'} icon={Dumbbell} tone="bg-sky-50 text-sky-700" onClick={() => setPage('gym')} />
      </div>
      <Section title="Báo cáo theo dự án" subtitle="Mỗi dự án là một báo cáo riêng">
        {projectRows.length ? (
          <div className="space-y-2">
            {projectRows.map((row) => (
              <button key={row.project.id} type="button" onClick={() => openProject(row.project.id)} className="w-full rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-xs active:bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.project.color || '#6366f1' }} /><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{row.project.name}</p><p className="mt-0.5 text-[9px] text-slate-400">{row.done}/{row.total} việc hoàn thành</p></div></div>
                  <div className="flex shrink-0 items-center gap-2"><span className="text-xs font-bold text-slate-600">{row.rate}%</span><ChevronRight className="h-4 w-4 text-slate-300" /></div>
                </div>
                <div className="mt-3"><ProgressBar value={row.rate} /></div>
              </button>
            ))}
          </div>
        ) : <EmptyState title="Chưa có dự án để phân tích" />}
      </Section>
      <div className="rounded-2xl bg-slate-50 p-3 text-[9px] leading-4 text-slate-400">Báo cáo chỉ dùng dữ liệu Gnoud đã thực sự lưu. Các chỉ số session Reader bắt đầu từ v0.9.19; app không tự suy đoán dữ liệu lịch sử chưa từng được ghi.</div>
    </div>
  );
};
