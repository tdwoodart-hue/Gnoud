import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyWorkoutQuickAction,
  exerciseKey,
  updateExerciseProgress,
} from '../src/services/exerciseService.ts';

test('exercise key ổn định khi đổi sets x reps', () => {
  assert.equal(exerciseKey('Bench Press 3x10'), exerciseKey('Bench Press 4x8'));
});

test('nhập nhanh workout cập nhật bài cũ và thêm bài mới', () => {
  const progress = updateExerciseProgress({}, 'Bench Press 3x10', '2026-09-20', {
    weight: 40,
    reps: 10,
  });

  const result = applyWorkoutQuickAction(
    '1. Bench Press 3x10\n2. Lat Pulldown 3x12',
    progress,
    {
      type: 'workout',
      date: '2026-09-29',
      source: 'quick',
      exercises: [
        { name: 'Bench Press', weightKg: 45, reps: 8 },
        { name: 'Leg Press', weightKg: 80, reps: 12, sets: 3 },
      ],
    },
    '2026-09-29',
  );

  assert.match(result.description, /Bench Press 3x10/);
  assert.match(result.description, /Leg Press 3x12/);
  assert.equal(result.addedExercises.length, 1);
  assert.equal(result.updatedExercises.length, 1);
  assert.equal(result.progress[exerciseKey('Bench Press')]?.latest?.weight, '45');
  assert.equal(result.progress[exerciseKey('Bench Press')]?.previous?.weight, '40');
  assert.equal(result.progress[exerciseKey('Bench Press')]?.history?.length, 2);
});

test('exercise history keeps more than two dates for long-term reports', () => {
  let progress = updateExerciseProgress({}, 'Bench Press 3x10', '2026-09-01', { weight: 40, reps: 10 });
  progress = updateExerciseProgress(progress, 'Bench Press 3x10', '2026-09-08', { weight: 42.5, reps: 10 });
  progress = updateExerciseProgress(progress, 'Bench Press 3x10', '2026-09-15', { weight: 45, reps: 8 });
  const bench = progress[exerciseKey('Bench Press')];
  assert.equal(bench?.history?.length, 3);
  assert.equal(bench?.latest?.weight, '45');
  assert.equal(bench?.previous?.weight, '42.5');
});
