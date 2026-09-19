import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
  type WriteBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  DEFAULT_NUTRITION_PROFILE,
  type DailyMetric,
  type NutritionEntry,
  type NutritionProfile,
  type NutritionState,
} from './nutritionService';
import type { FoodItem } from './foodLibraryService';
import {
  normalizeNotificationPreferences,
  type NotificationPreferences,
} from './notificationPolicy';

const NUTRITION_PROFILE_DOC = 'nutritionProfile';
const FOOD_LIBRARY_META_DOC = 'foodLibrary';
const NOTIFICATION_PREFS_DOC = 'notificationPreferences';
const NUTRITION_ENTRIES_COLLECTION = 'nutritionEntries';
const NUTRITION_METRICS_COLLECTION = 'nutritionMetrics';
const FOOD_LIBRARY_COLLECTION = 'foodLibrary';

const safeDocId = (value: string) => encodeURIComponent(value || 'item');

function firestoreSafe<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => firestoreSafe(item)).filter((item) => item !== undefined) as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      if (item !== undefined) result[key] = firestoreSafe(item);
    });
    return result as T;
  }
  return value;
}

function cleanFood(food: FoodItem): Omit<FoodItem, 'source'> {
  const { source: _source, ...rest } = food;
  return firestoreSafe(rest);
}

function normalizeFoodFromCloud(data: Record<string, unknown>, fallbackId: string): FoodItem | null {
  const id = typeof data.id === 'string' && data.id ? data.id : fallbackId;
  const name = typeof data.name === 'string' ? data.name : '';
  const variants = Array.isArray(data.variants) ? data.variants : [];
  if (!id || !name || variants.length === 0) return null;
  return {
    ...(data as unknown as FoodItem),
    id,
    name,
    source: 'imported',
  };
}

function normalizeNutritionProfile(data: Record<string, unknown> | undefined): NutritionProfile {
  if (!data) return DEFAULT_NUTRITION_PROFILE;
  return {
    ...DEFAULT_NUTRITION_PROFILE,
    ...(data as unknown as Partial<NutritionProfile>),
  };
}

function entryFromCloud(data: Record<string, unknown>, fallbackId: string): NutritionEntry | null {
  const id = typeof data.id === 'string' && data.id ? data.id : fallbackId;
  if (!id || typeof data.date !== 'string' || typeof data.name !== 'string') return null;
  return { ...(data as unknown as NutritionEntry), id };
}

function metricFromCloud(data: Record<string, unknown>, fallbackDate: string): DailyMetric | null {
  const date = typeof data.date === 'string' && data.date ? data.date : fallbackDate;
  if (!date) return null;
  return { ...(data as unknown as DailyMetric), date };
}

type BatchOperation = (batch: WriteBatch) => void;

async function commitOperations(operations: BatchOperation[]): Promise<void> {
  const chunkSize = 400;
  for (let index = 0; index < operations.length; index += chunkSize) {
    const batch = writeBatch(db);
    operations.slice(index, index + chunkSize).forEach((operation) => operation(batch));
    await batch.commit();
  }
}

function diffByKey<T>(
  previous: T[],
  next: T[],
  keyOf: (item: T) => string,
): { upserts: T[]; deletes: T[] } {
  const previousByKey = new Map(previous.map((item) => [keyOf(item), item]));
  const nextByKey = new Map(next.map((item) => [keyOf(item), item]));
  const upserts = next.filter((item) => {
    const before = previousByKey.get(keyOf(item));
    return !before || JSON.stringify(before) !== JSON.stringify(item);
  });
  const deletes = previous.filter((item) => !nextByKey.has(keyOf(item)));
  return { upserts, deletes };
}

