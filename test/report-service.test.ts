import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDailyTaskActivity,
  buildExerciseDeepReport,
  buildExerciseReport,
  buildNutritionDeepReport,
  buildNutritionReport,
  buildPeriodComparison,
  buildReadingDeepReport,
  buildReadingReport,
  buildWorkTimeReport,
  buildProjectDeepReport,
  buildProjectReport,
  buildReportSummary,
  getReportStart,
} from '../src/services/reportService';
import type { Project, Task } from '../src/types';
import type { NutritionState } from '../src/services/nutritionService';
import { updateExerciseProgress } from '../src/services/exerciseService';
import { createReaderBook } from '../src/services/readerService';

const task = (partial: Partial<Task>): Task => ({
  id: partial.id || `task-${Math.random()}`,
  title: partial.title || 'Task',
  category: 'work',
  status: 'todo',
  priority: 'medium',
  estimatedMinutes: 60,
  actualMinutes: 0,
  subtasks: [],
  tags: [],
  createdAt: '2026-09-01',
  ...partial,
});

test('report range uses inclusive 7 and 30 day windows', () => {
  assert.equal(getReportStart('7d', '2026-09-19'), '2026-09-13');
  assert.equal(getReportStart('30d', '2026-09-19'), '2026-08-21');
  assert.equal(getReportStart('all', '2026-09-19'), undefined);
});

test('summary keeps only measured task metrics', () => {
  const tasks = [
    task({ id: 'a', plannedDate: '2026-09-18', status: 'done', completedAt: '2026-09-18', deadline: '2026-09-18' }),
    task({ id: 'b', plannedDate: '2026-09-19', status: 'done', completedAt: '2026-09-19', deadline: '2026-09-18' }),
    task({ id: 'c', plannedDate: '2026-09-19', status: 'todo', deadline: '2026-09-18', priority: 'high' }),
    task({ id: 'old', plannedDate: '2026-08-01', status: 'done', completedAt: '2026-08-01' }),
  ];
  const result = buildReportSummary(tasks, '7d', '2026-09-19');
  assert.equal(result.totalTasks, 3);
  assert.equal(result.doneTasks, 2);
  assert.equal(result.completionRate, 67);
  assert.equal(result.deadlineDone, 2);
  assert.equal(result.onTimeDone, 1);
  assert.equal(result.onTimeRate, 50);
  assert.equal(result.overdueOpen, 1);
  assert.equal(result.importantOpen, 1);
});

test('period comparison compares completion with the previous equal range', () => {
  const tasks = [
    task({ id: 'current-a', plannedDate: '2026-09-19', status: 'done', completedAt: '2026-09-19' }),
    task({ id: 'current-b', plannedDate: '2026-09-18', status: 'done', completedAt: '2026-09-18' }),
    task({ id: 'current-open', plannedDate: '2026-09-17', status: 'todo' }),
    task({ id: 'previous-a', plannedDate: '2026-09-12', status: 'done', completedAt: '2026-09-12' }),
    task({ id: 'previous-open', plannedDate: '2026-09-11', status: 'todo' }),
  ];
  const result = buildPeriodComparison(tasks, '7d', '2026-09-19');
  assert.ok(result);
  assert.equal(result?.currentCompleted, 2);
  assert.equal(result?.previousCompleted, 1);
  assert.equal(result?.completedDelta, 1);
  assert.equal(result?.currentCompletionRate, 67);
  assert.equal(result?.previousCompletionRate, 50);
  assert.equal(result?.completionRateDelta, 17);
  assert.equal(buildPeriodComparison(tasks, 'all', '2026-09-19'), null);
});

test('daily activity counts only planned and completed work', () => {
  const tasks = [
    task({ id: 'a', plannedDate: '2026-09-19', status: 'done', completedAt: '2026-09-19' }),
    task({ id: 'b', plannedDate: '2026-09-19' }),
    task({ id: 'c', plannedDate: '2026-09-18', status: 'done', completedAt: '2026-09-19' }),
  ];
  const rows = buildDailyTaskActivity(tasks, '2026-09-19', 2);
  assert.deepEqual(rows.map((row) => row.date), ['2026-09-18', '2026-09-19']);
  assert.equal(rows[1].planned, 2);
  assert.equal(rows[1].completed, 2);
});

