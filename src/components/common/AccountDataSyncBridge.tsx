import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  bootstrapFoodLibraryCloud,
  bootstrapNotificationPreferencesCloud,
  bootstrapNutritionCloud,
  sameFoodLibrary,
  sameNotificationPreferences,
  sameNutritionState,
  subscribeFoodLibraryCloud,
  subscribeNotificationPreferencesCloud,
  subscribeNutritionCloud,
  syncFoodLibraryCloud,
  syncNotificationPreferencesCloud,
  syncNutritionCloud,
} from '../../services/accountDataSyncService';
import { loadFoodLibrary, type FoodItem } from '../../services/foodLibraryService';
import {
  getNotificationPreferences,
  type NotificationPreferences,
} from '../../services/notificationPolicy';
import { syncNotificationTasks } from '../../services/notificationService';
import { loadNutritionState, type NutritionState } from '../../services/nutritionService';

export const ACCOUNT_DATA_REFRESH_EVENT = 'gnoud-account-data-refresh';

const NUTRITION_STORAGE_KEY = 'lich_song_nutrition_v1';
const FOOD_STORAGE_KEY = 'lich_song_food_library_v2';
const NOTIFICATION_STORAGE_KEY = 'lich_song_notification_preferences_v1';
const POLL_MS = 700;

type RefreshDomain = 'nutrition' | 'foods' | 'preferences';

const emitRefresh = (domain: RefreshDomain) => {
  window.dispatchEvent(new CustomEvent(ACCOUNT_DATA_REFRESH_EVENT, { detail: { domain } }));
};

const canonicalFoodPayload = (foods: FoodItem[]) => ({
  version: 2,
  foods: foods.map(({ source: _source, ...food }) => food),
});

const cacheNutrition = (state: NutritionState) => {
  window.localStorage.setItem(NUTRITION_STORAGE_KEY, JSON.stringify(state));
};

const cacheFoods = (foods: FoodItem[]) => {
  window.localStorage.setItem(FOOD_STORAGE_KEY, JSON.stringify(canonicalFoodPayload(foods)));
};

const cachePreferences = (preferences: NotificationPreferences) => {
  window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(preferences));
};

/**
 * Bridges domains that still use localStorage internally into the account's Firestore data.
 * Core tasks/projects/events/goals/habits already sync inside AppContext; reference images
 * already sync inside referenceLibraryService. This component completes the remaining
 * user-entered data without forcing every feature to know about Firestore.
 */
