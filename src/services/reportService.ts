import type { Project, Task } from '../types';
import { getNutritionDayTracking, getTotals } from './nutritionService';
import type { MealType, NutritionEntry, NutritionState, NutritionTrackingMode } from './nutritionService';
import type { ReaderBook, ReaderSession } from './readerService';
import type { ExerciseLogEntry, ExerciseProgressStore } from './exerciseService';

export type ReportRange = '7d' | '30d' | 'all';

export interface ReportSummary {
  totalTasks: number;
  doneTasks: number;
  completionRate: number;
  overdueOpen: number;
  importantOpen: number;
  onTimeDone: number;
  deadlineDone: number;
  onTimeRate: number | null;
}

export interface DailyTaskActivity {
  date: string;
  planned: number;
  completed: number;
}

export interface ReportComparison {
  currentCompleted: number;
  previousCompleted: number;
  completedDelta: number;
  currentCompletionRate: number;
  previousCompletionRate: number;
  completionRateDelta: number;
}

export interface ProjectReportRow {
  project: Project;
  total: number;
  done: number;
  rate: number;
}

export interface NutritionReport {
  loggedDays: number;
  trackedDays: number;
  estimatedDays: number;
  incompleteDays: number;
  averageCalories: number | null;
  averageProtein: number | null;
  averageCarbs: number | null;
  averageFat: number | null;
  averageSteps: number | null;
  calorieTargetDays: number;
  proteinTargetDays: number;
  stepTargetDays: number;
  stepLoggedDays: number;
  latestWeightKg: number | null;
  weightChangeKg: number | null;
  calorieAdherenceRate: number | null;
  proteinAdherenceRate: number | null;
  stepAdherenceRate: number | null;
  averageCalorieDeviation: number | null;
}

export interface ReadingTimeWindow {
  key: 'late' | 'morning' | 'noon' | 'afternoon' | 'evening';
  label: string;
  seconds: number;
}

export interface ReadingReport {
  readingSeconds: number;
  listeningSeconds: number;
  totalSeconds: number;
  activeDays: number;
  booksTouched: number;
  sessionCount: number;
  longestSessionSeconds: number;
  averageSessionSeconds: number;
  favoriteTimeLabel: string | null;
  timeWindows: ReadingTimeWindow[];
}

export interface WorkTimeReport {
  actualMinutes: number;
  estimatedMinutes: number;
  loggedTasks: number;
  longestTaskTitle: string | null;
  longestTaskMinutes: number;
}

export interface ExerciseTrend {
  key: string;
  label: string;
  latest: ExerciseLogEntry;
  previous?: ExerciseLogEntry;
  weightDelta: number | null;
  repsDelta: number | null;
}