test('project report only includes tasks inside selected range', () => {
  const projects: Project[] = [{
    id: 'p1', name: 'Gym', description: '', category: 'personal', color: '#000', milestones: [], recentActivity: [],
  }];
  const tasks = [
    task({ id: 'a', projectId: 'p1', plannedDate: '2026-09-19', status: 'done', completedAt: '2026-09-19' }),
    task({ id: 'b', projectId: 'p1', plannedDate: '2026-09-18', status: 'todo' }),
    task({ id: 'c', projectId: 'p1', plannedDate: '2026-08-01', status: 'done', completedAt: '2026-08-01' }),
  ];
  const rows = buildProjectReport(projects, tasks, '7d', '2026-09-19');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].total, 2);
  assert.equal(rows[0].done, 1);
  assert.equal(rows[0].rate, 50);
});

test('nutrition report averages only logged days and tracks target adherence', () => {
  const nutrition: NutritionState = {
    profile: {
      sex: 'male', age: 22, heightCm: 169, weightKg: 65.5, activityLevel: 'desk_training', goal: 'recomp',
      calorieTarget: 2100, proteinTarget: 130, carbTarget: 270, fatTarget: 55, stepTarget: 8000,
    },
    entries: [
      { id: '1', date: '2026-09-18', name: 'A', meal: 'lunch', calories: 2050, protein: 135, carbs: 250, fat: 55, createdAt: 'x' },
      { id: '2', date: '2026-09-19', name: 'B', meal: 'dinner', calories: 1900, protein: 100, carbs: 230, fat: 60, createdAt: 'x' },
      { id: 'old', date: '2026-08-01', name: 'Old', meal: 'lunch', calories: 4000, protein: 300, carbs: 300, fat: 100, createdAt: 'x' },
    ],
    dailyMetrics: [
      { date: '2026-09-18', steps: 9000, weightKg: 65.5, updatedAt: 'x' },
      { date: '2026-09-19', steps: 7000, weightKg: 65.2, updatedAt: 'x' },
    ],
  };
  const result = buildNutritionReport(nutrition, '7d', '2026-09-19');
  assert.equal(result.loggedDays, 2);
  assert.equal(result.averageCalories, 1975);
  assert.equal(result.averageProtein, 117.5);
  assert.equal(result.calorieTargetDays, 2);
  assert.equal(result.proteinTargetDays, 1);
  assert.equal(result.averageSteps, 8000);
  assert.equal(result.stepTargetDays, 1);
  assert.equal(result.latestWeightKg, 65.2);
  assert.ok(Math.abs((result.weightChangeKg || 0) - (-0.3)) < 1e-9);
});


test('reading report exposes real session windows and longest session', () => {
  const book = createReaderBook({ title: 'Reader', content: 'abc' });
  book.readingSecondsByDate = { '2026-09-19': 1800 };
  book.sessions = [
    { id: 's1', startedAt: '2026-09-19T13:00:00.000Z', endedAt: '2026-09-19T13:20:00.000Z', readingSeconds: 1200, listeningSeconds: 0 },
    { id: 's2', startedAt: '2026-09-19T15:00:00.000Z', endedAt: '2026-09-19T15:10:00.000Z', readingSeconds: 600, listeningSeconds: 0 },
  ];
  const report = buildReadingReport([book], '7d', '2026-09-19');
  assert.equal(report.sessionCount, 2);
  assert.equal(report.longestSessionSeconds, 1200);
  assert.match(report.favoriteTimeLabel || '', /Tối/);
});

test('work time report uses only measured actual minutes', () => {
  const report = buildWorkTimeReport([
    task({ id: 'a', plannedDate: '2026-09-19', actualMinutes: 35, estimatedMinutes: 30 }),
    task({ id: 'b', plannedDate: '2026-09-19', actualMinutes: 0, estimatedMinutes: 60 }),
  ], '7d', '2026-09-19');
  assert.equal(report.actualMinutes, 35);
  assert.equal(report.estimatedMinutes, 30);
  assert.equal(report.loggedTasks, 1);
});

test('exercise report counts dates and improvements from full history', () => {
  let progress = updateExerciseProgress({}, 'Bench Press', '2026-09-10', { weight: 40, reps: 10 });
  progress = updateExerciseProgress(progress, 'Bench Press', '2026-09-19', { weight: 45, reps: 8 });
  const report = buildExerciseReport(progress, '30d', '2026-09-19');
  assert.equal(report.activeDays, 2);
  assert.equal(report.loggedEntries, 2);
  assert.equal(report.improvedExercises, 1);
});


