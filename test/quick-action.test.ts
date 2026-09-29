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


test('đọc thẳng câu trả lời ChatGPT kiểu danh sách macro như ảnh thực tế', () => {
  const raw = `
Tao tính theo khối lượng sau khi đã nấu chín như mày ghi:

• **Bún chín 250g:** ~275 kcal · P 5g · C 63g · F 0,5g
• **Ức gà chín 52g:** ~86 kcal · P 16g · C 0g · F 2g
• **Thịt bò chín 74g:** ~165 kcal · P 20g · C 0g · F 9g
• **Đậu 93g có ngậm nước:** ~70 kcal · P 7g · C 2g · F 4g
• **Thịt lợn viên 18g, cả nạc+mỡ:** ~45 kcal · P 3g · C 1g · F 3,5g
• **Nước canh cua:** ~60 kcal · P 5g · C 3g · F 3g

**Chốt cả bữa:** ~700 kcal · Protein ~56g · Carb ~69g · Fat ~22g.
`;

  const result = parseQuickAction(raw, 'nutrition', '2026-09-29', 'lunch');
  assert.equal(result.errors.length, 0);
  assert.equal(result.action?.type, 'nutrition');
  if (result.action?.type !== 'nutrition') return;
  assert.equal(result.action.meal, 'lunch');
  assert.equal(result.action.items.length, 6);
  assert.equal(result.action.items[0].name, 'Bún chín 250g');
  assert.equal(result.action.items[0].amount, 250);
  assert.equal(result.action.items[0].unit, 'g');
  assert.equal(result.action.items[4].fat, 3.5);
  assert.equal(result.action.items.reduce((sum, item) => sum + item.calories, 0), 701);
});

test('đọc text workout thường không cần JSON', () => {
  const result = parseQuickAction(
    'Lat Pulldown: 40kg · 10 reps · 3 sets\nChest Press: 35kg · 12 reps · 3 sets',
    'workout',
    '2026-09-29',
  );
  assert.equal(result.errors.length, 0);
  assert.equal(result.action?.type, 'workout');
  if (result.action?.type !== 'workout') return;
  assert.equal(result.action.exercises.length, 2);
  assert.equal(result.action.exercises[0].weightKg, 40);
  assert.equal(result.action.exercises[1].reps, 12);
});
