import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDailyTaskActivity,
  buildHabitReport,
  buildNutritionReport,
  buildProjectReport,
  buildReportSummary,
  getReportStart,
} from '../src/services/reportService';
import type { Habit, Project, Task } from '../src/types';
import type { NutritionState } from '../src/services/nutritionService';

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

test('summary separates completion, on-time, overdue and focus', () => {
  const tasks = [
    task({ id: 'a', plannedDate: '2026-09-18', status: 'done', completedAt: '2026-09-18', deadline: '2026-09-18', actualMinutes: 45 }),
    task({ id: 'b', plannedDate: '2026-09-19', status: 'done', completedAt: '2026-09-19', deadline: '2026-09-18', actualMinutes: 30 }),
    task({ id: 'c', plannedDate: '2026-09-19', status: 'todo', deadline: '2026-09-18', priority: 'high' }),
    task({ id: 'old', plannedDate: '2026-08-01', status: 'done', completedAt: '2026-08-01', actualMinutes: 300 }),
  ];
  const result = buildReportSummary(tasks, '7d', '2026-09-19');
  assert.equal(result.totalTasks, 3);
  assert.equal(result.doneTasks, 2);
  assert.equal(result.completionRate, 67);
  assert.equal(result.focusMinutes, 75);
  assert.equal(result.deadlineDone, 2);
  assert.equal(result.onTimeDone, 1);
  assert.equal(result.onTimeRate, 50);
  assert.equal(result.overdueOpen, 1);
  assert.equal(result.importantOpen, 1);
});

test('daily activity counts planned, completed and focus minutes', () => {
  const tasks = [
    task({ id: 'a', plannedDate: '2026-09-19', status: 'done', completedAt: '2026-09-19', actualMinutes: 25 }),
    task({ id: 'b', plannedDate: '2026-09-19', actualMinutes: 10 }),
    task({ id: 'c', plannedDate: '2026-09-18', status: 'done', completedAt: '2026-09-19', actualMinutes: 15 }),
  ];
  const rows = buildDailyTaskActivity(tasks, '2026-09-19', 2);
  assert.deepEqual(rows.map((row) => row.date), ['2026-09-18', '2026-09-19']);
  assert.equal(rows[1].planned, 2);
  assert.equal(rows[1].completed, 2);
  assert.equal(rows[1].focusMinutes, 40);
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

test('habit report respects weekly target', () => {
  const habits: Habit[] = [{
    id: 'h1', name: 'Đọc sách', durationMinutes: 15, streak: 3, targetDaysPerWeek: 5,
    completedDates: ['2026-09-13', '2026-09-14', '2026-09-15', '2026-09-18'],
  }];
  const rows = buildHabitReport(habits, '2026-09-19', 7);
  assert.equal(rows[0].completed, 4);
  assert.equal(rows[0].target, 5);
  assert.equal(rows[0].rate, 80);
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
