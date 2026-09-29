import assert from 'node:assert/strict';
import test from 'node:test';
import { parseQuickAction } from '../src/services/quickActionService.ts';

test('đọc form dinh dưỡng trong code fence và hiểu tên field ngắn', () => {
  const result = parseQuickAction(`\`\`\`json
{
  "meal": "bữa trưa",
  "items": [
    { "name": "Ức gà", "amount": 150, "unit": "g", "p": 46.5, "c": 0, "f": 5.4 }
  ]
}
\`\`\``, 'nutrition', '2026-09-29');

  assert.equal(result.errors.length, 0);
  assert.equal(result.action?.type, 'nutrition');
  if (result.action?.type !== 'nutrition') return;
  assert.equal(result.action.meal, 'lunch');
  assert.equal(result.action.date, '2026-09-29');
  assert.equal(result.action.items[0].name, 'Ức gà');
  assert.equal(result.action.items[0].calories, 234.6);
  assert.equal(result.warnings.length, 1);
});

test('đọc form workout và chấp nhận aliases weight/kg', () => {
  const result = parseQuickAction(JSON.stringify({
    type: 'gym',
    exercises: [
      { exercise: 'Lat Pulldown', kg: 40, reps: 10, sets: 3 },
    ],
  }), 'workout', '2026-09-29');

  assert.equal(result.errors.length, 0);
  assert.equal(result.action?.type, 'workout');
  if (result.action?.type !== 'workout') return;
  assert.deepEqual(result.action.exercises[0], {
    name: 'Lat Pulldown',
    weightKg: 40,
    reps: 10,
    sets: 3,
  });
});

test('không cho lưu form thiếu danh sách', () => {
  const result = parseQuickAction('{"type":"nutrition","meal":"lunch"}', 'nutrition');
  assert.equal(result.action, null);
  assert.ok(result.errors.length > 0);
});
