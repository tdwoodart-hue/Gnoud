import { parseManualReferenceList, referenceSubject, replaceManualReferenceList } from './manualReferenceService';
import type { QuickWorkoutAction } from './quickActionService';

export interface ExerciseLogEntry {
  date: string;
  weight: string;
  reps: string;
  updatedAt?: string;
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

export interface ExerciseCatalogItem {
  label: string;
  group: 'Ngực' | 'Lưng' | 'Vai' | 'Tay trước' | 'Tay sau' | 'Chân & mông' | 'Core';
  aliases?: string[];
}

export const DEFAULT_EXERCISE_LIBRARY: ExerciseCatalogItem[] = [
  // Ngực
  { label: 'Bench Press', group: 'Ngực', aliases: ['barbell bench press', 'đẩy ngực đòn'] },
  { label: 'Incline Dumbbell Press', group: 'Ngực', aliases: ['incline db press', 'đẩy ngực trên tạ đơn'] },
  { label: 'Incline Smith Press', group: 'Ngực', aliases: ['smith incline press', 'đẩy ngực trên smith'] },
  { label: 'Chest Press Machine', group: 'Ngực', aliases: ['machine chest press', 'máy đẩy ngực'] },
  { label: 'Pec Deck Fly', group: 'Ngực', aliases: ['pec deck', 'butterfly', 'ép ngực máy'] },
  { label: 'Cable Fly', group: 'Ngực', aliases: ['cable crossover', 'ép ngực cáp'] },
  { label: 'Push-Up', group: 'Ngực', aliases: ['push up', 'hít đất'] },
  { label: 'Dips', group: 'Ngực', aliases: ['chest dips', 'xà kép'] },

  // Lưng
  { label: 'Lat Pulldown', group: 'Lưng', aliases: ['kéo xô', 'wide grip pulldown'] },
  { label: 'Neutral-Grip Lat Pulldown', group: 'Lưng', aliases: ['neutral pulldown', 'kéo xô tay trung lập'] },
  { label: 'Pull-Up', group: 'Lưng', aliases: ['pull up', 'hít xà'] },
  { label: 'Seated Cable Row', group: 'Lưng', aliases: ['cable row', 'kéo cáp ngồi'] },
  { label: 'Chest-Supported Row', group: 'Lưng', aliases: ['chest supported row', 'row tựa ngực'] },
  { label: 'One-Arm Dumbbell Row', group: 'Lưng', aliases: ['one arm row', 'dumbbell row', 'kéo tạ đơn một tay'] },
  { label: 'T-Bar Row', group: 'Lưng', aliases: ['t bar row'] },
  { label: 'Straight-Arm Pulldown', group: 'Lưng', aliases: ['straight arm pulldown', 'kéo cáp tay thẳng'] },
  { label: 'Face Pull', group: 'Lưng', aliases: ['facepull', 'kéo cáp mặt'] },
  { label: 'Deadlift', group: 'Lưng', aliases: ['conventional deadlift'] },

  // Vai
  { label: 'Overhead Press', group: 'Vai', aliases: ['ohp', 'barbell shoulder press', 'đẩy vai đòn'] },
  { label: 'Dumbbell Shoulder Press', group: 'Vai', aliases: ['db shoulder press', 'đẩy vai tạ đơn'] },
  { label: 'Machine Shoulder Press', group: 'Vai', aliases: ['shoulder press machine', 'máy đẩy vai'] },
  { label: 'Dumbbell Lateral Raise', group: 'Vai', aliases: ['lateral raise', 'nâng vai ngang tạ đơn'] },
  { label: 'Cable Lateral Raise', group: 'Vai', aliases: ['cable side raise', 'nâng vai ngang cáp'] },
  { label: 'Rear Delt Fly', group: 'Vai', aliases: ['rear delt raise', 'vai sau'] },
  { label: 'Reverse Pec Deck', group: 'Vai', aliases: ['reverse fly machine', 'pec deck ngược'] },

  // Tay trước
  { label: 'Dumbbell Curl', group: 'Tay trước', aliases: ['biceps curl', 'cuốn tay trước tạ đơn'] },
  { label: 'Hammer Curl', group: 'Tay trước', aliases: ['hammer curls', 'cuốn búa'] },
  { label: 'Preacher Curl', group: 'Tay trước', aliases: ['preacher curls', 'cuốn ghế preacher'] },
  { label: 'Cable Curl', group: 'Tay trước', aliases: ['cable biceps curl', 'cuốn tay trước cáp'] },

  // Tay sau
  { label: 'Rope Pushdown', group: 'Tay sau', aliases: ['triceps rope pushdown', 'đẩy cáp dây thừng'] },
  { label: 'Straight-Bar Pushdown', group: 'Tay sau', aliases: ['bar pushdown', 'triceps pushdown'] },
  { label: 'Overhead Cable Extension', group: 'Tay sau', aliases: ['overhead triceps extension', 'duỗi tay sau qua đầu'] },
  { label: 'Skull Crusher', group: 'Tay sau', aliases: ['lying triceps extension'] },
  { label: 'Close-Grip Bench Press', group: 'Tay sau', aliases: ['close grip bench', 'bench tay hẹp'] },

  // Chân & mông
  { label: 'Back Squat', group: 'Chân & mông', aliases: ['barbell squat', 'squat đòn'] },
  { label: 'Hack Squat', group: 'Chân & mông', aliases: ['hack squat machine'] },
  { label: 'Leg Press', group: 'Chân & mông', aliases: ['máy đạp chân'] },
  { label: 'Romanian Deadlift', group: 'Chân & mông', aliases: ['rdl', 'romanian dead lift'] },
  { label: 'Leg Extension', group: 'Chân & mông', aliases: ['duỗi chân máy'] },
  { label: 'Seated Leg Curl', group: 'Chân & mông', aliases: ['leg curl ngồi', 'gập chân ngồi'] },
  { label: 'Lying Leg Curl', group: 'Chân & mông', aliases: ['leg curl nằm', 'gập chân nằm'] },
  { label: 'Bulgarian Split Squat', group: 'Chân & mông', aliases: ['bulgarian squat'] },
  { label: 'Hip Thrust', group: 'Chân & mông', aliases: ['hip thrust barbell', 'đẩy hông'] },
  { label: 'Standing Calf Raise', group: 'Chân & mông', aliases: ['calf raise đứng', 'nhón bắp chân'] },
  { label: 'Seated Calf Raise', group: 'Chân & mông', aliases: ['calf raise ngồi'] },

  // Core
  { label: 'Cable Crunch', group: 'Core', aliases: ['crunch cáp', 'gập bụng cáp'] },
  { label: 'Hanging Leg Raise', group: 'Core', aliases: ['leg raise treo', 'nâng chân treo'] },
  { label: 'Ab Wheel', group: 'Core', aliases: ['ab rollout', 'con lăn bụng'] },
  { label: 'Plank', group: 'Core', aliases: ['plank bụng'] },
];

export const EXERCISE_PROGRESS_STORAGE_KEY = 'gnoud-exercise-progress-v1';
export const EXERCISE_PROGRESS_CHANGE_EVENT = 'gnoud-exercise-progress-change';
export const EXERCISE_PROGRESS_REFRESH_EVENT = 'gnoud-exercise-progress-refresh';
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
    && typeof row.reps === 'string'
    && (row.updatedAt === undefined || typeof row.updatedAt === 'string');
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
    const existingStamp = existing?.updatedAt || '';
    const rowStamp = row.updatedAt || '';
    const preferRow = !existing || !existingStamp || (Boolean(rowStamp) && rowStamp >= existingStamp);
    if (!preferRow) return;
    byDate.set(row.date, {
      date: row.date,
      weight: row.weight || existing?.weight || '',
      reps: row.reps || existing?.reps || '',
      ...(row.updatedAt || existing?.updatedAt ? { updatedAt: row.updatedAt || existing?.updatedAt } : {}),
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

export function mergeExerciseProgressStores(
  left: ExerciseProgressStore,
  right: ExerciseProgressStore,
): ExerciseProgressStore {
  const result: ExerciseProgressStore = {};
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  keys.forEach((key) => {
    const leftValue = left[key];
    const rightValue = right[key];
    if (leftValue && rightValue) result[key] = mergeProgress(leftValue, rightValue);
    else if (rightValue) result[key] = mergeProgress(undefined, rightValue);
    else if (leftValue) result[key] = mergeProgress(undefined, leftValue);
  });
  return result;
}

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

export function shouldClaimLegacyExerciseProgress(userId?: string | null, hasScopedData = false): boolean {
  return Boolean(userId && !hasScopedData);
}

export function loadExerciseProgress(userId?: string | null): ExerciseProgressStore {
  if (typeof window === 'undefined') return {};
  try {
    const scopedKey = buildExerciseProgressStorageKey(userId);
    const scoped = window.localStorage.getItem(scopedKey);

    if (scoped) {
      const parsed = JSON.parse(scoped);
      const normalized = normalizeStore(parsed);
      if (JSON.stringify(normalized) !== JSON.stringify(parsed)) {
        persistExerciseProgress(normalized, userId);
      }
      return normalized;
    }

    // Legacy v1 không có UID. Chỉ tài khoản đã xác thực đầu tiên được nhận dữ liệu cũ.
    // Không migrate vào guest vì auth có thể chưa hydrate xong khi app vừa mở.
    if (!shouldClaimLegacyExerciseProgress(userId, false)) return {};

    const legacy = window.localStorage.getItem(EXERCISE_PROGRESS_STORAGE_KEY);
    if (!legacy) return {};

    const migrated = normalizeStore(JSON.parse(legacy));
    if (persistExerciseProgress(migrated, userId)) {
      // Xóa nguồn legacy sau khi ghi scoped thành công để tài khoản thứ hai không thể import lại.
      window.localStorage.removeItem(EXERCISE_PROGRESS_STORAGE_KEY);
    }
    return migrated;
  } catch {
    return {};
  }
}

export function persistExerciseProgress(progress: ExerciseProgressStore, userId?: string | null): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(buildExerciseProgressStorageKey(userId), JSON.stringify(progress));
    window.dispatchEvent(new CustomEvent(EXERCISE_PROGRESS_CHANGE_EVENT, {
      detail: { userId: userId || null },
    }));
    return true;
  } catch {
    // Không chặn buổi tập nếu trình duyệt từ chối localStorage.
    return false;
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
    updatedAt: new Date().toISOString(),
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
