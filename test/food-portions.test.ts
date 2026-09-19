import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FoodItem,
  getFoodPortions,
  parseFoodJson,
  scaleFoodPortion,
} from '../src/services/foodLibraryService';

const legacyBanana: FoodItem = {
  id: 'food-banana',
  name: 'Chuối',
  category: 'Trái cây',
  source: 'imported',
  variants: [
    {
      id: 'banana-fresh',
      label: 'Tươi',
      amount: 100,
      unit: 'g',
      grams: 100,
      calories: 89,
      protein: 1.1,
      carbs: 22.8,
      fat: 0.3,
    },
  ],
};

test('legacy banana gets a fruit portion without losing the 100 g option', () => {
  const variant = legacyBanana.variants[0];
  const portions = getFoodPortions(legacyBanana, variant);
  assert.equal(portions[0].unit, 'quả');
  assert.equal(portions[0].amount, 1);
  assert.equal(portions[1].unit, 'g');
  assert.equal(portions[1].amount, 100);

  const oneBanana = scaleFoodPortion(variant, portions[0], 1);
  assert.equal(Math.round(oneBanana.calories), 105);
  assert.equal(Math.round(oneBanana.carbs * 10) / 10, 26.9);
});

test('uploaded JSON can define reusable portion options', () => {
  const foods = parseFoodJson(JSON.stringify({
    foods: [
      {
        id: 'food-demo',
        name: 'Demo',
        portions: [
          { id: 'one-piece', label: '1 cái', amount: 1, unit: 'cái', multiplier: 1.5 },
        ],
        variants: [
          { id: 'base', label: 'Mặc định', amount: 100, unit: 'g', calories: 100, protein: 10, carbs: 10, fat: 2 },
        ],
      },
    ],
  }), 'imported');

  assert.equal(foods.length, 1);
  assert.equal(foods[0].portions?.[0].label, '1 cái');
  const result = scaleFoodPortion(foods[0].variants[0], foods[0].portions![0], 2);
  assert.equal(result.calories, 300);
});
