import { parseManualReferenceList, referenceSubject, replaceManualReferenceList } from './manualReferenceService';
import type { QuickWorkoutAction } from './quickActionService';

export interface ExerciseLogEntry {
  date: string;
  weight: string;
  reps: string;
}

export interface ExerciseProgress {
  latest?: ExerciseLogEntry;
  previous?: ExerciseLogEntry;
}

export type ExerciseProgressStore = Record<string, ExerciseProgress>;

export interface WorkoutApplyResult {
  description: string;
  progress: ExerciseProgressStore;
  addedExercises: string[];
  updatedExercises: string[];
  batchId: string;
}

export const EXERCISE_PROGRESS_STORAGE_KEY = 'gnoud-exercise-progress-v1';

export function exerciseKey(label: string): string {
  return referenceSubject(label)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function exerciseId(label: string): string {
  const key = exerciseKey(label) || 'exercise';
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `exercise-${(hash >>> 0).toString(36)}`;
}

const newerLog = (left?: ExerciseLogEntry, right?: ExerciseLogEntry): ExerciseLogEntry | undefined => {
  if (!left) return right;
  if (!right) return left;
  return right.date >= left.date ? right : left;
};

const mergeProgress = (left: ExerciseProgress | undefined, right: ExerciseProgress): ExerciseProgress => {
  if (!left) return right;
  const latest = newerLog(left.latest, right.latest);
  const candidates = [left.latest, left.previous, right.latest, right.previous]
    .filter((entry): entry is ExerciseLogEntry => Boolean(entry))
    .sort((a, b) => b.date.localeCompare(a.date));
  const previous = candidates.find((entry) => !latest || entry.date < latest.date);
  return { ...(latest ? { latest } : {}), ...(previous ? { previous } : {}) };
};

export function loadExerciseProgress(): ExerciseProgressStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(EXERCISE_PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    // v0.9 chuẩn hóa khóa bài tập. Dữ liệu cũ dùng tên bài làm key vẫn được migrate tự động.
    const migrated: ExerciseProgressStore = {};
    Object.entries(parsed as ExerciseProgressStore).forEach(([legacyKey, value]) => {
      const nextKey = exerciseKey(legacyKey) || legacyKey;
      migrated[nextKey] = mergeProgress(migrated[nextKey], value);
    });

    if (JSON.stringify(migrated) !== JSON.stringify(parsed)) {
      persistExerciseProgress(migrated);
    }
    return migrated;
  } catch {
    return {};
  }
}

export function persistExerciseProgress(progress: ExerciseProgressStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(EXERCISE_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Không chặn buổi tập nếu trình duyệt từ chối localStorage.
  }
}

export function updateExerciseProgress(
  progress: ExerciseProgressStore,
  label: string,
  date: string,
  updates: { weight?: string | number; reps?: string | number },
): ExerciseProgressStore {
  const key = exerciseKey(label);
  if (!key) return progress;

  const existing = progress[key] || {};
  const latest = existing.latest;
  const editingSameDate = latest?.date === date;
  const nextLatest: ExerciseLogEntry = {
    date,
    weight: editingSameDate ? latest?.weight || '' : '',
    reps: editingSameDate ? latest?.reps || '' : '',
  };

  if (updates.weight !== undefined) nextLatest.weight = String(updates.weight);
  if (updates.reps !== undefined) nextLatest.reps = String(updates.reps);

  return {
    ...progress,
    [key]: {
      latest: nextLatest,
      previous: editingSameDate ? existing.previous : latest || existing.previous,
    },
  };
}

const newExerciseLabel = (name: string, sets?: number, reps?: number): string => {
  if (sets && reps) return `${name.trim()} ${sets}x${reps}`;
  return name.trim();
};

export function applyWorkoutQuickAction(
  description: string | undefined,
  progress: ExerciseProgressStore,
  action: QuickWorkoutAction,
  fallbackDate: string,
): WorkoutApplyResult {
  const references = parseManualReferenceList(description);
  const labels = references.map((reference) => reference.label);
  const indexByKey = new Map(labels.map((label, index) => [exerciseKey(label), index]));
  let nextProgress = progress;
  const addedExercises: string[] = [];
  const updatedExercises: string[] = [];
  const date = action.date || fallbackDate;

  action.exercises.forEach((exercise) => {
    const key = exerciseKey(exercise.name);
    if (!key) return;

    const existingIndex = indexByKey.get(key);
    let label: string;
    if (existingIndex === undefined) {
      label = newExerciseLabel(exercise.name, exercise.sets, exercise.reps);
      labels.push(label);
      indexByKey.set(key, labels.length - 1);
      addedExercises.push(referenceSubject(exercise.name));
    } else {
      label = labels[existingIndex];
      updatedExercises.push(referenceSubject(label));
    }

    nextProgress = updateExerciseProgress(nextProgress, label, date, {
      ...(exercise.weightKg !== undefined ? { weight: exercise.weightKg } : {}),
      ...(exercise.reps !== undefined ? { reps: exercise.reps } : {}),
    });
  });

  return {
    description: replaceManualReferenceList(description, labels),
    progress: nextProgress,
    addedExercises,
    updatedExercises,
    batchId: `workout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
}
