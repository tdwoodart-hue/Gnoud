import type { Habit, Project, Task } from '../types';
import type { NutritionState } from './nutritionService';

export type ReportRange = '7d' | '30d' | 'all';

export interface ReportSummary {
  totalTasks: number;
  doneTasks: number;
  completionRate: number;
  focusMinutes: number;
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
  focusMinutes: number;
}

export interface ProjectReportRow {
  project: Project;
  total: number;
  done: number;
  rate: number;
  focusMinutes: number;
}

export interface HabitReportRow {
  habit: Habit;
  completed: number;
  target: number;
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
  const representativeDate =
    task.status === 'done' && task.completedAt
      ? task.completedAt
      : task.plannedDate || task.createdAt;
  return inDateRange(representativeDate, start, end);
}

export function buildReportSummary(
  tasks: Task[],
  range: ReportRange,
  today: string,
): ReportSummary {
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
    focusMinutes: Math.round(rangeTasks.reduce((sum, task) => sum + (task.actualMinutes || 0), 0)),
    overdueOpen: tasks.filter(
      (task) => task.status !== 'done' && Boolean(task.deadline) && (task.deadline || '').slice(0, 10) < today,
    ).length,
    importantOpen: tasks.filter(
      (task) => task.status !== 'done' && (task.priority === 'urgent' || task.priority === 'high'),
    ).length,
    onTimeDone,
    deadlineDone: deadlineDoneTasks.length,
    onTimeRate: deadlineDoneTasks.length
      ? Math.round((onTimeDone / deadlineDoneTasks.length) * 100)
      : null,
  };
}

export function buildDailyTaskActivity(tasks: Task[], today: string, days = 7): DailyTaskActivity[] {
  const dates = Array.from({ length: days }, (_, index) => shiftIsoDate(today, index - (days - 1)));

  return dates.map((date) => {
    const planned = tasks.filter((task) => task.plannedDate?.slice(0, 10) === date).length;
    const completed = tasks.filter((task) => task.completedAt?.slice(0, 10) === date).length;
    const focusMinutes = tasks
      .filter((task) => (task.completedAt || task.plannedDate || task.createdAt)?.slice(0, 10) === date)
      .reduce((sum, task) => sum + (task.actualMinutes || 0), 0);

    return { date, planned, completed, focusMinutes: Math.round(focusMinutes) };
  });
}

export function buildProjectReport(
  projects: Project[],
  tasks: Task[],
  range: ReportRange,
  today: string,
): ProjectReportRow[] {
  const start = getReportStart(range, today);

  return projects
    .map((project) => {
      const related = tasks.filter(
        (task) => task.projectId === project.id && taskBelongsToRange(task, start, today),
      );
      const done = related.filter((task) => task.status === 'done').length;
      return {
        project,
        total: related.length,
        done,
        rate: related.length ? Math.round((done / related.length) * 100) : 0,
        focusMinutes: Math.round(related.reduce((sum, task) => sum + (task.actualMinutes || 0), 0)),
      };
    })
    .filter((row) => row.total > 0 || range === 'all')
    .sort((a, b) => b.total - a.total || b.rate - a.rate || a.project.name.localeCompare(b.project.name));
}

export function buildHabitReport(habits: Habit[], today: string, days = 7): HabitReportRow[] {
  const start = shiftIsoDate(today, -(days - 1));
  return habits
    .map((habit) => {
      const completed = (habit.completedDates || []).filter((date) => inDateRange(date, start, today)).length;
      const weeklyTarget = Math.max(1, Math.min(7, habit.targetDaysPerWeek || 7));
      const target = days === 7 ? weeklyTarget : Math.max(1, Math.round((weeklyTarget / 7) * days));
      return {
        habit,
        completed,
        target,
        rate: Math.min(100, Math.round((completed / target) * 100)),
      };
    })
    .sort((a, b) => b.rate - a.rate || b.habit.streak - a.habit.streak || a.habit.name.localeCompare(b.habit.name));
}

export function buildNutritionReport(
  nutrition: NutritionState,
  range: ReportRange,
  today: string,
): NutritionReport {
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

  return {
    loggedDays,
    averageCalories: average('calories'),
    averageProtein: average('protein'),
    averageCarbs: average('carbs'),
    averageFat: average('fat'),
    averageSteps,
    calorieTargetDays,
    proteinTargetDays,
    stepTargetDays: stepMetrics.filter((metric) => (metric.steps || 0) >= nutrition.profile.stepTarget).length,
    stepLoggedDays: stepMetrics.length,
    latestWeightKg,
    weightChangeKg,
  };
}
