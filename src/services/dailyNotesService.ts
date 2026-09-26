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

const STORAGE_KEY = 'lich_song_daily_hourly_notes_v1';
const COLLECTION = 'dailyNotes';

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

export function loadDailyNotesCache(): DailyHourlyNote[] {
  if (typeof localStorage === 'undefined') return [];
  return safeParse(localStorage.getItem(STORAGE_KEY));
}

export function saveDailyNotesCache(notes: DailyHourlyNote[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
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

export async function bootstrapDailyNotes(userId: string): Promise<DailyHourlyNote[]> {
  const cached = loadDailyNotesCache();
  try {
    const snapshot = await getDocs(collection(db, 'users', userId, COLLECTION));
    if (snapshot.empty) {
      return cached;
    }
    const remoteNotes = snapshot.docs.map((d) => d.data() as DailyHourlyNote);
    // Merge remote with cache
    const remoteIds = new Set(remoteNotes.map((n) => n.id));
    const merged = [...remoteNotes, ...cached.filter((n) => !remoteIds.has(n.id))];
    saveDailyNotesCache(merged);
    return merged;
  } catch (error) {
    console.warn('Could not fetch daily notes from Firestore, using cache:', error);
    return cached;
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
      saveDailyNotesCache(remoteNotes);
      onUpdate(remoteNotes);
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
  const cached = loadDailyNotesCache();
  const next = upsertDailyNoteList(cached, note);
  saveDailyNotesCache(next);

  if (userId) {
    try {
      const payload = JSON.parse(JSON.stringify({ ...note, userId }));
      await setDoc(doc(db, 'users', userId, COLLECTION, note.id), payload);
    } catch (error) {
      console.warn('Could not sync daily note to Firestore:', error);
    }
  }
}

export async function deleteDailyNote(
  userId: string | undefined,
  noteId: string,
): Promise<void> {
  const cached = loadDailyNotesCache();
  const next = removeDailyNoteFromList(cached, noteId);
  saveDailyNotesCache(next);

  if (userId) {
    try {
      await deleteDoc(doc(db, 'users', userId, COLLECTION, noteId));
    } catch (error) {
      console.warn('Could not delete daily note from Firestore:', error);
    }
  }
}
