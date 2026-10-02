import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  deleteObject,
  getBlob,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import {
  loadReaderBinary,
  pickLatestReaderPosition,
  saveReaderBinary,
  type ReaderBook,
} from './readerService';

export type ReaderCloudStatus = 'idle' | 'syncing' | 'synced' | 'error';

function firestoreSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readerPath(userId: string, book: ReaderBook): string {
  const extension = book.format === 'pdf' ? 'pdf' : book.format === 'epub' ? 'epub' : 'txt';
  return `users/${userId}/reader/${book.id}/source.${extension}`;
}

function coverPath(userId: string, book: ReaderBook): string {
  return `users/${userId}/reader/${book.id}/cover`;
}

function contentTypeForBook(book: ReaderBook): string {
  if (book.format === 'pdf') return 'application/pdf';
  if (book.format === 'epub') return 'application/epub+zip';
  return 'text/plain; charset=utf-8';
}

function toCloudMetadata(book: ReaderBook): ReaderBook {
  return firestoreSafe({
    ...book,
    // Nội dung lớn/file nhị phân nằm ở Storage. Firestore chỉ giữ metadata + tiến độ.
    content: '',
  });
}

function fromCloudMetadata(value: Record<string, unknown>): ReaderBook {
  const { userId: _userId, ...rest } = value;
  return rest as unknown as ReaderBook;
}

function newer(left?: string, right?: string): boolean {
  const l = left ? Date.parse(left) : 0;
  const r = right ? Date.parse(right) : 0;
  return l >= r;
}

export async function fetchCloudReaderBooks(userId: string): Promise<ReaderBook[]> {
  const snapshot = await getDocs(collection(db, 'users', userId, 'readerBooks'));
  return snapshot.docs.map((entry) => fromCloudMetadata(entry.data()));
}

export function subscribeCloudReaderBooks(
  userId: string,
  onBooks: (books: ReaderBook[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    collection(db, 'users', userId, 'readerBooks'),
    (snapshot) => onBooks(snapshot.docs.map((entry) => fromCloudMetadata(entry.data()))),
    (error) => {
      console.warn('Reader cloud subscription failed:', error);
      onError?.(error);
    },
  );
}

export async function saveCloudReaderMetadata(userId: string, book: ReaderBook): Promise<void> {
  await setDoc(
    doc(db, 'users', userId, 'readerBooks', book.id),
    firestoreSafe({ ...toCloudMetadata(book), userId }),
    { merge: true },
  );
}

const FIRESTORE_FALLBACK_MAX_BYTES = 12 * 1024 * 1024;
const FIRESTORE_CHUNK_BYTES = 420_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const stride = 8192;
  for (let offset = 0; offset < bytes.length; offset += stride) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + stride)));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const result = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) result[index] = binary.charCodeAt(index);
  return result;
}

function fallbackCollectionPath(userId: string, bookId: string, kind: 'source' | 'cover'): string {
  return `users/${userId}/readerBooks/${bookId}/${kind}Chunks`;
}

function encodeFirestoreBlobRef(collectionPath: string, count: number, mime: string): string {
  return `firestore|${encodeURIComponent(collectionPath)}|${count}|${encodeURIComponent(mime || 'application/octet-stream')}`;
}

function parseFirestoreBlobRef(path: string): { collectionPath: string; count: number; mime: string } | null {
  if (!path.startsWith('firestore|')) return null;
  const [, encodedPath, rawCount, encodedMime] = path.split('|');
  if (!encodedPath || !rawCount) return null;
  return {
    collectionPath: decodeURIComponent(encodedPath),
    count: Math.max(0, Number(rawCount) || 0),
    mime: encodedMime ? decodeURIComponent(encodedMime) : 'application/octet-stream',
  };
}

async function deleteFirestoreBlob(path: string): Promise<void> {
  const parsed = parseFirestoreBlobRef(path);
  if (!parsed) return;
  const snapshot = await getDocs(collection(db, parsed.collectionPath));
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  snapshot.docs.forEach((entry) => batch.delete(entry.ref));
  await batch.commit();
}

