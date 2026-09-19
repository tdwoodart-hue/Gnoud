import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalReferenceKey,
  parseManualReferenceList,
  referenceLibraryId,
  referenceSubject,
} from '../src/services/manualReferenceService.ts';
import {
  makeReferenceLibraryItemFromUrl,
  normalizeReferenceImageUrl,
} from '../src/services/referenceLibraryService.ts';

test('bỏ sets/reps để cùng bài dùng lại đúng ảnh ở lần sau', () => {
  assert.equal(referenceSubject('Leg press 3x10'), 'Leg press');
  assert.equal(referenceSubject('Leg press 4x12'), 'Leg press');
  assert.equal(referenceLibraryId('Leg press 3x10'), referenceLibraryId('Leg press 4x12'));
});

test('bỏ hậu tố mỗi bên và giữ khóa ổn định', () => {
  assert.equal(referenceSubject('Dead bug 3x10 mỗi bên'), 'Dead bug');
  assert.equal(referenceLibraryId('Dead bug 3x10 mỗi bên'), referenceLibraryId('Dead bug 4x12'));
});

test('dòng có bài thay thế dùng bài đầu làm ảnh mặc định', () => {
  assert.equal(
    canonicalReferenceKey('Chest press machine hoặc dumbbell bench 3x10'),
    'chest press machine',
  );
});

test('danh sách mô tả trả về id theo bài thay vì theo số reps', () => {
  const first = parseManualReferenceList('1. Leg press 3x10\n2. Dead bug 3x10 mỗi bên');
  const second = parseManualReferenceList('1. Leg press 4x12\n2. Dead bug 4x8 mỗi bên');
  assert.equal(first[0].id, second[0].id);
  assert.equal(first[1].id, second[1].id);
});


test('link ảnh được chuẩn hóa và lưu cùng khóa dùng lại', () => {
  const first = makeReferenceLibraryItemFromUrl('Leg press 3x10', 'https://example.com/leg-press.jpg');
  const second = makeReferenceLibraryItemFromUrl('Leg press 4x12', 'https://example.com/leg-press-new.jpg');
  assert.equal(first.id, second.id);
  assert.equal(first.source, 'url');
  assert.equal(first.dataUrl, 'https://example.com/leg-press.jpg');
});

test('link ảnh chỉ nhận http hoặc https', () => {
  assert.equal(normalizeReferenceImageUrl(' https://example.com/a.png '), 'https://example.com/a.png');
  assert.throws(() => normalizeReferenceImageUrl('javascript:alert(1)'));
  assert.throws(() => normalizeReferenceImageUrl('khong-phai-link'));
});
