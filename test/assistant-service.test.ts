import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAssistantReadIntent } from '../src/services/assistantService.ts';

test('nhận câu hỏi dinh dưỡng hôm nay là lệnh chỉ đọc', () => {
  assert.equal(parseAssistantReadIntent('Hôm nay tao còn bao nhiêu protein?'), 'nutrition_today');
  assert.equal(parseAssistantReadIntent('Tổng kcal hôm nay'), 'nutrition_today');
});

test('nhận câu hỏi buổi tập hôm nay', () => {
  assert.equal(parseAssistantReadIntent('Buổi tập hôm nay có bài gì?'), 'workout_today');
});

test('nhận câu hỏi công việc hôm nay', () => {
  assert.equal(parseAssistantReadIntent('Hôm nay còn việc gì cần làm?'), 'today_tasks');
});

test('không nuốt lệnh ghi dữ liệu thành lệnh chỉ đọc', () => {
  assert.equal(
    parseAssistantReadIntent('Lưu bữa tối hôm nay: cơm 200 kcal P4g C44g F1g'),
    null,
  );
});
