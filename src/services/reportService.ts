import type { Project, Task } from '../types';
import type { NutritionState } from './nutritionService';
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
  const totalsByDate = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();

  for (const entry of entries) {
    const current = totalsByDate.get(entry.date) || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    current.calories += entry.calories;
    current.protein += entry.protein;
    current.carbs += entry.carbs;
    current.fat += entry.fat;
    totalsByDate.set(entry.date, current);
  }

  const dayTotals = [...totalsByDate.values()];
  const loggedDays = dayTotals.length;
  const average = (key: 'calories' | 'protein' | 'carbs' | 'fat') =>
    loggedDays ? dayTotals.reduce((sum, value) => sum + value[key], 0) / loggedDays : null;

  const calorieTolerance = nutrition.profile.calorieTarget * 0.1;
  const calorieTargetDays = dayTotals.filter(
    (day) => Math.abs(day.calories - nutrition.profile.calorieTarget) <= calorieTolerance,
  ).length;
  const proteinTargetDays = dayTotals.filter((day) => day.protein >= nutrition.profile.proteinTarget).length;

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
  const averageCalorieDeviation = loggedDays
    ? dayTotals.reduce((sum, day) => sum + Math.abs(day.calories - nutrition.profile.calorieTarget), 0) / loggedDays
    : null;

  return {
    loggedDays,
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
    calorieAdherenceRate: loggedDays ? Math.round((calorieTargetDays / loggedDays) * 100) : null,
    proteinAdherenceRate: loggedDays ? Math.round((proteinTargetDays / loggedDays) * 100) : null,
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
