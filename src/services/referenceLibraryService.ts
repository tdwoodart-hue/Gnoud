import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { canonicalReferenceKey, referenceLibraryId, referenceSubject } from './manualReferenceService';

export interface ReferenceLibraryItem {
  id: string;
  key: string;
  label: string;
  dataUrl: string;
  fileName?: string;
  source?: 'upload' | 'url';
  updatedAt: string;
}

const STORAGE_KEY = 'lich_song_reference_library_v1';
const COLLECTION = 'referenceLibrary';

const safeParse = (value: string | null): ReferenceLibraryItem[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) =>
      item &&
      typeof item.id === 'string' &&
      typeof item.key === 'string' &&
      typeof item.label === 'string' &&
      typeof item.dataUrl === 'string',
    );
  } catch {
    return [];
  }
};

export function loadReferenceLibraryCache(): ReferenceLibraryItem[] {
  if (typeof localStorage === 'undefined') return [];
  return safeParse(localStorage.getItem(STORAGE_KEY));
}

export function saveReferenceLibraryCache(items: ReferenceLibraryItem[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn('Could not cache reference library:', error);
  }
}

export function makeReferenceLibraryItem(
  label: string,
  dataUrl: string,
  fileName?: string,
  updatedAt = new Date().toISOString(),
): ReferenceLibraryItem {
  return {
    id: referenceLibraryId(label),
    key: canonicalReferenceKey(label),
    label: referenceSubject(label),
    dataUrl,
    ...(fileName ? { fileName } : {}),
    source: 'upload',
    updatedAt,
  };
}

export function normalizeReferenceImageUrl(value: string): string {
  const input = value.trim();
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Link ảnh không hợp lệ.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Link ảnh phải bắt đầu bằng http:// hoặc https://');
  }
  return url.toString();
}

export function makeReferenceLibraryItemFromUrl(
  label: string,
  imageUrl: string,
  updatedAt = new Date().toISOString(),
): ReferenceLibraryItem {
  return {
    id: referenceLibraryId(label),
    key: canonicalReferenceKey(label),
    label: referenceSubject(label),
    dataUrl: normalizeReferenceImageUrl(imageUrl),
    source: 'url',
    updatedAt,
  };
}

export function getReferenceLibraryItem(
  items: ReferenceLibraryItem[],
  label: string,
): ReferenceLibraryItem | undefined {
  const id = referenceLibraryId(label);
  return items.find((item) => item.id === id);
}

export function upsertReferenceLibraryItem(
  items: ReferenceLibraryItem[],
  next: ReferenceLibraryItem,
): ReferenceLibraryItem[] {
  return [...items.filter((item) => item.id !== next.id), next]
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
}

export function removeReferenceLibraryItem(
  items: ReferenceLibraryItem[],
  id: string,
): ReferenceLibraryItem[] {
  return items.filter((item) => item.id !== id);
}

const fromFirestore = (data: Record<string, unknown>, id: string): ReferenceLibraryItem | null => {
  if (typeof data.dataUrl !== 'string') return null;
  const label = typeof data.label === 'string' ? data.label : id;
  const key = typeof data.key === 'string' ? data.key : canonicalReferenceKey(label);
  return {
    id,
    key,
    label,
    dataUrl: data.dataUrl,
    ...(typeof data.fileName === 'string' ? { fileName: data.fileName } : {}),
    ...(data.source === 'url' || data.source === 'upload' ? { source: data.source } : {}),
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date(0).toISOString(),
  };
};

export async function bootstrapReferenceLibrary(userId: string): Promise<ReferenceLibraryItem[]> {
  const local = loadReferenceLibraryCache();
  const snapshot = await getDocs(collection(db, 'users', userId, COLLECTION));
  const cloud = snapshot.docs
    .map((item) => fromFirestore(item.data(), item.id))
    .filter((item): item is ReferenceLibraryItem => Boolean(item));

  const merged = new Map<string, ReferenceLibraryItem>();
  cloud.forEach((item) => merged.set(item.id, item));

  const batch = writeBatch(db);
  let writes = 0;

  local.forEach((item) => {
    const cloudItem = merged.get(item.id);
    const localIsNewer = !cloudItem || item.updatedAt > cloudItem.updatedAt;
    if (localIsNewer) {
      merged.set(item.id, item);
      batch.set(doc(db, 'users', userId, COLLECTION, item.id), { ...item, userId });
      writes += 1;
    }
  });

  if (writes > 0) await batch.commit();

  const result = [...merged.values()].sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  saveReferenceLibraryCache(result);
  return result;
}

export function subscribeReferenceLibrary(
  userId: string,
  onData: (items: ReferenceLibraryItem[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    collection(db, 'users', userId, COLLECTION),
    (snapshot) => {
      const items = snapshot.docs
        .map((item) => fromFirestore(item.data(), item.id))
        .filter((item): item is ReferenceLibraryItem => Boolean(item))
        .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
      saveReferenceLibraryCache(items);
      onData(items);
    },
    (error) => {
      console.warn('Reference library realtime sync failed:', error);
      onError?.(error);
    },
  );
}

export async function saveReferenceLibraryItem(
  userId: string | undefined,
  item: ReferenceLibraryItem,
): Promise<void> {
  const local = upsertReferenceLibraryItem(loadReferenceLibraryCache(), item);
  saveReferenceLibraryCache(local);
  if (!userId) return;
  await setDoc(doc(db, 'users', userId, COLLECTION, item.id), { ...item, userId });
}

export async function deleteReferenceLibraryItem(
  userId: string | undefined,
  itemId: string,
): Promise<void> {
  saveReferenceLibraryCache(removeReferenceLibraryItem(loadReferenceLibraryCache(), itemId));
  if (!userId) return;
  await deleteDoc(doc(db, 'users', userId, COLLECTION, itemId));
}