export const AccountDataSyncBridge: React.FC = () => {
  const { user, tasks, addToast } = useApp();
  const nutritionRef = useRef<NutritionState | null>(null);
  const foodsRef = useRef<FoodItem[] | null>(null);
  const preferencesRef = useRef<NotificationPreferences | null>(null);
  const failedRef = useRef(false);
  const tasksRef = useRef(tasks);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    if (!user) {
      nutritionRef.current = null;
      foodsRef.current = null;
      preferencesRef.current = null;
      failedRef.current = false;
      return;
    }

    let disposed = false;
    let unsubscribeNutrition: (() => void) | null = null;
    let unsubscribeFoods: (() => void) | null = null;
    let unsubscribePreferences: (() => void) | null = null;
    let timer: number | null = null;

    const reportFailure = (error: unknown) => {
      console.warn('Account data sync failed:', error);
      if (failedRef.current || disposed) return;
      failedRef.current = true;
      addToast('Một phần dữ liệu chưa đồng bộ. Bản trên thiết bị vẫn được giữ nguyên.', 'warning');
    };

    const applyNutritionFromCloud = (next: NutritionState, refresh = true) => {
      const previous = nutritionRef.current;
      nutritionRef.current = next;
      if (!previous || !sameNutritionState(previous, next)) {
        cacheNutrition(next);
        if (refresh) emitRefresh('nutrition');
      }
    };

    const applyFoodsFromCloud = (next: FoodItem[], refresh = true) => {
      const previous = foodsRef.current;
      foodsRef.current = next;
      if (!previous || !sameFoodLibrary(previous, next)) {
        cacheFoods(next);
        if (refresh) emitRefresh('foods');
      }
    };

    const applyPreferencesFromCloud = (next: NotificationPreferences, refresh = true) => {
      const previous = preferencesRef.current;
      preferencesRef.current = next;
      if (!previous || !sameNotificationPreferences(previous, next)) {
        cachePreferences(next);
        if (refresh) emitRefresh('preferences');
        void syncNotificationTasks(tasksRef.current, next).catch((error) => {
          console.warn('Could not reschedule notifications after preference sync:', error);
        });
      }
    };

    const initialize = async () => {
      try {
        const localNutrition = loadNutritionState();
        const localFoods = loadFoodLibrary();
        const localPreferences = getNotificationPreferences();

        const [nutrition, foods, preferences] = await Promise.all([
          bootstrapNutritionCloud(user.uid, localNutrition),
          bootstrapFoodLibraryCloud(user.uid, localFoods),
          bootstrapNotificationPreferencesCloud(user.uid, localPreferences),
        ]);
        if (disposed) return;

        // Keep bootstrap quiet if this device was the source of the first migration.
        nutritionRef.current = nutrition;
        foodsRef.current = foods;
        preferencesRef.current = preferences;
        if (!sameNutritionState(localNutrition, nutrition)) {
          cacheNutrition(nutrition);
          emitRefresh('nutrition');
        }
        if (!sameFoodLibrary(localFoods, foods)) {
          cacheFoods(foods);
          emitRefresh('foods');
        }
        if (!sameNotificationPreferences(localPreferences, preferences)) {
          cachePreferences(preferences);
          emitRefresh('preferences');
          void syncNotificationTasks(tasksRef.current, preferences).catch(() => undefined);
        }

        unsubscribeNutrition = subscribeNutritionCloud(user.uid, (next) => {
          if (disposed) return;
          applyNutritionFromCloud(next);
        }, reportFailure);
        unsubscribeFoods = subscribeFoodLibraryCloud(user.uid, (next) => {
          if (disposed) return;
          applyFoodsFromCloud(next);
        }, reportFailure);
        unsubscribePreferences = subscribeNotificationPreferencesCloud(user.uid, (next) => {
          if (disposed) return;
          applyPreferencesFromCloud(next);
        }, reportFailure);

        timer = window.setInterval(() => {
          if (disposed) return;

          const localNutritionNow = loadNutritionState();
          const previousNutrition = nutritionRef.current;
          if (previousNutrition && !sameNutritionState(previousNutrition, localNutritionNow)) {
            nutritionRef.current = localNutritionNow; // suppress the Firestore echo from remounting the form
            void syncNutritionCloud(user.uid, previousNutrition, localNutritionNow).catch((error) => {
              nutritionRef.current = previousNutrition;
              reportFailure(error);
            });
          }

          const localFoodsNow = loadFoodLibrary();
          const previousFoods = foodsRef.current;
          if (previousFoods && !sameFoodLibrary(previousFoods, localFoodsNow)) {
            foodsRef.current = localFoodsNow;
            void syncFoodLibraryCloud(user.uid, previousFoods, localFoodsNow).catch((error) => {
              foodsRef.current = previousFoods;
              reportFailure(error);
            });
          }

          const localPreferencesNow = getNotificationPreferences();
          const previousPreferences = preferencesRef.current;
          if (previousPreferences && !sameNotificationPreferences(previousPreferences, localPreferencesNow)) {
            preferencesRef.current = localPreferencesNow;
            void syncNotificationPreferencesCloud(user.uid, localPreferencesNow).catch((error) => {
              preferencesRef.current = previousPreferences;
              reportFailure(error);
            });
          }
        }, POLL_MS);
      } catch (error) {
        reportFailure(error);
      }
    };

    void initialize();

    return () => {
      disposed = true;
      if (timer !== null) window.clearInterval(timer);
      unsubscribeNutrition?.();
      unsubscribeFoods?.();
      unsubscribePreferences?.();
    };
  }, [user?.uid, addToast]);

  return null;
};
