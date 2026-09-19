import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getReferenceImage,
  parseManualReferenceList,
  removeReferenceImage,
  upsertReferenceImage,
} from '../src/services/manualReferenceService.ts';

test('nhận diện danh sách đánh số nhưng không phá đoạn văn thường', () => {
  const rows = parseManualReferenceList('1. Leg press 3x10\n2. Chest press 3x10\n3. Dead bug 3x10');
  assert.equal(rows.length, 3);
  assert.equal(rows[0].label, 'Leg press 3x10');
  assert.deepEqual(parseManualReferenceList('Đây chỉ là một đoạn mô tả bình thường.'), []);
});

test('id giữ ổn định khi đổi thứ tự dòng', () => {
  const first = parseManualReferenceList('1. Leg press 3x10\n2. Dead bug 3x10');
  const second = parseManualReferenceList('1. Dead bug 3x10\n2. Leg press 3x10');
  assert.equal(first[0].id, second[1].id);
});

test('thêm, thay và xóa đúng ảnh của từng dòng', () => {
  const id = parseManualReferenceList('1. A\n2. B')[0].id;
  let images = upsertReferenceImage([], { id, dataUrl: 'data:image/webp;base64,one' });
  assert.equal(getReferenceImage(images, id)?.dataUrl, 'data:image/webp;base64,one');
  images = upsertReferenceImage(images, { id, dataUrl: 'data:image/webp;base64,two' });
  assert.equal(images.length, 1);
  assert.equal(getReferenceImage(images, id)?.dataUrl, 'data:image/webp;base64,two');
  images = removeReferenceImage(images, id);
  assert.equal(images.length, 0);
});
