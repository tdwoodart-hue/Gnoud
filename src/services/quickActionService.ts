export type QuickActionSource = 'quick' | 'assistant';

export type QuickNutritionMeal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface QuickNutritionItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  amount?: number;
  unit?: string;
  servingLabel?: string;
}

export interface QuickNutritionAction {
  type: 'nutrition';
  date?: string;
  meal: QuickNutritionMeal;
  items: QuickNutritionItem[];
  source: QuickActionSource;
}

export interface QuickWorkoutExercise {
  name: string;
  weightKg?: number;
  reps?: number;
  sets?: number;
}

export interface QuickWorkoutAction {
  type: 'workout';
  date?: string;
  title?: string;
  exercises: QuickWorkoutExercise[];
  source: QuickActionSource;
}

export type QuickAction = QuickNutritionAction | QuickWorkoutAction;
export type QuickActionDomain = QuickAction['type'];

export interface QuickActionParseResult {
  action: QuickAction | null;
  errors: string[];
  warnings: string[];
}

const mealAliases: Record<string, QuickNutritionMeal> = {
  breakfast: 'breakfast',
  sang: 'breakfast',
  'bua sang': 'breakfast',
  'bữa sáng': 'breakfast',
  lunch: 'lunch',
  trua: 'lunch',
  'bua trua': 'lunch',
  'bữa trưa': 'lunch',
  dinner: 'dinner',
  toi: 'dinner',
  'bua toi': 'dinner',
  'bữa tối': 'dinner',
  snack: 'snack',
  'an nhe': 'snack',
  'ăn nhẹ': 'snack',
};

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi')
    .replace(/\s+/g, ' ')
    .trim();

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const firstDefined = (record: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') return record[key];
  }
  return undefined;
};

const asNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = typeof value === 'string' ? value.replace(',', '.').trim() : value;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : undefined;
};

const nonNegativeNumber = (value: unknown): number | undefined => {
  const number = asNumber(value);
  if (number === undefined) return undefined;
  return Math.max(0, number);
};

const positiveNumber = (value: unknown): number | undefined => {
  const number = asNumber(value);
  if (number === undefined || number <= 0) return undefined;
  return number;
};

const cleanJsonText = (raw: string): string => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^\`\`\`(?:json)?\s*([\s\S]*?)\s*\`\`\`$/i);
  return (fenced?.[1] || trimmed).trim();
};

const validIsoDate = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
};

const resolveMeal = (value: unknown): QuickNutritionMeal | undefined => {
  if (typeof value !== 'string') return undefined;
  const raw = value.trim().toLocaleLowerCase('vi');
  return mealAliases[raw] || mealAliases[normalizeText(raw)];
};

const normalizeNutritionItem = (
  raw: unknown,
  index: number,
  errors: string[],
  warnings: string[],
): QuickNutritionItem | null => {
  const record = asRecord(raw);
  if (!record) {
    errors.push(`Món #${index + 1} không phải object hợp lệ.`);
    return null;
  }

  const nameValue = firstDefined(record, ['name', 'food', 'title', 'mon', 'món']);
  const name = typeof nameValue === 'string' ? nameValue.trim() : '';
  if (!name) {
    errors.push(`Món #${index + 1} thiếu tên.`);
    return null;
  }

  const protein = nonNegativeNumber(firstDefined(record, ['protein', 'p'])) ?? 0;
  const carbs = nonNegativeNumber(firstDefined(record, ['carbs', 'carb', 'c'])) ?? 0;
  const fat = nonNegativeNumber(firstDefined(record, ['fat', 'f'])) ?? 0;
  let calories = nonNegativeNumber(firstDefined(record, ['calories', 'kcal', 'cal']));
  if (calories === undefined) {
    calories = protein * 4 + carbs * 4 + fat * 9;
    warnings.push(`${name}: thiếu kcal nên đã tính từ P/C/F.`);
  }

  const amount = positiveNumber(firstDefined(record, ['amount', 'quantity', 'grams', 'gram', 'g']));
  const unitValue = firstDefined(record, ['unit', 'donVi', 'đơn_vị', 'đơn vị']);
  const servingValue = firstDefined(record, ['servingLabel', 'serving', 'portion', 'khauPhan', 'khẩu phần']);

  return {
    name,
    calories: Math.round(calories * 10) / 10,
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    ...(amount !== undefined ? { amount } : {}),
    ...(typeof unitValue === 'string' && unitValue.trim() ? { unit: unitValue.trim() } : {}),
    ...(typeof servingValue === 'string' && servingValue.trim() ? { servingLabel: servingValue.trim() } : {}),
  };
};

const normalizeWorkoutExercise = (
  raw: unknown,
  index: number,
  errors: string[],
): QuickWorkoutExercise | null => {
  const record = asRecord(raw);
  if (!record) {
    errors.push(`Bài tập #${index + 1} không phải object hợp lệ.`);
    return null;
  }
  const nameValue = firstDefined(record, ['name', 'exercise', 'title', 'bai', 'bài']);
  const name = typeof nameValue === 'string' ? nameValue.trim() : '';
  if (!name) {
    errors.push(`Bài tập #${index + 1} thiếu tên.`);
    return null;
  }

  const weightKg = nonNegativeNumber(firstDefined(record, ['weightKg', 'weight', 'kg']));
  const reps = positiveNumber(firstDefined(record, ['reps', 'rep']));
  const sets = positiveNumber(firstDefined(record, ['sets', 'set']));

  return {
    name,
    ...(weightKg !== undefined ? { weightKg: Math.round(weightKg * 100) / 100 } : {}),
    ...(reps !== undefined ? { reps: Math.round(reps) } : {}),
    ...(sets !== undefined ? { sets: Math.round(sets) } : {}),
  };
};

