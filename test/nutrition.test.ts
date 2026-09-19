import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBmr,
  calculateTdee,
  DEFAULT_NUTRITION_PROFILE,
  getDailyMetric,
  getPreviousWeight,
  getTotals,
  getWeekDates,
  recommendedTargets,
  removeNutritionEntry,
  toLocalIso,
  upsertDailyMetric,
} from '../src/services/nutritionService';

test('default profile matches current user nutrition baseline', () => {
  const bmr = calculateBmr(DEFAULT_NUTRITION_PROFILE);
  const tdee = calculateTdee(DEFAULT_NUTRITION_PROFILE);
  assert.ok(bmr > 1600 && bmr < 1610);
  assert.ok(tdee > 2200 && tdee < 2220);
  assert.equal(DEFAULT_NUTRITION_PROFILE.stepTarget, 8000);
});

test('recommended recomp targets stay near 2100 kcal and current macros', () => {
  const targets = recommendedTargets(DEFAULT_NUTRITION_PROFILE);
  assert.equal(targets.calorieTarget, 2100);
  assert.equal(targets.proteinTarget, 130);
  assert.equal(targets.carbTarget, 270);
  assert.equal(targets.fatTarget, 55);
});

test('week starts on Monday and has seven days', () => {
  const dates = getWeekDates(new Date(2026, 8, 19));
  assert.equal(dates.length, 7);
  assert.equal(toLocalIso(dates[0]), '2026-09-14');
  assert.equal(toLocalIso(dates[6]), '2026-09-20');
});

test('nutrition totals aggregate meal entries', () => {
  const totals = getTotals([
    {
      id: '1', date: '2026-09-19', name: 'A', meal: 'breakfast', createdAt: '1',
      calories: 400, protein: 30, carbs: 40, fat: 10,
    },
    {
      id: '2', date: '2026-09-19', name: 'B', meal: 'lunch', createdAt: '2',
      calories: 600, protein: 45, carbs: 70, fat: 20,
    },
  ]);
  assert.deepEqual(totals, { calories: 1000, protein: 75, carbs: 110, fat: 30 });
});

test('daily metrics keep steps and weight on the same date', () => {
  let metrics = upsertDailyMetric([], '2026-09-19', { steps: 7420 });
  metrics = upsertDailyMetric(metrics, '2026-09-19', { weightKg: 65.4 });
  const metric = getDailyMetric(metrics, '2026-09-19');
  assert.equal(metric?.steps, 7420);
  assert.equal(metric?.weightKg, 65.4);
});

test('previous weight uses the latest earlier logged date', () => {
  let metrics = upsertDailyMetric([], '2026-09-17', { weightKg: 65.8 });
  metrics = upsertDailyMetric(metrics, '2026-09-18', { steps: 8000 });
  metrics = upsertDailyMetric(metrics, '2026-09-19', { weightKg: 65.5 });
  assert.equal(getPreviousWeight(metrics, '2026-09-19')?.weightKg, 65.8);
});

test('removing one food entry subtracts exactly that entry from day totals', () => {
  const entries = [
    {
      id: 'egg', date: '2026-09-19', name: 'Trứng gà luộc', meal: 'breakfast' as const, createdAt: '1',
      calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3,
    },
    {
      id: 'banana', date: '2026-09-19', name: 'Chuối', meal: 'breakfast' as const, createdAt: '2',
      calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3,
    },
  ];

  const remaining = removeNutritionEntry(entries, 'egg');
  assert.deepEqual(getTotals(remaining), {
    calories: 89,
    protein: 1.1,
    carbs: 22.8,
    fat: 0.3,
  });
});