test('project deep report exposes deadlines, focus time, milestones and status breakdown', () => {
  const project: Project = {
    id: 'p-deep',
    name: 'Launch',
    description: '',
    category: 'work',
    color: '#6366f1',
    targetDate: '2026-09-30',
    milestones: [
      { id: 'm1', title: 'A', completed: true },
      { id: 'm2', title: 'B', completed: false },
    ],
    recentActivity: [],
  };
  const tasks = [
    task({ id: 'a', projectId: project.id, plannedDate: '2026-09-18', status: 'done', completedAt: '2026-09-18', deadline: '2026-09-18', actualMinutes: 70, estimatedMinutes: 60 }),
    task({ id: 'b', projectId: project.id, plannedDate: '2026-09-19', status: 'in_progress', priority: 'high', deadline: '2026-09-18', actualMinutes: 30, estimatedMinutes: 45 }),
  ];
  const report = buildProjectDeepReport(project, tasks, '7d', '2026-09-19');
  assert.equal(report.totalTasks, 2);
  assert.equal(report.doneTasks, 1);
  assert.equal(report.overdueOpen, 1);
  assert.equal(report.importantOpen, 1);
  assert.equal(report.actualMinutes, 100);
  assert.equal(report.estimatedMeasuredMinutes, 105);
  assert.equal(report.milestoneRate, 50);
  assert.equal(report.statusBreakdown.inProgress, 1);
});

test('reading deep report separates activities, books, days and sessions', () => {
  const first = createReaderBook({ title: 'Book A', content: 'abc' });
  first.overallProgress = 1;
  first.readingSecondsByDate = { '2026-09-18': 600, '2026-09-19': 1200 };
  first.listeningSecondsByDate = { '2026-09-19': 300 };
  first.sessions = [
    { id: 's1', startedAt: '2026-09-19T13:00:00.000Z', endedAt: '2026-09-19T13:25:00.000Z', readingSeconds: 1200, listeningSeconds: 300 },
  ];
  const second = createReaderBook({ title: 'Book B', content: 'def' });
  second.readingSecondsByDate = { '2026-09-18': 300 };

  const report = buildReadingDeepReport([first, second], '7d', '2026-09-19');
  assert.equal(report.summary.readingSeconds, 2100);
  assert.equal(report.summary.listeningSeconds, 300);
  assert.equal(report.books.length, 2);
  assert.equal(report.books[0].book.title, 'Book A');
  assert.equal(report.books[0].sessionCount, 1);
  assert.equal(report.recentSessions.length, 1);
  assert.equal(report.completedBooks, 1);
  assert.equal(report.dailyActivity.find((day) => day.date === '2026-09-19')?.sessionCount, 1);
});

test('nutrition deep report keeps per-day measured values', () => {
  const nutrition: NutritionState = {
    profile: {
      sex: 'male', age: 22, heightCm: 169, weightKg: 65.5, activityLevel: 'desk_training', goal: 'recomp',
      calorieTarget: 2100, proteinTarget: 130, carbTarget: 270, fatTarget: 55, stepTarget: 8000,
    },
    entries: [
      { id: '1', date: '2026-09-19', name: 'A', meal: 'lunch', calories: 2100, protein: 140, carbs: 250, fat: 55, createdAt: 'x' },
    ],
    dailyMetrics: [{ date: '2026-09-19', steps: 9000, weightKg: 65.2, updatedAt: 'x' }],
  };
  const report = buildNutritionDeepReport(nutrition, '7d', '2026-09-19');
  assert.equal(report.daily.length, 1);
  assert.equal(report.daily[0].calorieTargetMet, true);
  assert.equal(report.daily[0].proteinTargetMet, true);
  assert.equal(report.daily[0].stepTargetMet, true);
});

test('exercise deep report keeps full in-range history by exercise', () => {
  let progress = updateExerciseProgress({}, 'Squat', '2026-09-10', { weight: 80, reps: 8 });
  progress = updateExerciseProgress(progress, 'Squat', '2026-09-15', { weight: 85, reps: 8 });
  progress = updateExerciseProgress(progress, 'Squat', '2026-09-19', { weight: 87.5, reps: 7 });
  const report = buildExerciseDeepReport(progress, '30d', '2026-09-19');
  assert.equal(report.exercises.length, 1);
  assert.equal(report.exercises[0].history.length, 3);
  assert.equal(report.exercises[0].weightDelta, 2.5);
});
