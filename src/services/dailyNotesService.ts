import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DailyHourlyNote } from '../types';
import {
  mergeDailyNotesForFirstMigration,
  mergeDailyNotesSnapshot,
  type PendingDailyNotes,
} from './dailyNoteSync';

const LEGACY_STORAGE_KEY = 'lich_song_daily_hourly_notes_v1';
const STORAGE_KEY_PREFIX = 'lich_song_daily_hourly_notes_v2';
const PENDING_KEY_PREFIX = 'lich_song_daily_hourly_notes_pending_v1';
const MIGRATION_KEY_PREFIX = 'lich_song_daily_hourly_notes_migrated_v1';
const COLLECTION = 'dailyNotes';

const scope = (userId?: string | null) => userId || 'guest';
export const buildDailyNotesStorageKey = (userId?: string | null) => `${STORAGE_KEY_PREFIX}_${scope(userId)}`;
const pendingStorageKey = (userId?: string | null) => `${PENDING_KEY_PREFIX}_${scope(userId)}`;
const migrationStorageKey = (userId: string) => `${MIGRATION_KEY_PREFIX}_${userId}`;

function safeParse(raw: string | null): DailyHourlyNote[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is DailyHourlyNote =>
        Boolean(item && typeof item.id === 'string' && typeof item.content === 'string' && typeof item.date === 'string'),
    );
  } catch {
    return [];
  }
}

function safePendingParse(raw: string | null): PendingDailyNotes {
  if (!raw) return { upserts: [], deletes: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<PendingDailyNotes>;
    return {
      upserts: safeParse(JSON.stringify(parsed.upserts || [])),
      deletes: Array.isArray(parsed.deletes)
        ? parsed.deletes.filter((id): id is string => typeof id === 'string' && Boolean(id))
        : [],
    };
  } catch {
    return { upserts: [], deletes: [] };
  }
}

function loadPendingDailyNotes(userId?: string | null): PendingDailyNotes {
  if (typeof localStorage === 'undefined') return { upserts: [], deletes: [] };
  return safePendingParse(localStorage.getItem(pendingStorageKey(userId)));
}

function savePendingDailyNotes(userId: string | undefined, pending: PendingDailyNotes): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(pendingStorageKey(userId), JSON.stringify(pending));
  } catch (error) {
    console.warn('Could not cache pending daily notes:', error);
  }
}

function queuePendingUpsert(userId: string | undefined, note: DailyHourlyNote): void {
  const pending = loadPendingDailyNotes(userId);
  savePendingDailyNotes(userId, {
    upserts: [note, ...pending.upserts.filter((item) => item.id !== note.id)],
    deletes: pending.deletes.filter((id) => id !== note.id),
  });
}

function queuePendingDelete(userId: string | undefined, noteId: string): void {
  const pending = loadPendingDailyNotes(userId);
  savePendingDailyNotes(userId, {
    upserts: pending.upserts.filter((item) => item.id !== noteId),
    deletes: [...new Set([...pending.deletes, noteId])],
  });
}

function clearPendingUpsert(userId: string, noteId: string): void {
  const pending = loadPendingDailyNotes(userId);
  savePendingDailyNotes(userId, {
    ...pending,
    upserts: pending.upserts.filter((item) => item.id !== noteId),
  });
}

function clearPendingDelete(userId: string, noteId: string): void {
  const pending = loadPendingDailyNotes(userId);
  savePendingDailyNotes(userId, {
    ...pending,
    deletes: pending.deletes.filter((id) => id !== noteId),
  });
}

export function loadDailyNotesCache(userId?: string | null): DailyHourlyNote[] {
  if (typeof localStorage === 'undefined') return [];
  const scoped = localStorage.getItem(buildDailyNotesStorageKey(userId));
  if (scoped) return safeParse(scoped);

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return [];

  const parsed = safeParse(legacy);
  if (userId && parsed.length) {
    saveDailyNotesCache(parsed, userId);
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Nếu trình duyệt không cho xóa, bản scoped vẫn là nguồn ưu tiên từ đây.
    }
  }
  return parsed;
}

export function saveDailyNotesCache(notes: DailyHourlyNote[], userId?: string | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(buildDailyNotesStorageKey(userId), JSON.stringify(notes));
  } catch (error) {
    console.warn('Could not cache daily notes:', error);
  }
}