const inferDomain = (record: Record<string, unknown>, fallback?: QuickActionDomain): QuickActionDomain | undefined => {
  const type = typeof record.type === 'string' ? normalizeText(record.type) : '';
  if (type === 'nutrition' || type === 'food' || type === 'meal' || type === 'dinh duong') return 'nutrition';
  if (type === 'workout' || type === 'gym' || type === 'exercise' || type === 'tap luyen') return 'workout';
  if (Array.isArray(record.exercises) || Array.isArray(record.workout)) return 'workout';
  if (Array.isArray(record.items) || Array.isArray(record.foods) || record.meal !== undefined) return 'nutrition';
  return fallback;
};

export function parseQuickAction(
  raw: string,
  fallbackDomain?: QuickActionDomain,
  fallbackDate?: string,
): QuickActionParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const text = cleanJsonText(raw);
  if (!text) return { action: null, errors: ['Chưa có dữ liệu để đọc.'], warnings };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      action: null,
      errors: ['Form chưa phải JSON hợp lệ. Có thể dán cả khối \`\`\`json ... \`\`\`.'],
      warnings,
    };
  }

  if (Array.isArray(parsed) && fallbackDomain) {
    parsed = fallbackDomain === 'nutrition'
      ? { type: 'nutrition', items: parsed }
      : { type: 'workout', exercises: parsed };
  }

  const record = asRecord(parsed);
  if (!record) return { action: null, errors: ['Form phải là một object JSON.'], warnings };

  const domain = inferDomain(record, fallbackDomain);
  if (!domain) return { action: null, errors: ['Không xác định được đây là dinh dưỡng hay buổi tập.'], warnings };

  const date = validIsoDate(firstDefined(record, ['date', 'day', 'ngay', 'ngày'])) || validIsoDate(fallbackDate);
  const sourceValue = typeof record.source === 'string' ? normalizeText(record.source) : '';
  const source: QuickActionSource = sourceValue === 'assistant' || sourceValue === 'ai' ? 'assistant' : 'quick';

  if (domain === 'nutrition') {
    const meal = resolveMeal(firstDefined(record, ['meal', 'mealType', 'bua', 'bữa'])) || 'snack';
    if (!resolveMeal(firstDefined(record, ['meal', 'mealType', 'bua', 'bữa']))) {
      warnings.push('Không thấy bữa ăn hợp lệ nên tạm dùng Ăn nhẹ.');
    }

    const rawItems = firstDefined(record, ['items', 'foods', 'entries', 'mon', 'món']);
    const list = Array.isArray(rawItems) ? rawItems : [];
    if (!list.length) errors.push('Form dinh dưỡng chưa có món nào.');

    const items = list
      .map((item, index) => normalizeNutritionItem(item, index, errors, warnings))
      .filter((item): item is QuickNutritionItem => Boolean(item));

    if (errors.length) return { action: null, errors, warnings };
    return {
      action: {
        type: 'nutrition',
        meal,
        items,
        source,
        ...(date ? { date } : {}),
      },
      errors,
      warnings,
    };
  }

  const rawExercises = firstDefined(record, ['exercises', 'workout', 'items', 'baiTap', 'bài tập']);
  const list = Array.isArray(rawExercises) ? rawExercises : [];
  if (!list.length) errors.push('Form buổi tập chưa có bài tập nào.');

  const exercises = list
    .map((item, index) => normalizeWorkoutExercise(item, index, errors))
    .filter((item): item is QuickWorkoutExercise => Boolean(item));

  if (errors.length) return { action: null, errors, warnings };
  const titleValue = firstDefined(record, ['title', 'session', 'workoutTitle', 'tenBuoi', 'tên buổi']);
  return {
    action: {
      type: 'workout',
      exercises,
      source,
      ...(date ? { date } : {}),
      ...(typeof titleValue === 'string' && titleValue.trim() ? { title: titleValue.trim() } : {}),
    },
    errors,
    warnings,
  };
}

export function quickNutritionTemplate(date?: string): string {
  return JSON.stringify({
    type: 'nutrition',
    ...(date ? { date } : {}),
    meal: 'lunch',
    items: [
      {
        name: 'Ức gà',
        amount: 150,
        unit: 'g',
        calories: 248,
        protein: 46.5,
        carbs: 0,
        fat: 5.4,
      },
    ],
  }, null, 2);
}

export function quickWorkoutTemplate(date?: string): string {
  return JSON.stringify({
    type: 'workout',
    ...(date ? { date } : {}),
    exercises: [
      {
        name: 'Lat Pulldown',
        weightKg: 40,
        reps: 10,
        sets: 3,
      },
    ],
  }, null, 2);
}
