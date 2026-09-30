import { parseManualReferenceList, referenceSubject, replaceManualReferenceList } from './manualReferenceService';
import type { QuickWorkoutAction } from './quickActionService';

export interface ExerciseLogEntry {
  date: string;
  weight: string;
  reps: string;
}

export interface ExerciseProgress {
  label?: string;
  latest?: ExerciseLogEntry;
  previous?: ExerciseLogEntry;
  history?: ExerciseLogEntry[];
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
const EXERCISE_PROGRESS_SCOPED_PREFIX = 'gnoud-exercise-progress-v2';

export function buildExerciseProgressStorageKey(userId?: string | null): string {
  return `${EXERCISE_PROGRESS_SCOPED_PREFIX}_${userId || 'guest'}`;
}

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

function validLog(value: unknown): value is ExerciseLogEntry {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<ExerciseLogEntry>;
  return typeof row.date === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(row.date)
    && typeof row.weight === 'string'
    && typeof row.reps === 'string';
}

function normalizeHistory(progress?: ExerciseProgress): ExerciseLogEntry[] {
  if (!progress) return [];
  const rows = [
    ...(Array.isArray(progress.history) ? progress.history : []),
    ...(progress.latest ? [progress.latest] : []),
    ...(progress.previous ? [progress.previous] : []),
  ].filter(validLog);

  const byDate = new Map<string, ExerciseLogEntry>();
  rows.forEach((row) => {
    const existing = byDate.get(row.date);
    byDate.set(row.date, {
      date: row.date,
      weight: row.weight || existing?.weight || '',
      reps: row.reps || existing?.reps || '',
    });
  });
  return [...byDate.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 730);
}

const mergeProgress = (left: ExerciseProgress | undefined, right: ExerciseProgress): ExerciseProgress => {
  const history = normalizeHistory({
    history: [...normalizeHistory(left), ...normalizeHistory(right)],
  });
  return {
    label: right.label || left?.label,
    ...(history[0] ? { latest: history[0] } : {}),
    ...(history[1] ? { previous: history[1] } : {}),
    history,
  };
};

function normalizeStore(parsed: unknown): ExerciseProgressStore {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const migrated: ExerciseProgressStore = {};
  Object.entries(parsed as ExerciseProgressStore).forEach(([legacyKey, value]) => {
    if (!value || typeof value !== 'object') return;
    const nextKey = exerciseKey(value.label || legacyKey) || legacyKey;
    migrated[nextKey] = mergeProgress(migrated[nextKey], {
      ...value,
      label: value.label || referenceSubject(legacyKey) || legacyKey,
    });
  });
  return migrated;
}

export function loadExerciseProgress(userId?: string | null): ExerciseProgressStore {
  if (typeof window === 'undefined') return {};
  try {
    const scopedKey = buildExerciseProgressStorageKey(userId);
    const scoped = window.localStorage.getItem(scopedKey);
    const legacy = scoped ? null : window.localStorage.getItem(EXERCISE_PROGRESS_STORAGE_KEY);
    const parsed = JSON.parse(scoped || legacy || '{}');
    const migrated = normalizeStore(parsed);
    if (!scoped || JSON.stringify(migrated) !== JSON.stringify(parsed)) {
      persistExerciseProgress(migrated, userId);
    }
    return migrated;
  } catch {
    return {};
  }
}

export function persistExerciseProgress(progress: ExerciseProgressStore, userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(buildExerciseProgressStorageKey(userId), JSON.stringify(progress));
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
  const history = normalizeHistory(existing);
  const sameDate = history.find((entry) => entry.date === date);
  const nextEntry: ExerciseLogEntry = {
    date,
    weight: sameDate?.weight || '',
    reps: sameDate?.reps || '',
  };

  if (updates.weight !== undefined) nextEntry.weight = String(updates.weight);
  if (updates.reps !== undefined) nextEntry.reps = String(updates.reps);

  const nextHistory = normalizeHistory({
    history: [nextEntry, ...history.filter((entry) => entry.date !== date)],
  });

  return {
    ...progress,
    [key]: {
      label: referenceSubject(label) || label.trim(),
      latest: nextHistory[0],
      previous: nextHistory[1],
      history: nextHistory,
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
