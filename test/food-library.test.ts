import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeFoods,
  normalizeFoodRow,
  parseFoodCsv,
  parseFoodJson,
} from '../src/services/foodLibraryService';

test('normalizes Vietnamese food field aliases', () => {
  const food = normalizeFoodRow({
    'Tên': 'Trứng gà luộc',
    'Khẩu phần': '1 quả',
    kcal: '78',
    'Đạm': '6.3',
    carb: '0.6',
    'Chất béo': '5.3',
  });
  assert.ok(food);
  assert.equal(food.name, 'Trứng gà luộc');
  assert.equal(food.calories, 78);
  assert.equal(food.protein, 6.3);
});

test('parses CSV food library', () => {
  const foods = parseFoodCsv([
    'name,serving,calories,protein,carbs,fat,category',
    'Táo,100 g,52,0.3,13.8,0.2,Trái cây',
  ].join('\n'));
  assert.equal(foods.length, 1);
  assert.equal(foods[0].name, 'Táo');
  assert.equal(foods[0].carbs, 13.8);
});

test('parses JSON food library wrapper', () => {
  const foods = parseFoodJson(JSON.stringify({ foods: [{
    name: 'Chuối', serving: '100 g', calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3,
  }] }));
  assert.equal(foods.length, 1);
  assert.equal(foods[0].name, 'Chuối');
});

test('merge replaces duplicate food by name + serving', () => {
  const existing = parseFoodJson(JSON.stringify([{ name: 'Táo', serving: '100 g', calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2 }]));
  const incoming = parseFoodJson(JSON.stringify([{ name: 'Táo', serving: '100 g', calories: 55, protein: 0.3, carbs: 14, fat: 0.2 }]));
  const merged = mergeFoods(existing, incoming);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].calories, 55);
});