async function uploadBlobToFirestore(
  userId: string,
  bookId: string,
  kind: 'source' | 'cover',
  payload: Blob,
): Promise<string> {
  if (payload.size > FIRESTORE_FALLBACK_MAX_BYTES) {
    throw new Error('Firebase Storage chưa dùng được và file quá lớn để đồng bộ dự phòng qua Firestore.');
  }
  const collectionPath = fallbackCollectionPath(userId, bookId, kind);
  const existing = await getDocs(collection(db, collectionPath));
  if (!existing.empty) {
    const cleanup = writeBatch(db);
    existing.docs.forEach((entry) => cleanup.delete(entry.ref));
    await cleanup.commit();
  }

  const bytes = new Uint8Array(await payload.arrayBuffer());
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < bytes.length; offset += FIRESTORE_CHUNK_BYTES) {
    chunks.push(bytes.slice(offset, Math.min(bytes.length, offset + FIRESTORE_CHUNK_BYTES)));
  }

  // Mỗi batch <= 500 writes. File fallback tối đa 12 MB nên thấp hơn nhiều.
  const batch = writeBatch(db);
  chunks.forEach((chunk, index) => {
    batch.set(doc(db, collectionPath, String(index).padStart(4, '0')), {
      index,
      data: bytesToBase64(chunk),
    });
  });
  await batch.commit();
  return encodeFirestoreBlobRef(collectionPath, chunks.length, payload.type);
}

async function downloadBlobFromFirestore(path: string): Promise<Blob | null> {
  const parsed = parseFirestoreBlobRef(path);
  if (!parsed) return null;
  const snapshot = await getDocs(collection(db, parsed.collectionPath));
  const rows = snapshot.docs
    .map((entry) => entry.data() as { index?: number; data?: string })
    .filter((row) => typeof row.data === 'string')
    .sort((a, b) => (a.index || 0) - (b.index || 0));
  if (!rows.length) return null;
  const chunks = rows.map((row) => base64ToBytes(row.data || ''));
  const parts = chunks.map((chunk) => chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer);
  return new Blob(parts, { type: parsed.mime });
}

export async function uploadReaderBookPayload(
  userId: string,
  book: ReaderBook,
  payload: Blob,
): Promise<string> {
  const path = readerPath(userId, book);
  try {
    await uploadBytes(ref(storage, path), payload, { contentType: contentTypeForBook(book) });
    return path;
  } catch (error) {
    console.warn('Firebase Storage upload failed; using Firestore chunk fallback:', error);
    return uploadBlobToFirestore(userId, book.id, 'source', payload);
  }
}

export async function uploadReaderCover(
  userId: string,
  book: ReaderBook,
  payload: Blob,
): Promise<string> {
  const path = coverPath(userId, book);
  try {
    await uploadBytes(ref(storage, path), payload, { contentType: payload.type || 'image/jpeg' });
    return path;
  } catch (error) {
    console.warn('Firebase Storage cover upload failed; using Firestore chunk fallback:', error);
    return uploadBlobToFirestore(userId, book.id, 'cover', payload);
  }
}

export async function downloadReaderCloudBlob(path?: string): Promise<Blob | null> {
  if (!path) return null;
  const firestoreRef = parseFirestoreBlobRef(path);
  if (firestoreRef) {
    try { return await downloadBlobFromFirestore(path); }
    catch (error) {
      console.warn('Could not download reader Firestore fallback file:', error);
      return null;
    }
  }
  try {
    return await getBlob(ref(storage, path));
  } catch (error) {
    console.warn('Could not download reader cloud file:', error);
    return null;
  }
}

async function deleteCloudBlob(path?: string): Promise<void> {
  if (!path) return;
  if (parseFirestoreBlobRef(path)) {
    await deleteFirestoreBlob(path);
    return;
  }
  await deleteObject(ref(storage, path));
}

export async function deleteCloudReaderBook(userId: string, book: ReaderBook): Promise<void> {
  await Promise.allSettled([
    deleteDoc(doc(db, 'users', userId, 'readerBooks', book.id)),
    deleteCloudBlob(book.cloudFilePath),
    deleteCloudBlob(book.cloudCoverPath),
  ]);
}

/**
 * Gộp metadata từ local và cloud theo updatedAt. Payload lớn vẫn local-first và tải lazy.
 */