export interface ExerciseReport {
  activeDays: number;
  loggedEntries: number;
  trackedExercises: number;
  improvedExercises: number;
  trends: ExerciseTrend[];
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftIsoDate(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

export function getReportStart(range: ReportRange, today: string): string | undefined {
  if (range === '7d') return shiftIsoDate(today, -6);
  if (range === '30d') return shiftIsoDate(today, -29);
  return undefined;
}

export function inDateRange(value: string | undefined, start: string | undefined, end: string): boolean {
  if (!value) return false;
  const date = value.slice(0, 10);
  return (!start || date >= start) && date <= end;
}

function taskBelongsToRange(task: Task, start: string | undefined, end: string): boolean {
  if (!start) return true;
  const representativeDate = task.status === 'done' && task.completedAt
    ? task.completedAt
    : task.plannedDate || task.createdAt;
  return inDateRange(representativeDate, start, end);
}

function summarizeWindow(tasks: Task[], start: string, end: string) {
  const rangeTasks = tasks.filter((task) => taskBelongsToRange(task, start, end));
  const done = rangeTasks.filter((task) => task.status === 'done');
  return {
    total: rangeTasks.length,
    done: done.length,
    completionRate: rangeTasks.length ? Math.round((done.length / rangeTasks.length) * 100) : 0,
  };
}

export function buildReportSummary(tasks: Task[], range: ReportRange, today: string): ReportSummary {
  const start = getReportStart(range, today);
  const rangeTasks = tasks.filter((task) => taskBelongsToRange(task, start, today));
  const doneTasks = rangeTasks.filter((task) => task.status === 'done');
  const deadlineDoneTasks = doneTasks.filter((task) => task.deadline && task.completedAt);
  const onTimeDone = deadlineDoneTasks.filter(
    (task) => (task.completedAt || '').slice(0, 10) <= (task.deadline || '').slice(0, 10),
  ).length;

  return {
    totalTasks: rangeTasks.length,
    doneTasks: doneTasks.length,
    completionRate: rangeTasks.length ? Math.round((doneTasks.length / rangeTasks.length) * 100) : 0,
    overdueOpen: tasks.filter(
      (task) => task.status !== 'done' && Boolean(task.deadline) && (task.deadline || '').slice(0, 10) < today,
    ).length,
    importantOpen: tasks.filter(
      (task) => task.status !== 'done' && (task.priority === 'urgent' || task.priority === 'high'),
    ).length,
    onTimeDone,
    deadlineDone: deadlineDoneTasks.length,
    onTimeRate: deadlineDoneTasks.length ? Math.round((onTimeDone / deadlineDoneTasks.length) * 100) : null,
  };
}

export function buildPeriodComparison(tasks: Task[], range: ReportRange, today: string): ReportComparison | null {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : 30;
  const currentStart = shiftIsoDate(today, -(days - 1));
  const previousEnd = shiftIsoDate(currentStart, -1);
  const previousStart = shiftIsoDate(previousEnd, -(days - 1));
  const current = summarizeWindow(tasks, currentStart, today);
  const previous = summarizeWindow(tasks, previousStart, previousEnd);

  return {
    currentCompleted: current.done,
    previousCompleted: previous.done,
    completedDelta: current.done - previous.done,
    currentCompletionRate: current.completionRate,
    previousCompletionRate: previous.completionRate,
    completionRateDelta: current.completionRate - previous.completionRate,
  };
}

export function buildDailyTaskActivity(tasks: Task[], today: string, days = 7): DailyTaskActivity[] {
  const dates = Array.from({ length: days }, (_, index) => shiftIsoDate(today, index - (days - 1)));
  return dates.map((date) => ({
    date,
    planned: tasks.filter((task) => task.plannedDate?.slice(0, 10) === date).length,
    completed: tasks.filter((task) => task.completedAt?.slice(0, 10) === date).length,
  }));
}

export function buildProjectReport(projects: Project[], tasks: Task[], range: ReportRange, today: string): ProjectReportRow[] {
  const start = getReportStart(range, today);
  return projects
    .map((project) => {
      const related = tasks.filter((task) => task.projectId === project.id && taskBelongsToRange(task, start, today));
      const done = related.filter((task) => task.status === 'done').length;
      return {
        project,
        total: related.length,
        done,
        rate: related.length ? Math.round((done / related.length) * 100) : 0,
      };
    })
    .filter((row) => row.total > 0 || range === 'all')
    .sort((a, b) => b.total - a.total || b.rate - a.rate || a.project.name.localeCompare(b.project.name));
}

export function buildNutritionReport(nutrition: NutritionState, range: ReportRange, today: string): NutritionReport {
  const start = getReportStart(range, today);
  const entries = nutrition.entries.filter((entry) => inDateRange(entry.date, start, today));
  const entriesByDate = new Map<string, NutritionEntry[]>();

  for (const entry of entries) {
    const current = entriesByDate.get(entry.date) || [];
    current.push(entry);
    entriesByDate.set(entry.date, current);
  }

  const dayRows = [...entriesByDate.entries()].map(([date, dayEntries]) => ({
    date,
    tracking: getNutritionDayTracking(dayEntries),
    totals: getTotals(dayEntries),
  }));
  const loggedDays = dayRows.length;
  const incompleteDays = dayRows.filter((day) => day.tracking === 'untracked').length;
  const estimatedDays = dayRows.filter((day) => day.tracking === 'estimated').length;
  const trackedRows = dayRows.filter((day) => day.tracking !== 'untracked');
  const trackedDays = trackedRows.length;
  const average = (key: 'calories' | 'protein' | 'carbs' | 'fat') =>
    trackedDays ? trackedRows.reduce((sum, day) => sum + day.totals[key], 0) / trackedDays : null;

  const calorieTolerance = nutrition.profile.calorieTarget * 0.1;
  const calorieTargetDays = trackedRows.filter(
    (day) => Math.abs(day.totals.calories - nutrition.profile.calorieTarget) <= calorieTolerance,
  ).length;
  const proteinTargetDays = trackedRows.filter((day) => day.totals.protein >= nutrition.profile.proteinTarget).length;

  const metrics = nutrition.dailyMetrics
    .filter((metric) => inDateRange(metric.date, start, today))
    .sort((a, b) => a.date.localeCompare(b.date));
  const stepMetrics = metrics.filter((metric) => typeof metric.steps === 'number');
  const weightMetrics = metrics.filter((metric) => typeof metric.weightKg === 'number' && (metric.weightKg || 0) > 0);

  const averageSteps = stepMetrics.length
    ? stepMetrics.reduce((sum, metric) => sum + (metric.steps || 0), 0) / stepMetrics.length
    : null;
  const latestWeightKg = weightMetrics.length ? weightMetrics[weightMetrics.length - 1].weightKg || null : null;
  const weightChangeKg = weightMetrics.length >= 2
    ? (weightMetrics[weightMetrics.length - 1].weightKg || 0) - (weightMetrics[0].weightKg || 0)
    : null;

  const stepTargetDays = stepMetrics.filter((metric) => (metric.steps || 0) >= nutrition.profile.stepTarget).length;
  const averageCalorieDeviation = trackedDays
    ? trackedRows.reduce((sum, day) => sum + Math.abs(day.totals.calories - nutrition.profile.calorieTarget), 0) / trackedDays
    : null;

  return {
    loggedDays,
    trackedDays,
    estimatedDays,
    incompleteDays,
    averageCalories: average('calories'),
    averageProtein: average('protein'),
    averageCarbs: average('carbs'),
    averageFat: average('fat'),
    averageSteps,
    calorieTargetDays,
    proteinTargetDays,
    stepTargetDays,
    stepLoggedDays: stepMetrics.length,
    latestWeightKg,
    weightChangeKg,
    calorieAdherenceRate: trackedDays ? Math.round((calorieTargetDays / trackedDays) * 100) : null,
    proteinAdherenceRate: trackedDays ? Math.round((proteinTargetDays / trackedDays) * 100) : null,
    stepAdherenceRate: stepMetrics.length ? Math.round((stepTargetDays / stepMetrics.length) * 100) : null,
    averageCalorieDeviation,
  };
}

export function buildWorkTimeReport(tasks: Task[], range: ReportRange, today: string): WorkTimeReport {
  const start = getReportStart(range, today);
  const rangeTasks = tasks.filter((task) => taskBelongsToRange(task, start, today));
  const measured = rangeTasks.filter((task) => (Number(task.actualMinutes) || 0) > 0);
  const actualMinutes = measured.reduce((sum, task) => sum + Math.max(0, Number(task.actualMinutes) || 0), 0);
  const estimatedMinutes = measured.reduce((sum, task) => sum + Math.max(0, Number(task.estimatedMinutes) || 0), 0);
  const longest = [...measured].sort((a, b) => (b.actualMinutes || 0) - (a.actualMinutes || 0))[0];

  return {
    actualMinutes: Math.round(actualMinutes),
    estimatedMinutes: Math.round(estimatedMinutes),
    loggedTasks: measured.length,
    longestTaskTitle: longest?.title || null,
    longestTaskMinutes: Math.round(longest?.actualMinutes || 0),
  };
}

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const readingWindow = (startedAt: string): ReadingTimeWindow['key'] => {
  const date = new Date(Date.parse(startedAt) + VIETNAM_OFFSET_MS);
  const hour = date.getUTCHours();
  if (hour < 5) return 'late';
  if (hour < 11) return 'morning';
  if (hour < 14) return 'noon';
  if (hour < 18) return 'afternoon';
  return 'evening';
};

const sessionDate = (startedAt: string): string => {
  const date = new Date(Date.parse(startedAt) + VIETNAM_OFFSET_MS);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const readingWindowLabels: Record<ReadingTimeWindow['key'], string> = {
  late: 'Khuya · 00–05h',
  morning: 'Sáng · 05–11h',
  noon: 'Trưa · 11–14h',
  afternoon: 'Chiều · 14–18h',
  evening: 'Tối · 18–24h',
};

export function buildReadingReport(books: ReaderBook[], range: ReportRange, today: string): ReadingReport {
  const start = getReportStart(range, today);
  const inRange = (date: string) => (!start || date >= start) && date <= today;
  const activeDates = new Set<string>();
  let readingSeconds = 0;
  let listeningSeconds = 0;
  let booksTouched = 0;
  const sessions: ReaderSession[] = [];

  books.forEach((book) => {
    let bookSeconds = 0;
    Object.entries(book.readingSecondsByDate || {}).forEach(([date, seconds]) => {
      if (!inRange(date)) return;
      const value = Math.max(0, Number(seconds) || 0);
      readingSeconds += value;
      bookSeconds += value;
      if (value > 0) activeDates.add(date);
    });
    Object.entries(book.listeningSecondsByDate || {}).forEach(([date, seconds]) => {
      if (!inRange(date)) return;
      const value = Math.max(0, Number(seconds) || 0);
      listeningSeconds += value;
      bookSeconds += value;
      if (value > 0) activeDates.add(date);
    });
    (book.sessions || []).forEach((session) => {
      if (inRange(sessionDate(session.startedAt))) sessions.push(session);
    });
    if (bookSeconds > 0) booksTouched += 1;
  });

  readingSeconds = Math.round(readingSeconds);
  listeningSeconds = Math.round(listeningSeconds);

  const windowSeconds = new Map<ReadingTimeWindow['key'], number>([
    ['late', 0],
    ['morning', 0],
    ['noon', 0],
    ['afternoon', 0],
    ['evening', 0],
  ]);
  const sessionSeconds = sessions.map((session) => Math.max(0, session.readingSeconds + session.listeningSeconds));
  sessions.forEach((session) => {
    const key = readingWindow(session.startedAt);
    windowSeconds.set(key, (windowSeconds.get(key) || 0) + Math.max(0, session.readingSeconds + session.listeningSeconds));
  });
  const timeWindows = [...windowSeconds.entries()].map(([key, seconds]) => ({
    key,
    label: readingWindowLabels[key],
    seconds: Math.round(seconds),
  }));
  const favorite = [...timeWindows].sort((a, b) => b.seconds - a.seconds)[0];

  return {
    readingSeconds,
    listeningSeconds,
    totalSeconds: readingSeconds + listeningSeconds,
    activeDays: activeDates.size,
    booksTouched,
    sessionCount: sessions.length,
    longestSessionSeconds: sessionSeconds.length ? Math.round(Math.max(...sessionSeconds)) : 0,
    averageSessionSeconds: sessionSeconds.length
      ? Math.round(sessionSeconds.reduce((sum, value) => sum + value, 0) / sessionSeconds.length)
      : 0,
    favoriteTimeLabel: favorite && favorite.seconds > 0 ? favorite.label : null,
    timeWindows,
  };
}

function numeric(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function historyRows(progress: ExerciseProgressStore[string]): ExerciseLogEntry[] {
  const rows = [
    ...(Array.isArray(progress.history) ? progress.history : []),
    ...(progress.latest ? [progress.latest] : []),
    ...(progress.previous ? [progress.previous] : []),
  ];
  const byDate = new Map<string, ExerciseLogEntry>();
  rows.forEach((row) => {
    if (!row?.date) return;
    const current = byDate.get(row.date);
    byDate.set(row.date, {
      date: row.date,
      weight: row.weight || current?.weight || '',
      reps: row.reps || current?.reps || '',
    });
  });
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export function buildExerciseReport(progress: ExerciseProgressStore, range: ReportRange, today: string): ExerciseReport {
  const start = getReportStart(range, today);
  const inRange = (date: string) => (!start || date >= start) && date <= today;
  const activeDates = new Set<string>();
  let loggedEntries = 0;
  const trends: ExerciseTrend[] = [];

  Object.entries(progress).forEach(([key, exercise]) => {
    const history = historyRows(exercise);
    const rangeRows = history.filter((entry) => inRange(entry.date));
    rangeRows.forEach((entry) => activeDates.add(entry.date));
    loggedEntries += rangeRows.length;

    const latest = history[0];
    const previous = history[1];
    if (!latest || !inRange(latest.date)) return;
    const latestWeight = numeric(latest.weight);
    const previousWeight = numeric(previous?.weight);
    const latestReps = numeric(latest.reps);
    const previousReps = numeric(previous?.reps);
    trends.push({
      key,
      label: exercise.label || key,
      latest,
      previous,
      weightDelta: latestWeight !== null && previousWeight !== null ? latestWeight - previousWeight : null,
      repsDelta: latestReps !== null && previousReps !== null ? latestReps - previousReps : null,
    });
  });

  const improvedExercises = trends.filter((trend) =>
    (trend.weightDelta !== null && trend.weightDelta > 0)
    || (trend.weightDelta === 0 && trend.repsDelta !== null && trend.repsDelta > 0)
    || (trend.weightDelta === null && trend.repsDelta !== null && trend.repsDelta > 0)
  ).length;

  return {
    activeDays: activeDates.size,
    loggedEntries,
    trackedExercises: Object.keys(progress).length,
    improvedExercises,
    trends: [...trends]
      .sort((a, b) => b.latest.date.localeCompare(a.latest.date))
      .slice(0, 8),
  };
}


export interface ProjectDeepReport {
  project: Project;
  totalTasks: number;
  doneTasks: number;
  openTasks: number;
  completionRate: number;
  overdueOpen: number;
  importantOpen: number;
  deadlineDone: number;
  onTimeDone: number;
  onTimeRate: number | null;
  actualMinutes: number;
  estimatedMeasuredMinutes: number;
  measuredTasks: number;
  timeVarianceMinutes: number;
  milestoneTotal: number;
  milestoneDone: number;
  milestoneRate: number;
  statusBreakdown: {
    todo: number;
    inProgress: number;
    waiting: number;
    deferred: number;
    done: number;
  };
  priorityBreakdown: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  activity: DailyTaskActivity[];
  tasks: Task[];
}

export interface ReadingDailyActivity {
  date: string;
  readingSeconds: number;
  listeningSeconds: number;
  totalSeconds: number;
  sessionCount: number;
}

export interface ReadingSessionReport {
  id: string;
  bookId: string;
  bookTitle: string;
  startedAt: string;
  endedAt: string;
  readingSeconds: number;
  listeningSeconds: number;
  totalSeconds: number;
  mode: 'reading' | 'listening' | 'mixed';
}

export interface ReadingBookReport {
  book: ReaderBook;
  readingSeconds: number;
  listeningSeconds: number;
  totalSeconds: number;
  activeDays: number;
  sessionCount: number;
  longestSessionSeconds: number;
  averageSessionSeconds: number;
  progressPercent: number;
  dailyActivity: ReadingDailyActivity[];
  recentSessions: ReadingSessionReport[];
}

export interface ReadingDeepReport {
  summary: ReadingReport;
  readingSharePercent: number;
  listeningSharePercent: number;
  averageActiveDaySeconds: number;
  completedBooks: number;
  dailyActivity: ReadingDailyActivity[];
  books: ReadingBookReport[];
  recentSessions: ReadingSessionReport[];
}

export interface NutritionDailyReport {
  date: string;
  tracking: NutritionTrackingMode;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealCount: number;
  steps: number | null;
  weightKg: number | null;
  calorieTargetMet: boolean;
  proteinTargetMet: boolean;
  stepTargetMet: boolean | null;
}

export interface NutritionDeepReport {
  summary: NutritionReport;
  daily: NutritionDailyReport[];
}

export interface ExerciseDeepRow {
  key: string;
  label: string;
  history: ExerciseLogEntry[];
  latest?: ExerciseLogEntry;
  previous?: ExerciseLogEntry;
  weightDelta: number | null;
  repsDelta: number | null;
}

export interface ExerciseDeepReport {
  summary: ExerciseReport;
  exercises: ExerciseDeepRow[];
}

export function buildProjectDeepReport(
  project: Project,
  tasks: Task[],
  range: ReportRange,
  today: string,
): ProjectDeepReport {
  const start = getReportStart(range, today);
  const related = tasks.filter(
    (task) => task.projectId === project.id && taskBelongsToRange(task, start, today),
  );
  const done = related.filter((task) => task.status === 'done');
  const open = related.filter((task) => task.status !== 'done');
  const deadlineDone = done.filter((task) => task.deadline && task.completedAt);
  const onTimeDone = deadlineDone.filter(
    (task) => (task.completedAt || '').slice(0, 10) <= (task.deadline || '').slice(0, 10),
  ).length;
  const measured = related.filter((task) => (Number(task.actualMinutes) || 0) > 0);
  const actualMinutes = measured.reduce((sum, task) => sum + Math.max(0, Number(task.actualMinutes) || 0), 0);
  const estimatedMeasuredMinutes = measured.reduce(
    (sum, task) => sum + Math.max(0, Number(task.estimatedMinutes) || 0),
    0,
  );
  const milestoneTotal = project.milestones.length;
  const milestoneDone = project.milestones.filter((milestone) => milestone.completed).length;
  const activityDays = range === '7d' ? 7 : 14;

  return {
    project,
    totalTasks: related.length,
    doneTasks: done.length,
    openTasks: open.length,
    completionRate: related.length ? Math.round((done.length / related.length) * 100) : 0,
    overdueOpen: open.filter(
      (task) => Boolean(task.deadline) && (task.deadline || '').slice(0, 10) < today,
    ).length,
    importantOpen: open.filter((task) => task.priority === 'urgent' || task.priority === 'high').length,
    deadlineDone: deadlineDone.length,
    onTimeDone,
    onTimeRate: deadlineDone.length ? Math.round((onTimeDone / deadlineDone.length) * 100) : null,
    actualMinutes: Math.round(actualMinutes),
    estimatedMeasuredMinutes: Math.round(estimatedMeasuredMinutes),
    measuredTasks: measured.length,
    timeVarianceMinutes: Math.round(actualMinutes - estimatedMeasuredMinutes),
    milestoneTotal,
    milestoneDone,
    milestoneRate: milestoneTotal ? Math.round((milestoneDone / milestoneTotal) * 100) : 0,
    statusBreakdown: {
      todo: related.filter((task) => task.status === 'todo').length,
      inProgress: related.filter((task) => task.status === 'in_progress').length,
      waiting: related.filter((task) => task.status === 'waiting').length,
      deferred: related.filter((task) => task.status === 'deferred').length,
      done: done.length,
    },
    priorityBreakdown: {
      urgent: related.filter((task) => task.priority === 'urgent').length,
      high: related.filter((task) => task.priority === 'high').length,
      medium: related.filter((task) => task.priority === 'medium').length,
      low: related.filter((task) => task.priority === 'low').length,
    },
    activity: buildDailyTaskActivity(related, today, activityDays),
    tasks: [...related].sort((a, b) => {
      const aOpen = a.status === 'done' ? 1 : 0;
      const bOpen = b.status === 'done' ? 1 : 0;
      if (aOpen !== bOpen) return aOpen - bOpen;
      const aDate = (a.deadline || a.plannedDate || a.completedAt || a.createdAt).slice(0, 10);
      const bDate = (b.deadline || b.plannedDate || b.completedAt || b.createdAt).slice(0, 10);
      return bDate.localeCompare(aDate);
    }),
  };
}

function reportDates(range: ReportRange, today: string, activeDates: Set<string>): string[] {
  const start = getReportStart(range, today);
  if (!start) return [...activeDates].filter((date) => date <= today).sort();
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= today) {
    dates.push(cursor);
    cursor = shiftIsoDate(cursor, 1);
  }
  return dates;
}

function buildSessionReport(book: ReaderBook, session: ReaderSession): ReadingSessionReport {
  const totalSeconds = Math.max(0, session.readingSeconds + session.listeningSeconds);
  const mode = session.readingSeconds > 0 && session.listeningSeconds > 0
    ? 'mixed'
    : session.listeningSeconds > 0
      ? 'listening'
      : 'reading';
  return {
    id: session.id,
    bookId: book.id,
    bookTitle: book.title,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    readingSeconds: session.readingSeconds,
    listeningSeconds: session.listeningSeconds,
    totalSeconds,
    mode,
  };
}

export function buildReadingDeepReport(
  books: ReaderBook[],
  range: ReportRange,
  today: string,
): ReadingDeepReport {
  const summary = buildReadingReport(books, range, today);
  const start = getReportStart(range, today);
  const inRange = (date: string) => (!start || date >= start) && date <= today;
  const allActiveDates = new Set<string>();
  const dailyMap = new Map<string, ReadingDailyActivity>();
  const allSessions: ReadingSessionReport[] = [];

  const addDaily = (date: string, readingSeconds: number, listeningSeconds: number, sessionCount = 0) => {
    if (!inRange(date)) return;
    allActiveDates.add(date);
    const current = dailyMap.get(date) || {
      date,
      readingSeconds: 0,
      listeningSeconds: 0,
      totalSeconds: 0,
      sessionCount: 0,
    };
    current.readingSeconds += readingSeconds;
    current.listeningSeconds += listeningSeconds;
    current.totalSeconds = current.readingSeconds + current.listeningSeconds;
    current.sessionCount += sessionCount;
    dailyMap.set(date, current);
  };

  books.forEach((book) => {
    Object.entries(book.readingSecondsByDate || {}).forEach(([date, seconds]) => {
      const value = Math.max(0, Number(seconds) || 0);
      if (value > 0) addDaily(date, value, 0);
    });
    Object.entries(book.listeningSecondsByDate || {}).forEach(([date, seconds]) => {
      const value = Math.max(0, Number(seconds) || 0);
      if (value > 0) addDaily(date, 0, value);
    });
    (book.sessions || []).forEach((session) => {
      const date = sessionDate(session.startedAt);
      if (!inRange(date)) return;
      allSessions.push(buildSessionReport(book, session));
      const current = dailyMap.get(date) || {
        date,
        readingSeconds: 0,
        listeningSeconds: 0,
        totalSeconds: 0,
        sessionCount: 0,
      };
      current.sessionCount += 1;
      dailyMap.set(date, current);
      allActiveDates.add(date);
    });
  });

  const dates = reportDates(range, today, allActiveDates);
  const dailyActivity = dates.map((date) => dailyMap.get(date) || {
    date,
    readingSeconds: 0,
    listeningSeconds: 0,
    totalSeconds: 0,
    sessionCount: 0,
  });

  const bookReports = books.map((book): ReadingBookReport => {
    const activeDates = new Set<string>();
    let readingSeconds = 0;
    let listeningSeconds = 0;
    const bookDaily = new Map<string, ReadingDailyActivity>();

    const addBookDaily = (date: string, reading: number, listening: number) => {
      if (!inRange(date)) return;
      if (reading + listening > 0) activeDates.add(date);
      const current = bookDaily.get(date) || {
        date,
        readingSeconds: 0,
        listeningSeconds: 0,
        totalSeconds: 0,
        sessionCount: 0,
      };
      current.readingSeconds += reading;
      current.listeningSeconds += listening;
      current.totalSeconds = current.readingSeconds + current.listeningSeconds;
      bookDaily.set(date, current);
    };

    Object.entries(book.readingSecondsByDate || {}).forEach(([date, seconds]) => {
      if (!inRange(date)) return;
      const value = Math.max(0, Number(seconds) || 0);
      readingSeconds += value;
      addBookDaily(date, value, 0);
    });
    Object.entries(book.listeningSecondsByDate || {}).forEach(([date, seconds]) => {
      if (!inRange(date)) return;
      const value = Math.max(0, Number(seconds) || 0);
      listeningSeconds += value;
      addBookDaily(date, 0, value);
    });

    const sessions = (book.sessions || [])
      .filter((session) => inRange(sessionDate(session.startedAt)))
      .map((session) => buildSessionReport(book, session))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

    sessions.forEach((session) => {
      const date = sessionDate(session.startedAt);
      const current = bookDaily.get(date) || {
        date,
        readingSeconds: 0,
        listeningSeconds: 0,
        totalSeconds: 0,
        sessionCount: 0,
      };
      current.sessionCount += 1;
      bookDaily.set(date, current);
      activeDates.add(date);
    });

    const sessionDurations = sessions.map((session) => session.totalSeconds);
    const bookDates = reportDates(range, today, activeDates);

    return {
      book,
      readingSeconds: Math.round(readingSeconds),
      listeningSeconds: Math.round(listeningSeconds),
      totalSeconds: Math.round(readingSeconds + listeningSeconds),
      activeDays: activeDates.size,
      sessionCount: sessions.length,
      longestSessionSeconds: sessionDurations.length ? Math.max(...sessionDurations) : 0,
      averageSessionSeconds: sessionDurations.length
        ? Math.round(sessionDurations.reduce((sum, seconds) => sum + seconds, 0) / sessionDurations.length)
        : 0,
      progressPercent: Math.round(Math.min(1, Math.max(0, book.overallProgress || 0)) * 100),
      dailyActivity: bookDates.map((date) => bookDaily.get(date) || {
        date,
        readingSeconds: 0,
        listeningSeconds: 0,
        totalSeconds: 0,
        sessionCount: 0,
      }),
      recentSessions: sessions.slice(0, 20),
    };
  }).sort((a, b) => b.totalSeconds - a.totalSeconds || b.book.lastOpenedAt.localeCompare(a.book.lastOpenedAt));

  const recentSessions = [...allSessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 30);
  const total = Math.max(1, summary.totalSeconds);

  return {
    summary,
    readingSharePercent: summary.totalSeconds ? Math.round((summary.readingSeconds / total) * 100) : 0,
    listeningSharePercent: summary.totalSeconds ? Math.round((summary.listeningSeconds / total) * 100) : 0,
    averageActiveDaySeconds: summary.activeDays ? Math.round(summary.totalSeconds / summary.activeDays) : 0,
    completedBooks: books.filter((book) => (book.overallProgress || 0) >= 0.995).length,
    dailyActivity,
    books: bookReports,
    recentSessions,
  };
}

export function buildNutritionDeepReport(
  nutrition: NutritionState,
  range: ReportRange,
  today: string,
): NutritionDeepReport {
  const summary = buildNutritionReport(nutrition, range, today);
  const start = getReportStart(range, today);
  const entries = nutrition.entries.filter((entry) => inDateRange(entry.date, start, today));
  const metrics = new Map(
    nutrition.dailyMetrics
      .filter((metric) => inDateRange(metric.date, start, today))
      .map((metric) => [metric.date, metric]),
  );
  const entriesByDate = new Map<string, NutritionEntry[]>();

  entries.forEach((entry) => {
    const current = entriesByDate.get(entry.date) || [];
    current.push(entry);
    entriesByDate.set(entry.date, current);
  });

  const dates = new Set<string>([...entriesByDate.keys(), ...metrics.keys()]);
  const calorieTolerance = nutrition.profile.calorieTarget * 0.1;
  const daily = [...dates]
    .map((date): NutritionDailyReport => {
      const dayEntries = entriesByDate.get(date) || [];
      const totals = getTotals(dayEntries);
      const tracking = getNutritionDayTracking(dayEntries);
      const metric = metrics.get(date);
      const hasCompleteNutrition = dayEntries.length > 0 && tracking !== 'untracked';
      return {
        date,
        tracking,
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        mealCount: dayEntries.length,
        steps: metric?.steps ?? null,
        weightKg: metric?.weightKg ?? null,
        calorieTargetMet: hasCompleteNutrition
          && Math.abs(totals.calories - nutrition.profile.calorieTarget) <= calorieTolerance,
        proteinTargetMet: hasCompleteNutrition && totals.protein >= nutrition.profile.proteinTarget,
        stepTargetMet: metric?.steps === undefined ? null : metric.steps >= nutrition.profile.stepTarget,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return { summary, daily };
}

export function buildExerciseDeepReport(
  progress: ExerciseProgressStore,
  range: ReportRange,
  today: string,
): ExerciseDeepReport {
  const summary = buildExerciseReport(progress, range, today);
  const start = getReportStart(range, today);
  const inRange = (date: string) => (!start || date >= start) && date <= today;
  const exercises = Object.entries(progress)
    .map(([key, exercise]): ExerciseDeepRow => {
      const history = historyRows(exercise).filter((entry) => inRange(entry.date));
      const latest = history[0];
      const previous = history[1];
      const latestWeight = numeric(latest?.weight);
      const previousWeight = numeric(previous?.weight);
      const latestReps = numeric(latest?.reps);
      const previousReps = numeric(previous?.reps);
      return {
        key,
        label: exercise.label || key,
        history,
        latest,
        previous,
        weightDelta: latestWeight !== null && previousWeight !== null
          ? latestWeight - previousWeight
          : null,
        repsDelta: latestReps !== null && previousReps !== null
          ? latestReps - previousReps
          : null,
      };
    })
    .filter((exercise) => exercise.history.length > 0)
    .sort((a, b) => (b.latest?.date || '').localeCompare(a.latest?.date || ''));

  return { summary, exercises };
}


export interface ReadingDayBookActivity {
  bookId: string;
  title: string;
  author?: string;
  readingSeconds: number;
  listeningSeconds: number;
  totalSeconds: number;
  sessionCount: number;
}

export interface ReadingDayReport {
  date: string;
  readingSeconds: number;
  listeningSeconds: number;
  totalSeconds: number;
  sessionCount: number;
  longestSessionSeconds: number;
  books: ReadingDayBookActivity[];
  sessions: ReadingSessionReport[];
}

export interface NutritionMealReport {
  meal: MealType;
  tracking: NutritionTrackingMode;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: NutritionEntry[];
}

export interface NutritionDayReport {
  date: string;
  tracking: NutritionTrackingMode;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  itemCount: number;
  steps: number | null;
  weightKg: number | null;
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  stepTarget: number;
  calorieDelta: number;
  proteinDelta: number;
  caloriePercent: number;
  proteinPercent: number;
  carbPercent: number;
  fatPercent: number;
  stepPercent: number | null;
  meals: NutritionMealReport[];
}

export function buildReadingDayReport(books: ReaderBook[], date: string): ReadingDayReport {
  let readingSeconds = 0;
  let listeningSeconds = 0;
  const sessions: ReadingSessionReport[] = [];
  const bookRows: ReadingDayBookActivity[] = [];

  books.forEach((book) => {
    const bookReading = Math.max(0, Number(book.readingSecondsByDate?.[date]) || 0);
    const bookListening = Math.max(0, Number(book.listeningSecondsByDate?.[date]) || 0);
    const bookSessions = (book.sessions || [])
      .filter((session) => sessionDate(session.startedAt) === date)
      .map((session) => buildSessionReport(book, session))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

    readingSeconds += bookReading;
    listeningSeconds += bookListening;
    sessions.push(...bookSessions);

    if (bookReading + bookListening > 0 || bookSessions.length > 0) {
      bookRows.push({
        bookId: book.id,
        title: book.title,
        author: book.author,
        readingSeconds: Math.round(bookReading),
        listeningSeconds: Math.round(bookListening),
        totalSeconds: Math.round(bookReading + bookListening),
        sessionCount: bookSessions.length,
      });
    }
  });

  const sortedSessions = sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const longestSessionSeconds = sortedSessions.length
    ? Math.max(...sortedSessions.map((session) => session.totalSeconds))
    : 0;

  return {
    date,
    readingSeconds: Math.round(readingSeconds),
    listeningSeconds: Math.round(listeningSeconds),
    totalSeconds: Math.round(readingSeconds + listeningSeconds),
    sessionCount: sortedSessions.length,
    longestSessionSeconds,
    books: bookRows.sort((a, b) => b.totalSeconds - a.totalSeconds || a.title.localeCompare(b.title)),
    sessions: sortedSessions,
  };
}

export function buildNutritionDayReport(nutrition: NutritionState, date: string): NutritionDayReport {
  const entries = nutrition.entries
    .filter((entry) => entry.date === date)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const metric = nutrition.dailyMetrics.find((item) => item.date === date);
  const mealOrder: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const meals = mealOrder
    .map((meal): NutritionMealReport => {
      const items = entries.filter((entry) => entry.meal === meal);
      const totals = getTotals(items);
      return {
        meal,
        tracking: getNutritionDayTracking(items),
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        items,
      };
    })
    .filter((meal) => meal.items.length > 0);

  const totals = getTotals(entries);
  const tracking = getNutritionDayTracking(entries);
  const percent = (value: number, target: number) => target > 0 ? Math.round((value / target) * 100) : 0;

  return {
    date,
    tracking,
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    itemCount: entries.length,
    steps: metric?.steps ?? null,
    weightKg: metric?.weightKg ?? null,
    calorieTarget: nutrition.profile.calorieTarget,
    proteinTarget: nutrition.profile.proteinTarget,
    carbTarget: nutrition.profile.carbTarget,
    fatTarget: nutrition.profile.fatTarget,
    stepTarget: nutrition.profile.stepTarget,
    calorieDelta: totals.calories - nutrition.profile.calorieTarget,
    proteinDelta: totals.protein - nutrition.profile.proteinTarget,
    caloriePercent: percent(totals.calories, nutrition.profile.calorieTarget),
    proteinPercent: percent(totals.protein, nutrition.profile.proteinTarget),
    carbPercent: percent(totals.carbs, nutrition.profile.carbTarget),
    fatPercent: percent(totals.fat, nutrition.profile.fatTarget),
    stepPercent: metric?.steps === undefined ? null : percent(metric.steps, nutrition.profile.stepTarget),
    meals,
  };
}
