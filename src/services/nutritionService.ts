export type NutritionSex = 'male' | 'female';
export type NutritionGoal = 'recomp' | 'cut' | 'maintain' | 'gain';
export type NutritionActivityLevel = 'sedentary' | 'desk_training' | 'moderate' | 'active';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface NutritionProfile {
  sex: NutritionSex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: NutritionActivityLevel;
  goal: NutritionGoal;
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  stepTarget: number;
}

export interface NutritionEntry {
  id: string;
  date: string;
  name: string;
  meal: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
}

export interface DailyMetric {
  date: string;
  steps?: number;
  weightKg?: number;
  updatedAt: string;
}

export interface NutritionState {
  profile: NutritionProfile;
  entries: NutritionEntry[];
  dailyMetrics: DailyMetric[];
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const STORAGE_KEY = 'lich_song_nutrition_v1';

const ACTIVITY_FACTORS: Record<NutritionActivityLevel, number> = {
  sedentary: 1.2,
  desk_training: 1.375,
  moderate: 1.55,
  active: 1.725,
};

const GOAL_ADJUSTMENT: Record<NutritionGoal, number> = {
  recomp: -100,
  cut: -350,
  maintain: 0,
  gain: 200,
};

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

export const DEFAULT_NUTRITION_PROFILE: NutritionProfile = {
  sex: 'male',
  age: 22,
  heightCm: 169,
  weightKg: 65.5,
  activityLevel: 'desk_training',
  goal: 'recomp',
  calorieTarget: 2100,
  proteinTarget: 130,
  carbTarget: 270,
  fatTarget: 55,
  stepTarget: 8000,
};

export const DEFAULT_NUTRITION_STATE: NutritionState = {
  profile: DEFAULT_NUTRITION_PROFILE,
  entries: [],
  dailyMetrics: [],
};

export function toLocalIso(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromLocalIso(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function calculateBmr(profile: NutritionProfile): number {
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return base + (profile.sex === 'male' ? 5 : -161);
}

export function calculateTdee(profile: NutritionProfile): number {
  return calculateBmr(profile) * ACTIVITY_FACTORS[profile.activityLevel];
}

export function recommendedTargets(profile: NutritionProfile): Pick<
  NutritionProfile,
  'calorieTarget' | 'proteinTarget' | 'carbTarget' | 'fatTarget'
> {
  const tdee = calculateTdee(profile);
  const calorieTarget = Math.max(1200, roundTo(tdee + GOAL_ADJUSTMENT[profile.goal], 50));
  const proteinTarget = Math.max(60, roundTo(profile.weightKg * 2, 5));
  const fatTarget = Math.max(40, roundTo(profile.weightKg * 0.85, 5));
  const remainingCalories = Math.max(0, calorieTarget - proteinTarget * 4 - fatTarget * 9);
  const carbTarget = Math.max(50, roundTo(remainingCalories / 4, 5));

  return {
    calorieTarget,
    proteinTarget,
    carbTarget,
    fatTarget,
  };
}

export function getTotals(entries: NutritionEntry[]): NutritionTotals {
  return entries.reduce<NutritionTotals>(
    (total, entry) => ({
      calories: total.calories + entry.calories,
      protein: total.protein + entry.protein,
      carbs: total.carbs + entry.carbs,
      fat: total.fat + entry.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function getEntriesForDate(entries: NutritionEntry[], date: string): NutritionEntry[] {
  return entries
    .filter((entry) => entry.date === date)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function removeNutritionEntry(entries: NutritionEntry[], id: string): NutritionEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

export function getDailyMetric(metrics: DailyMetric[], date: string): DailyMetric | undefined {
  return metrics.find((metric) => metric.date === date);
}

export function upsertDailyMetric(
  metrics: DailyMetric[],
  date: string,
  updates: Partial<Pick<DailyMetric, 'steps' | 'weightKg'>>,
): DailyMetric[] {
  const current = getDailyMetric(metrics, date);
  const next: DailyMetric = {
    date,
    updatedAt: new Date().toISOString(),
    ...(current || {}),
    ...updates,
  };

  if (next.steps === undefined && next.weightKg === undefined) {
    return metrics.filter((metric) => metric.date !== date);
  }

  return current
    ? metrics.map((metric) => (metric.date === date ? next : metric))
    : [...metrics, next];
}

export function getPreviousWeight(metrics: DailyMetric[], date: string): DailyMetric | undefined {
  return [...metrics]
    .filter((metric) => metric.date < date && typeof metric.weightKg === 'number' && metric.weightKg > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function getWeekDates(anchor: Date): Date[] {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const weekday = start.getDay();
  const offsetToMonday = weekday === 0 ? -6 : 1 - weekday;
  start.setDate(start.getDate() + offsetToMonday);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function isValidProfile(value: unknown): value is Omit<NutritionProfile, 'stepTarget'> & { stepTarget?: number } {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Partial<NutritionProfile>;
  return (
    (profile.sex === 'male' || profile.sex === 'female') &&
    typeof profile.age === 'number' &&
    typeof profile.heightCm === 'number' &&
    typeof profile.weightKg === 'number' &&
    typeof profile.activityLevel === 'string' &&
    typeof profile.goal === 'string' &&
    typeof profile.calorieTarget === 'number' &&
    typeof profile.proteinTarget === 'number' &&
    typeof profile.carbTarget === 'number' &&
    typeof profile.fatTarget === 'number'
  );
}

function isValidDailyMetric(value: unknown): value is DailyMetric {
  if (!value || typeof value !== 'object') return false;
  const metric = value as Partial<DailyMetric>;
  return (
    typeof metric.date === 'string' &&
    typeof metric.updatedAt === 'string' &&
    (metric.steps === undefined || typeof metric.steps === 'number') &&
    (metric.weightKg === undefined || typeof metric.weightKg === 'number')
  );
}

export function loadNutritionState(): NutritionState {
  if (typeof window === 'undefined') return DEFAULT_NUTRITION_STATE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NUTRITION_STATE;
    const parsed = JSON.parse(raw) as Partial<NutritionState>;
    const profile = isValidProfile(parsed.profile)
      ? {
          ...DEFAULT_NUTRITION_PROFILE,
          ...parsed.profile,
          stepTarget:
            typeof parsed.profile.stepTarget === 'number' && parsed.profile.stepTarget > 0
              ? parsed.profile.stepTarget
              : DEFAULT_NUTRITION_PROFILE.stepTarget,
        }
      : DEFAULT_NUTRITION_PROFILE;

    return {
      profile,
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      dailyMetrics: Array.isArray(parsed.dailyMetrics)
        ? parsed.dailyMetrics.filter(isValidDailyMetric)
        : [],
    };
  } catch (error) {
    console.warn('Could not load nutrition data:', error);
    return DEFAULT_NUTRITION_STATE;
  }
}

export function saveNutritionState(state: NutritionState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Could not save nutrition data:', error);
  }
}