export function mergeReaderLibraries(localBooks: ReaderBook[], cloudBooks: ReaderBook[]): ReaderBook[] {
  const localById = new Map(localBooks.map((book) => [book.id, book]));
  const cloudById = new Map(cloudBooks.map((book) => [book.id, book]));
  const ids = new Set([...localById.keys(), ...cloudById.keys()]);
  const merged: ReaderBook[] = [];

  ids.forEach((id) => {
    const local = localById.get(id);
    const cloud = cloudById.get(id);
    if (!local && cloud) {
      merged.push({
        ...cloud,
        content: cloud.content || '',
        binaryKey: cloud.binaryKey || `reader-file:${cloud.id}`,
        coverKey: cloud.coverKey || (cloud.cloudCoverPath ? `reader-cover:${cloud.id}` : undefined),
      });
      return;
    }
    if (local && !cloud) {
      merged.push(local);
      return;
    }
    if (!local || !cloud) return;

    const cloudWins = newer(cloud.updatedAt, local.updatedAt);
    const primary = cloudWins ? cloud : local;
    const secondary = cloudWins ? local : cloud;
    const latestPosition = pickLatestReaderPosition(local, cloud);
    merged.push({
      ...secondary,
      ...primary,
      // Vị trí đọc có nhịp cập nhật riêng; theme/settings mới hơn không được kéo trang về dữ liệu cũ.
      ...latestPosition,
      // Không để metadata cloud rỗng ghi đè nội dung text đã cache trên máy.
      content: local.content || cloud.content || '',
      binaryKey: local.binaryKey || cloud.binaryKey || `reader-file:${id}`,
      coverKey: local.coverKey || cloud.coverKey || (cloud.cloudCoverPath ? `reader-cover:${id}` : undefined),
      cloudFilePath: cloud.cloudFilePath || local.cloudFilePath,
      cloudCoverPath: cloud.cloudCoverPath || local.cloudCoverPath,
      cloudSyncedAt: cloud.cloudSyncedAt || local.cloudSyncedAt,
    });
  });

  return merged.sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
}

export async function migrateLocalReaderLibraryToCloud(
  userId: string,
  books: ReaderBook[],
): Promise<ReaderBook[]> {
  const remote = await fetchCloudReaderBooks(userId).catch(() => [] as ReaderBook[]);
  const remoteById = new Map(remote.map((book) => [book.id, book]));
  const result: ReaderBook[] = [];

  // Tuần tự để tránh bắn nhiều file lớn cùng lúc trên mobile.
  for (const original of books) {
    const cloud = remoteById.get(original.id);
    let book = {
      ...original,
      cloudFilePath: original.cloudFilePath || cloud?.cloudFilePath,
      cloudCoverPath: original.cloudCoverPath || cloud?.cloudCoverPath,
      cloudSyncedAt: original.cloudSyncedAt || cloud?.cloudSyncedAt,
    };

    const localIsNewer = !cloud || newer(book.updatedAt, cloud.updatedAt);
    if (!localIsNewer) {
      result.push(book);
      continue;
    }

    try {
      if (!book.cloudFilePath) {
        let payload: Blob | null = null;
        if (book.format === 'text') {
          if (book.content) payload = new Blob([book.content], { type: 'text/plain;charset=utf-8' });
        } else if (book.binaryKey) {
          payload = await loadReaderBinary(book.binaryKey);
        }
        if (payload) book = { ...book, cloudFilePath: await uploadReaderBookPayload(userId, book, payload) };
      }

      if (!book.cloudCoverPath && book.coverKey) {
        const cover = await loadReaderBinary(book.coverKey);
        if (cover) book = { ...book, cloudCoverPath: await uploadReaderCover(userId, book, cover) };
      }

      const now = new Date().toISOString();
      book = { ...book, cloudSyncedAt: now };
      await saveCloudReaderMetadata(userId, book);
    } catch (error) {
      console.warn(`Could not migrate reader book ${book.id} to cloud:`, error);
    }
    result.push(book);
  }

  return mergeReaderLibraries(result, remote);
}

export async function cacheCloudPayloadLocally(book: ReaderBook): Promise<Blob | null> {
  if (!book.cloudFilePath) return null;
  const blob = await downloadReaderCloudBlob(book.cloudFilePath);
  if (!blob) return null;
  const key = book.binaryKey || `reader-file:${book.id}`;
  await saveReaderBinary(key, blob);
  return blob;
}

export async function cacheCloudCoverLocally(book: ReaderBook): Promise<Blob | null> {
  if (!book.cloudCoverPath) return null;
  const blob = await downloadReaderCloudBlob(book.cloudCoverPath);
  if (!blob) return null;
  const key = book.coverKey || `reader-cover:${book.id}`;
  await saveReaderBinary(key, blob);
  return blob;
}
