import assert from 'node:assert/strict';
import test from 'node:test';
import { parseServingAmount, scaleNutrition } from '../src/services/foodQuantityService';

test('parses gram, ml and count servings', () => {
  assert.deepEqual(parseServingAmount('100 g'), { amount: 100, unit: 'g', step: 5 });
  assert.deepEqual(parseServingAmount('65 ml'), { amount: 65, unit: 'ml', step: 5 });
  assert.deepEqual(parseServingAmount('1 quả (~50 g)'), { amount: 1, unit: 'quả', step: 1 });
});

test('scales calories and macros from 100 g to 210 g', () => {
  const scaled = scaleNutrition(
    { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 },
    210,
    100,
  );
  assert.equal(Math.round(scaled.calories), 273);
  assert.equal(Math.round(scaled.carbs * 10) / 10, 59.2);
});

test('scales count servings', () => {
  const scaled = scaleNutrition(
    { calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3 },
    2,
    1,
  );
  assert.equal(scaled.calories, 156);
  assert.equal(scaled.protein, 12.6);
});
