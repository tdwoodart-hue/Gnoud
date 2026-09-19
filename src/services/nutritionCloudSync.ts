import { useEffect, useState } from 'react';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { NutritionState } from './nutritionService';
import type { FoodItem } from './foodLibraryService';

const NUTRITION_STORAGE_KEY = 'lich_song_nutrition_v1';
const FOOD_STORAGE_KEY = 'lich_song_food_library_v1';
const POLL_MS = 350;
const WRITE_DEBOUNCE_MS = 450;

interface CloudEnvelope<T> {
  schemaVersion: 1;
  payload: T;
  updatedAtMs: number;
  serverUpdatedAt?: unknown;
}

type SyncKind = 'nutrition' | 'foods';

interface SyncTarget<T> {
  kind: SyncKind;
  storageKey: string;
  ref: DocumentReference;
  mergeInitial: (local: T, remote: T) => T;
}

interface TargetRuntime {
  lastSeenLocalRaw: string | null;
  localChangedAtMs: number;
  writeTimer: ReturnType<typeof window.setTimeout> | null;
}

const parseJson = <T,>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const stringify = (value: unknown) => JSON.stringify(value);

const nutritionActivityScore = (state: NutritionState) =>
  (Array.isArray(state.entries) ? state.entries.length : 0) +
  (Array.isArray(state.dailyMetrics) ? state.dailyMetrics.length : 0);

/**
 * First-install merge only.
 * This prevents the first device that opens after deployment from wiping useful
 * local history on another device before cloud sync has existed there.
 */