function canonicalNutrition(state: NutritionState) {
  return {
    profile: {
      sex: state.profile.sex,
      age: state.profile.age,
      heightCm: state.profile.heightCm,
      weightKg: state.profile.weightKg,
      activityLevel: state.profile.activityLevel,
      goal: state.profile.goal,
      calorieTarget: state.profile.calorieTarget,
      proteinTarget: state.profile.proteinTarget,
      carbTarget: state.profile.carbTarget,
      fatTarget: state.profile.fatTarget,
      stepTarget: state.profile.stepTarget,
    },
    entries: [...state.entries]
      .map((entry) => ({
        id: entry.id,
        date: entry.date,
        name: entry.name,
        meal: entry.meal,
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fat: entry.fat,
        createdAt: entry.createdAt,
        ...(entry.amount !== undefined ? { amount: entry.amount } : {}),
        ...(entry.unit !== undefined ? { unit: entry.unit } : {}),
        ...(entry.servingLabel !== undefined ? { servingLabel: entry.servingLabel } : {}),
        ...(entry.foodId !== undefined ? { foodId: entry.foodId } : {}),
        ...(entry.variantId !== undefined ? { variantId: entry.variantId } : {}),
        ...(entry.portionId !== undefined ? { portionId: entry.portionId } : {}),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    dailyMetrics: [...state.dailyMetrics]
      .map((metric) => ({
        date: metric.date,
        ...(metric.steps !== undefined ? { steps: metric.steps } : {}),
        ...(metric.weightKg !== undefined ? { weightKg: metric.weightKg } : {}),
        updatedAt: metric.updatedAt,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

function canonicalFoods(foods: FoodItem[]) {
  return [...foods]
    .map((food) => ({
      id: food.id,
      name: food.name,
      ...(food.category ? { category: food.category } : {}),
      variants: [...food.variants]
        .map((variant) => ({
          id: variant.id,
          label: variant.label,
          amount: variant.amount,
          unit: variant.unit,
          ...(variant.grams !== undefined ? { grams: variant.grams } : {}),
          calories: variant.calories,
          protein: variant.protein,
          carbs: variant.carbs,
          fat: variant.fat,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      ...(food.portions?.length
        ? {
            portions: [...food.portions]
              .map((portion) => ({
                id: portion.id,
                label: portion.label,
                amount: portion.amount,
                unit: portion.unit,
                multiplier: portion.multiplier,
              }))
              .sort((a, b) => a.id.localeCompare(b.id)),
          }
        : {}),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
export function sameNutritionState(left: NutritionState, right: NutritionState): boolean {
  return JSON.stringify(canonicalNutrition(left)) === JSON.stringify(canonicalNutrition(right));
}

export function sameFoodLibrary(left: FoodItem[], right: FoodItem[]): boolean {
  return JSON.stringify(canonicalFoods(left)) === JSON.stringify(canonicalFoods(right));
}

export function sameNotificationPreferences(
  left: NotificationPreferences,
  right: NotificationPreferences,
): boolean {
  return JSON.stringify(normalizeNotificationPreferences(left)) === JSON.stringify(normalizeNotificationPreferences(right));
}

function nutritionProfileRef(userId: string) {
  return doc(db, 'users', userId, 'appState', NUTRITION_PROFILE_DOC);
}

function nutritionEntriesRef(userId: string) {
  return collection(db, 'users', userId, NUTRITION_ENTRIES_COLLECTION);
}

function nutritionMetricsRef(userId: string) {
  return collection(db, 'users', userId, NUTRITION_METRICS_COLLECTION);
}

function foodLibraryRef(userId: string) {
  return collection(db, 'users', userId, FOOD_LIBRARY_COLLECTION);
}

function foodLibraryMetaRef(userId: string) {
  return doc(db, 'users', userId, 'appState', FOOD_LIBRARY_META_DOC);
}

function notificationPreferencesRef(userId: string) {
  return doc(db, 'users', userId, 'appState', NOTIFICATION_PREFS_DOC);
}

export async function bootstrapNutritionCloud(
  userId: string,
  local: NutritionState,
): Promise<NutritionState> {
  const [profileSnapshot, entriesSnapshot, metricsSnapshot] = await Promise.all([
    getDoc(nutritionProfileRef(userId)),
    getDocs(nutritionEntriesRef(userId)),
    getDocs(nutritionMetricsRef(userId)),
  ]);

  // Missing profile means this account has never migrated nutrition data.
  if (!profileSnapshot.exists()) {
    await syncNutritionCloud(
      userId,
      { profile: DEFAULT_NUTRITION_PROFILE, entries: [], dailyMetrics: [] },
      local,
      true,
    );
    return local;
  }

  const entries = entriesSnapshot.docs
    .map((snapshot) => entryFromCloud(snapshot.data(), decodeURIComponent(snapshot.id)))
    .filter((entry): entry is NutritionEntry => Boolean(entry));
  const dailyMetrics = metricsSnapshot.docs
    .map((snapshot) => metricFromCloud(snapshot.data(), decodeURIComponent(snapshot.id)))
    .filter((metric): metric is DailyMetric => Boolean(metric));

  return {
    profile: normalizeNutritionProfile(profileSnapshot.data()),
    entries,
    dailyMetrics,
  };
}

export async function syncNutritionCloud(
  userId: string,
  previous: NutritionState,
  next: NutritionState,
  forceProfile = false,
): Promise<void> {
  const operations: BatchOperation[] = [];

  if (forceProfile || JSON.stringify(previous.profile) !== JSON.stringify(next.profile)) {
    operations.push((batch) => batch.set(nutritionProfileRef(userId), firestoreSafe(next.profile)));
  }

  const entryDiff = diffByKey(previous.entries, next.entries, (entry) => entry.id);
  entryDiff.upserts.forEach((entry) => {
    operations.push((batch) => batch.set(
      doc(nutritionEntriesRef(userId), safeDocId(entry.id)),
      firestoreSafe(entry),
    ));
  });
  entryDiff.deletes.forEach((entry) => {
    operations.push((batch) => batch.delete(doc(nutritionEntriesRef(userId), safeDocId(entry.id))));
  });

  const metricDiff = diffByKey(previous.dailyMetrics, next.dailyMetrics, (metric) => metric.date);
  metricDiff.upserts.forEach((metric) => {
    operations.push((batch) => batch.set(
      doc(nutritionMetricsRef(userId), safeDocId(metric.date)),
      firestoreSafe(metric),
    ));
  });
  metricDiff.deletes.forEach((metric) => {
    operations.push((batch) => batch.delete(doc(nutritionMetricsRef(userId), safeDocId(metric.date))));
  });

  await commitOperations(operations);
}

export function subscribeNutritionCloud(
  userId: string,
  onData: (state: NutritionState) => void,
  onError?: (error: unknown) => void,
): () => void {
  let profile = DEFAULT_NUTRITION_PROFILE;
  let entries: NutritionEntry[] = [];
  let dailyMetrics: DailyMetric[] = [];
  const ready = new Set<'profile' | 'entries' | 'metrics'>();

  const emit = () => {
    if (ready.size === 3) onData({ profile, entries, dailyMetrics });
  };
  const fail = (error: unknown) => {
    console.warn('Nutrition realtime sync failed:', error);
    onError?.(error);
  };

  const unsubscribers = [
    onSnapshot(
      nutritionProfileRef(userId),
      (snapshot) => {
        profile = snapshot.exists() ? normalizeNutritionProfile(snapshot.data()) : DEFAULT_NUTRITION_PROFILE;
        ready.add('profile');
        emit();
      },
      fail,
    ),
    onSnapshot(
      nutritionEntriesRef(userId),
      (snapshot) => {
        entries = snapshot.docs
          .map((item) => entryFromCloud(item.data(), decodeURIComponent(item.id)))
          .filter((item): item is NutritionEntry => Boolean(item));
        ready.add('entries');
        emit();
      },
      fail,
    ),
    onSnapshot(
      nutritionMetricsRef(userId),
      (snapshot) => {
        dailyMetrics = snapshot.docs
          .map((item) => metricFromCloud(item.data(), decodeURIComponent(item.id)))
          .filter((item): item is DailyMetric => Boolean(item));
        ready.add('metrics');
        emit();
      },
      fail,
    ),
  ];

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export async function bootstrapFoodLibraryCloud(userId: string, local: FoodItem[]): Promise<FoodItem[]> {
  const [metaSnapshot, foodsSnapshot] = await Promise.all([
    getDoc(foodLibraryMetaRef(userId)),
    getDocs(foodLibraryRef(userId)),
  ]);

  if (!metaSnapshot.exists()) {
    await syncFoodLibraryCloud(userId, [], local, true);
    return local;
  }

  return foodsSnapshot.docs
    .map((snapshot) => normalizeFoodFromCloud(snapshot.data(), decodeURIComponent(snapshot.id)))
    .filter((food): food is FoodItem => Boolean(food))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

export async function syncFoodLibraryCloud(
  userId: string,
  previous: FoodItem[],
  next: FoodItem[],
  ensureInitialized = false,
): Promise<void> {
  const cleanPrevious = canonicalFoods(previous) as FoodItem[];
  const cleanNext = canonicalFoods(next) as FoodItem[];
  const diff = diffByKey(cleanPrevious, cleanNext, (food) => food.id);
  const operations: BatchOperation[] = [];

  diff.upserts.forEach((food) => {
    operations.push((batch) => batch.set(
      doc(foodLibraryRef(userId), safeDocId(food.id)),
      firestoreSafe(food),
    ));
  });
  diff.deletes.forEach((food) => {
    operations.push((batch) => batch.delete(doc(foodLibraryRef(userId), safeDocId(food.id))));
  });

  if (ensureInitialized) {
    operations.push((batch) => batch.set(foodLibraryMetaRef(userId), { initialized: true }));
  }
  await commitOperations(operations);
}

export function subscribeFoodLibraryCloud(
  userId: string,
  onData: (foods: FoodItem[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    foodLibraryRef(userId),
    (snapshot) => {
      const foods = snapshot.docs
        .map((item) => normalizeFoodFromCloud(item.data(), decodeURIComponent(item.id)))
        .filter((item): item is FoodItem => Boolean(item))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      onData(foods);
    },
    (error) => {
      console.warn('Food library realtime sync failed:', error);
      onError?.(error);
    },
  );
}

export async function bootstrapNotificationPreferencesCloud(
  userId: string,
  local: NotificationPreferences,
): Promise<NotificationPreferences> {
  const snapshot = await getDoc(notificationPreferencesRef(userId));
  if (!snapshot.exists()) {
    const normalized = normalizeNotificationPreferences(local);
    await setDoc(notificationPreferencesRef(userId), normalized);
    return normalized;
  }
  return normalizeNotificationPreferences(snapshot.data() as Partial<NotificationPreferences>);
}

export async function syncNotificationPreferencesCloud(
  userId: string,
  preferences: NotificationPreferences,
): Promise<void> {
  await setDoc(notificationPreferencesRef(userId), normalizeNotificationPreferences(preferences));
}

export function subscribeNotificationPreferencesCloud(
  userId: string,
  onData: (preferences: NotificationPreferences) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    notificationPreferencesRef(userId),
    (snapshot) => {
      if (!snapshot.exists()) return;
      onData(normalizeNotificationPreferences(snapshot.data() as Partial<NotificationPreferences>));
    },
    (error) => {
      console.warn('Notification preference realtime sync failed:', error);
      onError?.(error);
    },
  );
}

// Kept explicit rather than a generic delete helper so accidental calls cannot erase whole domains.
export async function clearNotificationPreferencesCloud(userId: string): Promise<void> {
  await deleteDoc(notificationPreferencesRef(userId));
}
