import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyWorkoutQuickAction,
  buildExerciseProgressStorageKey,
  DEFAULT_EXERCISE_LIBRARY,
  mergeExerciseProgressStores,
  exerciseKey,
  shouldClaimLegacyExerciseProgress,
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


test('legacy gym data is only claimable by an authenticated account without scoped data', () => {
  assert.equal(shouldClaimLegacyExerciseProgress(undefined, false), false);
  assert.equal(shouldClaimLegacyExerciseProgress(null, false), false);
  assert.equal(shouldClaimLegacyExerciseProgress('user-a', true), false);
  assert.equal(shouldClaimLegacyExerciseProgress('user-a', false), true);
  assert.notEqual(buildExerciseProgressStorageKey('user-a'), buildExerciseProgressStorageKey('user-b'));
});


test('built-in exercise catalog covers main muscle groups without duplicate exercise keys', () => {
  const keys = DEFAULT_EXERCISE_LIBRARY.map((item) => exerciseKey(item.label));
  assert.equal(new Set(keys).size, keys.length);
  const groups = new Set(DEFAULT_EXERCISE_LIBRARY.map((item) => item.group));
  ['Ngực', 'Lưng', 'Vai', 'Tay trước', 'Tay sau', 'Chân & mông', 'Core'].forEach((group) => {
    assert.ok(groups.has(group as any));
  });
  ['Bench Press', 'Lat Pulldown', 'Dumbbell Lateral Raise', 'Hammer Curl', 'Rope Pushdown', 'Leg Press', 'Romanian Deadlift', 'Cable Crunch'].forEach((label) => {
    assert.ok(DEFAULT_EXERCISE_LIBRARY.some((item) => item.label === label));
  });
});


test('exercise cloud merge keeps history from both devices and newer same-day values', () => {
  const cloud = {
    [exerciseKey('Bench Press')]: {
      label: 'Bench Press',
      history: [
        { date: '2026-10-01', weight: '50', reps: '8', updatedAt: '2026-10-01T12:00:00.000Z' },
        { date: '2026-10-03', weight: '55', reps: '8', updatedAt: '2026-10-03T06:00:00.000Z' },
      ],
    },
  };
  const local = {
    [exerciseKey('Bench Press')]: {
      label: 'Bench Press',
      history: [
        { date: '2026-10-02', weight: '52.5', reps: '9', updatedAt: '2026-10-02T12:00:00.000Z' },
        { date: '2026-10-03', weight: '57.5', reps: '7', updatedAt: '2026-10-03T07:00:00.000Z' },
      ],
    },
  };

  const merged = mergeExerciseProgressStores(cloud, local);
  const bench = merged[exerciseKey('Bench Press')];
  assert.equal(bench?.history?.length, 3);
  assert.equal(bench?.latest?.date, '2026-10-03');
  assert.equal(bench?.latest?.weight, '57.5');
  assert.equal(bench?.previous?.date, '2026-10-02');
});