export function mergeInitialNutrition(local: NutritionState, remote: NutritionState): NutritionState {
  const entries = new Map<string, NutritionState['entries'][number]>();
  [...(remote.entries || []), ...(local.entries || [])].forEach((entry) => entries.set(entry.id, entry));

  const metrics = new Map<string, NutritionState['dailyMetrics'][number]>();
  [...(remote.dailyMetrics || []), ...(local.dailyMetrics || [])].forEach((metric) => {
    const previous = metrics.get(metric.date);
    if (!previous || (metric.updatedAt || '') >= (previous.updatedAt || '')) {
      metrics.set(metric.date, metric);
    }
  });

  const preferLocalProfile = nutritionActivityScore(local) > nutritionActivityScore(remote);

  return {
    profile: preferLocalProfile ? local.profile : remote.profile,
    entries: [...entries.values()],
    dailyMetrics: [...metrics.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function mergeInitialFoods(local: FoodItem[], remote: FoodItem[]): FoodItem[] {
  const byId = new Map<string, FoodItem>();
  [...remote, ...local].forEach((food) => byId.set(food.id, food));
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

async function writeEnvelope<T>(ref: DocumentReference, payload: T): Promise<number> {
  const updatedAtMs = Date.now();
  const envelope: CloudEnvelope<T> = {
    schemaVersion: 1,
    payload,
    updatedAtMs,
    serverUpdatedAt: serverTimestamp(),
  };
  await setDoc(ref, envelope);
  return updatedAtMs;
}

function cloudPayload<T>(value: unknown): CloudEnvelope<T> | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<CloudEnvelope<T>>;
  if (candidate.payload === undefined) return null;
  return {
    schemaVersion: 1,
    payload: candidate.payload,
    updatedAtMs: typeof candidate.updatedAtMs === 'number' ? candidate.updatedAtMs : 0,
    serverUpdatedAt: candidate.serverUpdatedAt,
  };
}

/**
 * Syncs the nutrition state and food library through the signed-in user's
 * Firestore area. NutritionView itself can keep using localStorage; this bridge
 * mirrors local changes to cloud and remounts the view only when another device
 * sends genuinely different data.
 */
export function useNutritionCloudSync(userId: string | null): number {
  const [remoteVersion, setRemoteVersion] = useState(0);

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;

    let disposed = false;
    const unsubscribers: Array<() => void> = [];
    const runtimes = new Map<SyncKind, TargetRuntime>();

    const targets: Array<SyncTarget<unknown>> = [
      {
        kind: 'nutrition',
        storageKey: NUTRITION_STORAGE_KEY,
        ref: doc(db, 'users', userId, 'syncedData', 'nutrition'),
        mergeInitial: (local, remote) => mergeInitialNutrition(
          local as NutritionState,
          remote as NutritionState,
        ),
      },
      {
        kind: 'foods',
        storageKey: FOOD_STORAGE_KEY,
        ref: doc(db, 'users', userId, 'syncedData', 'foodLibrary'),
        mergeInitial: (local, remote) => mergeInitialFoods(
          local as FoodItem[],
          remote as FoodItem[],
        ),
      },
    ];

    const applyRemote = (target: SyncTarget<unknown>, envelope: CloudEnvelope<unknown>) => {
      const runtime = runtimes.get(target.kind);
      if (!runtime) return;

      // A local edit that has not reached cloud yet is newer than an older
      // snapshot; do not overwrite the text field while the user is typing.
      if (runtime.localChangedAtMs > envelope.updatedAtMs) return;

      const remoteRaw = stringify(envelope.payload);
      const localRaw = window.localStorage.getItem(target.storageKey);
      if (remoteRaw === localRaw) {
        runtime.lastSeenLocalRaw = localRaw;
        runtime.localChangedAtMs = 0;
        return;
      }

      if (runtime.writeTimer) {
        window.clearTimeout(runtime.writeTimer);
        runtime.writeTimer = null;
      }
      window.localStorage.setItem(target.storageKey, remoteRaw);
      runtime.lastSeenLocalRaw = remoteRaw;
      runtime.localChangedAtMs = 0;
      setRemoteVersion((value) => value + 1);
    };

    const initializeTarget = async (target: SyncTarget<unknown>) => {
      const initialLocalRaw = window.localStorage.getItem(target.storageKey);
      runtimes.set(target.kind, {
        lastSeenLocalRaw: initialLocalRaw,
        localChangedAtMs: 0,
        writeTimer: null,
      });

      try {
        const snapshot = await getDoc(target.ref);
        if (disposed) return;

        const remote = snapshot.exists()
          ? cloudPayload<unknown>(snapshot.data())
          : null;
        const local = parseJson<unknown>(initialLocalRaw);

        if (!remote && local !== null) {
          const writtenAt = await writeEnvelope(target.ref, local);
          const runtime = runtimes.get(target.kind);
          if (runtime) runtime.localChangedAtMs = writtenAt;
        } else if (remote && local === null) {
          applyRemote(target, remote);
        } else if (remote && local !== null) {
          const merged = target.mergeInitial(local, remote.payload);
          const mergedRaw = stringify(merged);
          const remoteRaw = stringify(remote.payload);

          if (mergedRaw !== initialLocalRaw) {
            window.localStorage.setItem(target.storageKey, mergedRaw);
            const runtime = runtimes.get(target.kind);
            if (runtime) runtime.lastSeenLocalRaw = mergedRaw;
            setRemoteVersion((value) => value + 1);
          }

          if (mergedRaw !== remoteRaw) {
            const writtenAt = await writeEnvelope(target.ref, merged);
            const runtime = runtimes.get(target.kind);
            if (runtime) runtime.localChangedAtMs = writtenAt;
          }
        }
      } catch (error) {
        console.warn(`Could not initialize ${target.kind} cloud sync:`, error);
      }

      if (disposed) return;
      const unsubscribe = onSnapshot(
        target.ref,
        (snapshot) => {
          if (!snapshot.exists()) return;
          const envelope = cloudPayload<unknown>(snapshot.data());
          if (envelope) applyRemote(target, envelope);
        },
        (error) => console.warn(`${target.kind} realtime sync error:`, error),
      );
      unsubscribers.push(unsubscribe);
    };

    void Promise.all(targets.map((target) => initializeTarget(target)));

    const interval = window.setInterval(() => {
      targets.forEach((target) => {
        const runtime = runtimes.get(target.kind);
        if (!runtime) return;
        const localRaw = window.localStorage.getItem(target.storageKey);
        if (localRaw === runtime.lastSeenLocalRaw) return;

        runtime.lastSeenLocalRaw = localRaw;
        runtime.localChangedAtMs = Date.now();

        if (runtime.writeTimer) window.clearTimeout(runtime.writeTimer);
        if (!localRaw) return;

        runtime.writeTimer = window.setTimeout(() => {
          const latestRaw = window.localStorage.getItem(target.storageKey);
          const payload = parseJson<unknown>(latestRaw);
          if (payload === null || disposed) return;

          void writeEnvelope(target.ref, payload)
            .then((writtenAt) => {
              const latestRuntime = runtimes.get(target.kind);
              if (latestRuntime) latestRuntime.localChangedAtMs = writtenAt;
            })
            .catch((error) => console.warn(`Could not upload ${target.kind} data:`, error));
        }, WRITE_DEBOUNCE_MS);
      });
    }, POLL_MS);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      runtimes.forEach((runtime) => {
        if (runtime.writeTimer) window.clearTimeout(runtime.writeTimer);
      });
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [userId]);

  return remoteVersion;
}