export function getCurrentTimeHHmm(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function makeDailyNote(
  content: string,
  date: string,
  time?: string,
  category?: DailyHourlyNote['category'],
): DailyHourlyNote {
  const nowIso = new Date().toISOString();
  return {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date,
    time: time || getCurrentTimeHHmm(),
    content: content.trim(),
    category: category || 'general',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function upsertDailyNoteList(
  current: DailyHourlyNote[],
  item: DailyHourlyNote,
): DailyHourlyNote[] {
  const existingIndex = current.findIndex((n) => n.id === item.id);
  if (existingIndex >= 0) {
    const clone = [...current];
    clone[existingIndex] = { ...clone[existingIndex], ...item, updatedAt: new Date().toISOString() };
    return clone;
  }
  return [item, ...current];
}

export function removeDailyNoteFromList(
  current: DailyHourlyNote[],
  noteId: string,
): DailyHourlyNote[] {
  return current.filter((n) => n.id !== noteId);
}

async function flushPendingDailyNotes(userId: string): Promise<void> {
  const pending = loadPendingDailyNotes(userId);

  for (const note of pending.upserts) {
    await setDoc(doc(db, 'users', userId, COLLECTION, note.id), JSON.parse(JSON.stringify({ ...note, userId })));
    clearPendingUpsert(userId, note.id);
  }

  for (const noteId of pending.deletes) {
    await deleteDoc(doc(db, 'users', userId, COLLECTION, noteId));
    clearPendingDelete(userId, noteId);
  }
}

export async function bootstrapDailyNotes(userId: string): Promise<DailyHourlyNote[]> {
  const cached = loadDailyNotesCache(userId);
  try {
    const snapshot = await getDocs(collection(db, 'users', userId, COLLECTION));
    const remoteNotes = snapshot.docs.map((d) => d.data() as DailyHourlyNote);
    const pending = loadPendingDailyNotes(userId);
    const hasMigrated = typeof localStorage !== 'undefined' && localStorage.getItem(migrationStorageKey(userId)) === 'true';

    let merged: DailyHourlyNote[];
    if (!hasMigrated) {
      merged = mergeDailyNotesForFirstMigration(remoteNotes, cached);
      const remoteIds = new Set(remoteNotes.map((note) => note.id));
      merged.filter((note) => !remoteIds.has(note.id)).forEach((note) => queuePendingUpsert(userId, note));
      try {
        localStorage.setItem(migrationStorageKey(userId), 'true');
      } catch {
        // Không chặn sử dụng nếu storage bị hạn chế.
      }
    } else {
      merged = mergeDailyNotesSnapshot(remoteNotes, pending);
    }

    saveDailyNotesCache(merged, userId);
    void flushPendingDailyNotes(userId).catch((error) => {
      console.warn('Could not flush pending daily notes:', error);
    });
    return merged;
  } catch (error) {
    console.warn('Could not fetch daily notes from Firestore, using cache:', error);
    return mergeDailyNotesSnapshot(cached, loadPendingDailyNotes(userId));
  }
}

export function subscribeDailyNotes(
  userId: string,
  onUpdate: (notes: DailyHourlyNote[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    collection(db, 'users', userId, COLLECTION),
    (snapshot) => {
      const remoteNotes = snapshot.docs.map((d) => d.data() as DailyHourlyNote);
      const merged = mergeDailyNotesSnapshot(remoteNotes, loadPendingDailyNotes(userId));
      saveDailyNotesCache(merged, userId);
      onUpdate(merged);
      void flushPendingDailyNotes(userId).catch((error) => {
        console.warn('Could not retry pending daily notes:', error);
      });
    },
    (error) => {
      console.warn('Firestore dailyNotes subscription error:', error);
      if (onError) onError(error);
    },
  );
}

export async function saveDailyNote(
  userId: string | undefined,
  note: DailyHourlyNote,
): Promise<void> {
  const cached = loadDailyNotesCache(userId);
  const next = upsertDailyNoteList(cached, note);
  saveDailyNotesCache(next, userId);

  if (!userId) return;

  queuePendingUpsert(userId, note);
  try {
    const payload = JSON.parse(JSON.stringify({ ...note, userId }));
    await setDoc(doc(db, 'users', userId, COLLECTION, note.id), payload);
    clearPendingUpsert(userId, note.id);
  } catch (error) {
    console.warn('Could not sync daily note to Firestore; queued for retry:', error);
    throw error;
  }
}

export async function deleteDailyNote(
  userId: string | undefined,
  noteId: string,
): Promise<void> {
  const cached = loadDailyNotesCache(userId);
  const next = removeDailyNoteFromList(cached, noteId);
  saveDailyNotesCache(next, userId);

  if (!userId) return;

  queuePendingDelete(userId, noteId);
  try {
    await deleteDoc(doc(db, 'users', userId, COLLECTION, noteId));
    clearPendingDelete(userId, noteId);
  } catch (error) {
    console.warn('Could not delete daily note from Firestore; queued for retry:', error);
    throw error;
  }
}
