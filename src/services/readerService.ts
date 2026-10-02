export type ReaderTheme = 'paper' | 'warm' | 'night';
export type ReaderFormat = 'text' | 'pdf' | 'epub';
export type ReaderFont = 'book' | 'serif' | 'sans';
export type ReaderWidth = 'narrow' | 'medium' | 'wide';
export type ReaderTextAlign = 'left' | 'justify';
export type ReaderPageTransition = 'none' | 'slide';
export type ReaderReadingMode = 'scroll' | 'paged';
export type ReaderTtsMode = 'online' | 'device';
export type ReaderTtsProvider = 'azure' | 'google';

export interface ReaderSession {
  id: string;
  startedAt: string;
  endedAt: string;
  readingSeconds: number;
  listeningSeconds: number;
}

export interface ReaderBook {
  id: string;
  title: string;
  author?: string;
  format: ReaderFormat;
  content: string;
  binaryKey?: string;
  coverKey?: string;
  fileName?: string;
  fileSize?: number;
  currentChapter: number;
  currentPage: number;
  pageScrollProgress: number;
  scrollProgress: number;
  overallProgress: number;
  chapterCount?: number;
  fontSize: number;
  lineHeight: number;
  fontFamily: ReaderFont;
  contentWidth: ReaderWidth;
  textAlign: ReaderTextAlign;
  pageTransition: ReaderPageTransition;
  readingMode: ReaderReadingMode;
  ttsRate: number;
  ttsPitch: number;
  ttsCleanText: boolean;
  ttsVoiceUri?: string;
  ttsMode: ReaderTtsMode;
  ttsOnlineVoiceId?: string;
  ttsOnlineProvider?: ReaderTtsProvider;
  listeningProgress: number;
  readingSecondsByDate: Record<string, number>;
  listeningSecondsByDate: Record<string, number>;
  sessions: ReaderSession[];
  cloudFilePath?: string;
  cloudCoverPath?: string;
  cloudSyncedAt?: string;
  lastPositionAt?: string;
  theme: ReaderTheme;
  colorIntensity?: number;
  addedAt: string;
  updatedAt: string;
  lastOpenedAt: string;
}

export interface EpubChapter {
  id: string;
  title: string;
  content: string;
}

export interface ParsedEpubBook {
  title?: string;
  author?: string;
  chapters: EpubChapter[];
  cover?: Blob;
}

export const READER_MAX_BOOK_CHARS = 1_200_000;
export const READER_MAX_BOOKS = 24;
export const READER_MAX_FILE_BYTES = 50 * 1024 * 1024;
const READER_STORAGE_VERSION = 'v1';
const READER_DB_NAME = 'lich_song_reader_files_v1';
const READER_DB_STORE = 'files';

export function buildReaderStorageKey(userId?: string | null): string {
  return `lich_song_reader_${READER_STORAGE_VERSION}_${userId || 'guest'}`;
}

export function detectReaderFormat(fileName: string): ReaderFormat | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.epub')) return 'epub';
  if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.markdown')) return 'text';
  return null;
}

export function calculateReaderProgress(
  format: ReaderFormat,
  currentChapter: number,
  chapterCount: number | undefined,
  scrollProgress: number,
): number {
  const withinPage = Math.min(1, Math.max(0, scrollProgress || 0));
  if (format === 'text') return withinPage;
  if (format !== 'epub' || !chapterCount || chapterCount <= 0) return 0;
  const chapter = Math.min(chapterCount - 1, Math.max(0, currentChapter || 0));
  return Math.min(1, Math.max(0, (chapter + withinPage) / chapterCount));
}

export function sanitizeSpeechText(input: string): string {
  if (!input) return '';

  const normalized = input
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|www\.)[^)]+\)/gi, '$1')
    .replace(/<https?:\/\/[^>]+>/gi, ' ')
    .replace(/\bhttps?:\/\/[^\s<>()]+/gi, ' ')
    .replace(/\bwww\.[^\s<>()]+/gi, ' ')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, ' ')
    .replace(/\b(?:[a-z0-9-]+\.)+(?:com|net|org|vn|io|co|edu|gov|info|me|app)(?:\/[^\s]*)?/gi, ' ')
    .replace(/\b[\w.+-]+@\b/g, ' ')
    .replace(/\b(?:doi|isbn)\s*[:：]?\s*[0-9A-Z./:-]{5,}\b/gi, ' ')
    .replace(/\[(?:\d+|[ivxlcdm]+)\]/gi, ' ')
    .replace(/[_*=#~`^|<>]+/g, ' ')
    .replace(/[•●▪■◆◇→←↑↓✓✔✦✧★☆]+/g, ' ')
    .replace(/…{2,}/g, '…')
    .replace(/[-–—]{3,}/g, ' — ');

  return normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (/^(?:trang|page)\s+\d+\s*$/i.test(line)) return false;
      if (/^(?:https?|www)\b/i.test(line)) return false;
      return true;
    })
    .join(' ')
    .replace(/\s+([,.;!?…])/g, '$1')
    .replace(/([,.;!?…])(?=\S)/g, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function splitLongBlock(block: string, maxChars: number): string[] {
  if (block.length <= maxChars) return [block];
  const chunks: string[] = [];
  let remaining = block.trim();
  while (remaining.length > maxChars) {
    const candidate = remaining.slice(0, maxChars);
    const preferredBreak = Math.max(
      candidate.lastIndexOf('. '),
      candidate.lastIndexOf('! '),
      candidate.lastIndexOf('? '),
      candidate.lastIndexOf('; '),
      candidate.lastIndexOf(', '),
      candidate.lastIndexOf(' '),
    );
    const cut = preferredBreak > Math.floor(maxChars * 0.55) ? preferredBreak + 1 : maxChars;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export function paginateBookContent(content: string, maxChars = 2800): string[] {
  const normalized = content.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!normalized) return [''];
  const sourceBlocks = normalized
    .split(/\n\s*\n/)
    .flatMap((block) => splitLongBlock(block.trim(), maxChars))
    .filter(Boolean);
  const pages: string[] = [];
  let page = '';
  for (const block of sourceBlocks) {
    const next = page ? `${page}\n\n${block}` : block;
    if (page && next.length > maxChars) {
      pages.push(page);
      page = block;
    } else {
      page = next;
    }
  }
  if (page) pages.push(page);
  return pages.length ? pages : [''];
}

export function createReaderBook(input: {
  title: string;
  author?: string;
  content?: string;
  format?: ReaderFormat;
  binaryKey?: string;
  coverKey?: string;
  fileName?: string;
  fileSize?: number;
}): ReaderBook {
  const now = new Date().toISOString();
  return {
    id: `book-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title.trim() || 'Sách chưa đặt tên',
    author: input.author?.trim() || undefined,
    format: input.format || 'text',
    content: (input.content || '').trim(),
    binaryKey: input.binaryKey,
    coverKey: input.coverKey,
    fileName: input.fileName,
    fileSize: input.fileSize,
    currentChapter: 0,
    currentPage: 0,
    pageScrollProgress: 0,
    scrollProgress: 0,
    overallProgress: 0,
    chapterCount: undefined,
    fontSize: 19,
    lineHeight: 1.8,
    fontFamily: 'book',
    contentWidth: 'medium',
    textAlign: 'justify',
    pageTransition: 'none',
    readingMode: 'scroll',
    ttsRate: 0.95,
    ttsPitch: 1,
    ttsCleanText: true,
    ttsVoiceUri: undefined,
    ttsMode: 'device',
    ttsOnlineVoiceId: 'vi-VN-HoaiMyNeural',
    ttsOnlineProvider: 'azure',
    listeningProgress: 0,
    readingSecondsByDate: {},
    listeningSecondsByDate: {},
    sessions: [],
    lastPositionAt: undefined,
    theme: 'paper',
    colorIntensity: 35,
    addedAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  };
}

function normalizeSecondsByDate(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, number> = {};
  Object.entries(value as Record<string, unknown>).forEach(([date, seconds]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const numeric = Number(seconds);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    result[date] = Math.round(numeric);
  });
  return result;
}

function normalizeReaderSessions(value: unknown): ReaderSession[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw): ReaderSession | null => {
      if (!raw || typeof raw !== 'object') return null;
      const row = raw as Partial<ReaderSession>;
      if (typeof row.id !== 'string' || typeof row.startedAt !== 'string' || typeof row.endedAt !== 'string') return null;
      if (!Number.isFinite(Date.parse(row.startedAt)) || !Number.isFinite(Date.parse(row.endedAt))) return null;
      const readingSeconds = Math.max(0, Math.round(Number(row.readingSeconds) || 0));
      const listeningSeconds = Math.max(0, Math.round(Number(row.listeningSeconds) || 0));
      if (readingSeconds + listeningSeconds <= 0) return null;
      return { id: row.id, startedAt: row.startedAt, endedAt: row.endedAt, readingSeconds, listeningSeconds };
    })
    .filter((row): row is ReaderSession => Boolean(row))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .slice(-1000);
}

export function loadReaderLibrary(userId?: string | null): ReaderBook[] {
  try {
    const raw = localStorage.getItem(buildReaderStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<ReaderBook>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((book) => book && typeof book.id === 'string')
      .map((book): ReaderBook => {
        const format: ReaderFormat = book.format === 'pdf' || book.format === 'epub' ? book.format : 'text';
        const theme: ReaderTheme = book.theme === 'warm' || book.theme === 'night' ? book.theme : 'paper';
        const fontFamily: ReaderFont = book.fontFamily === 'serif' || book.fontFamily === 'sans' ? book.fontFamily : 'book';
        const contentWidth: ReaderWidth = book.contentWidth === 'narrow' || book.contentWidth === 'wide' ? book.contentWidth : 'medium';
        const textAlign: ReaderTextAlign = book.textAlign === 'left' ? 'left' : 'justify';
        const pageTransition: ReaderPageTransition = book.pageTransition === 'slide' ? 'slide' : 'none';
        const readingMode: ReaderReadingMode = book.readingMode === 'paged' ? 'paged' : 'scroll';
        return {
          id: book.id as string,
          title: typeof book.title === 'string' ? book.title : 'Sách chưa đặt tên',
          author: typeof book.author === 'string' ? normalizeBookAuthor(book.author) : undefined,
          format,
          content: typeof book.content === 'string' ? book.content : '',
          binaryKey: typeof book.binaryKey === 'string' ? book.binaryKey : undefined,
          coverKey: typeof book.coverKey === 'string' ? book.coverKey : undefined,
          fileName: typeof book.fileName === 'string' ? book.fileName : undefined,
          fileSize: typeof book.fileSize === 'number' ? book.fileSize : undefined,
          currentChapter: Math.max(0, Number(book.currentChapter) || 0),
          currentPage: Math.max(0, Number(book.currentPage) || 0),
          pageScrollProgress: Math.min(1, Math.max(0, Number(book.pageScrollProgress) || 0)),
          scrollProgress: Math.min(1, Math.max(0, Number(book.scrollProgress) || 0)),
          overallProgress: Math.min(1, Math.max(0, Number(book.overallProgress) || 0)),
          chapterCount: typeof book.chapterCount === 'number' && book.chapterCount > 0 ? Math.round(book.chapterCount) : undefined,
          fontSize: Math.min(30, Math.max(15, Number(book.fontSize) || 19)),
          lineHeight: Math.min(2.3, Math.max(1.4, Number(book.lineHeight) || 1.8)),
          fontFamily,
          contentWidth,
          textAlign,
          pageTransition,
          readingMode,
          ttsRate: Math.min(2, Math.max(0.6, Number(book.ttsRate) || 0.95)),
          ttsPitch: Math.min(1.4, Math.max(0.7, Number(book.ttsPitch) || 1)),
          ttsCleanText: book.ttsCleanText !== false,
          ttsVoiceUri: typeof book.ttsVoiceUri === 'string' ? book.ttsVoiceUri : undefined,
          ttsMode: book.ttsMode === 'device' ? 'device' : 'online',
          ttsOnlineVoiceId: typeof book.ttsOnlineVoiceId === 'string' ? book.ttsOnlineVoiceId : 'vi-VN-HoaiMyNeural',
          ttsOnlineProvider: book.ttsOnlineProvider === 'google' ? 'google' : 'azure',
          listeningProgress: Math.min(1, Math.max(0, Number(book.listeningProgress) || 0)),
          readingSecondsByDate: normalizeSecondsByDate(book.readingSecondsByDate),
          listeningSecondsByDate: normalizeSecondsByDate(book.listeningSecondsByDate),
          sessions: normalizeReaderSessions(book.sessions),
          cloudFilePath: typeof book.cloudFilePath === 'string' ? book.cloudFilePath : undefined,
          cloudCoverPath: typeof book.cloudCoverPath === 'string' ? book.cloudCoverPath : undefined,
          cloudSyncedAt: typeof book.cloudSyncedAt === 'string' ? book.cloudSyncedAt : undefined,
          lastPositionAt: typeof book.lastPositionAt === 'string' ? book.lastPositionAt : undefined,
          theme,
          colorIntensity: Number.isFinite(Number(book.colorIntensity))
            ? Math.min(100, Math.max(0, Number(book.colorIntensity)))
            : 35,
          addedAt: typeof book.addedAt === 'string' ? book.addedAt : new Date().toISOString(),
          updatedAt: typeof book.updatedAt === 'string' ? book.updatedAt : new Date().toISOString(),
          lastOpenedAt: typeof book.lastOpenedAt === 'string' ? book.lastOpenedAt : new Date().toISOString(),
        };
      })
      .filter((book) => book.format === 'text' ? Boolean(book.content) : Boolean(book.binaryKey));
  } catch (error) {
    console.warn('Could not load reader library:', error);
    return [];
  }
}

export function saveReaderLibrary(userId: string | null | undefined, books: ReaderBook[]): void {
  try {
    localStorage.setItem(buildReaderStorageKey(userId), JSON.stringify(books.slice(0, READER_MAX_BOOKS)));
  } catch (error) {
    console.warn('Could not save reader library:', error);
  }
}

function openReaderDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Trình duyệt không hỗ trợ bộ nhớ sách ngoại tuyến.'));
      return;
    }
    const request = indexedDB.open(READER_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(READER_DB_STORE)) db.createObjectStore(READER_DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Không mở được bộ nhớ sách.'));
  });
}

export async function saveReaderBinary(key: string, file: Blob): Promise<void> {
  const db = await openReaderDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(READER_DB_STORE, 'readwrite');
      tx.objectStore(READER_DB_STORE).put(file, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Không lưu được file sách.'));
      tx.onabort = () => reject(tx.error || new Error('Không lưu được file sách.'));
    });
  } finally {
    db.close();
  }
}

export async function loadReaderBinary(key: string): Promise<Blob | null> {
  const db = await openReaderDb();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(READER_DB_STORE, 'readonly');
      const request = tx.objectStore(READER_DB_STORE).get(key);
      request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
      request.onerror = () => reject(request.error || new Error('Không đọc được file sách.'));
    });
  } finally {
    db.close();
  }
}

export async function deleteReaderBinary(key: string): Promise<void> {
  const db = await openReaderDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(READER_DB_STORE, 'readwrite');
      tx.objectStore(READER_DB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Không xóa được file sách.'));
    });
  } finally {
    db.close();
  }
}

type ZipEntry = {
  path: string;
  compression: number;
  compressedSize: number;
  localHeaderOffset: number;
};

function normalizeZipPath(value: string): string {
  const result: string[] = [];
  for (const part of value.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') result.pop();
    else result.push(part);
  }
  return result.join('/');
}

function resolveZipPath(baseFile: string, href: string): string {
  const cleanHref = href.split('#')[0].split('?')[0];
  let decoded = cleanHref;
  try { decoded = decodeURIComponent(cleanHref); } catch { /* keep raw path */ }
  if (decoded.startsWith('/')) return normalizeZipPath(decoded.slice(1));
  const baseDir = baseFile.includes('/') ? baseFile.slice(0, baseFile.lastIndexOf('/') + 1) : '';
  return normalizeZipPath(`${baseDir}${decoded}`);
}

function imageMimeFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

function findEocd(view: DataView): number {
  const min = Math.max(0, view.byteLength - 65_557);
  for (let offset = view.byteLength - 22; offset >= min; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  return -1;
}

function readZipEntries(buffer: ArrayBuffer): Map<string, ZipEntry> {
  const view = new DataView(buffer);
  const eocd = findEocd(view);
  if (eocd < 0) throw new Error('EPUB không hợp lệ: không tìm thấy thư mục ZIP.');
  const totalEntries = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder('utf-8');
  const entries = new Map<string, ZipEntry>();
  for (let index = 0; index < totalEntries; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const compression = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nameBytes = new Uint8Array(buffer, offset + 46, nameLength);
    const path = normalizeZipPath(decoder.decode(nameBytes));
    entries.set(path, { path, compression, compressedSize, localHeaderOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function readZipEntry(buffer: ArrayBuffer, entry: ZipEntry): Promise<Uint8Array> {
  const view = new DataView(buffer);
  const offset = entry.localHeaderOffset;
  if (view.getUint32(offset, true) !== 0x04034b50) throw new Error(`EPUB lỗi tại ${entry.path}.`);
  const nameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const start = offset + 30 + nameLength + extraLength;
  const compressed = new Uint8Array(buffer, start, entry.compressedSize);
  if (entry.compression === 0) return compressed.slice();
  if (entry.compression !== 8) throw new Error(`EPUB dùng kiểu nén chưa hỗ trợ (${entry.compression}).`);
  if (typeof DecompressionStream === 'undefined') throw new Error('Thiết bị này chưa hỗ trợ giải nén EPUB trong trình duyệt.');
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipText(buffer: ArrayBuffer, entries: Map<string, ZipEntry>, path: string): Promise<string> {
  const normalized = normalizeZipPath(path);
  const entry = entries.get(normalized);
  if (!entry) throw new Error(`EPUB thiếu file ${normalized}.`);
  return new TextDecoder('utf-8').decode(await readZipEntry(buffer, entry));
}

function findXmlElement(doc: Document, localName: string): Element | undefined {
  return Array.from(doc.getElementsByTagName('*')).find((element) => element.localName === localName);
}

function findXmlText(doc: Document, localNames: string[]): string | undefined {
  const names = localNames.map((name) => name.toLowerCase());
  const direct = Array.from(doc.getElementsByTagName('*'))
    .find((element) => names.includes(element.localName.toLowerCase()) && element.textContent?.trim());
  if (direct?.textContent?.trim()) return direct.textContent.trim();

  const meta = Array.from(doc.getElementsByTagName('*')).find((element) => {
    if (element.localName.toLowerCase() !== 'meta') return false;
    const key = `${element.getAttribute('property') || ''} ${element.getAttribute('name') || ''}`.toLowerCase();
    return names.some((name) => key.includes(name)) &&
      Boolean(element.textContent?.trim() || element.getAttribute('content')?.trim());
  });
  return meta?.textContent?.trim() || meta?.getAttribute('content')?.trim() || undefined;
}

function normalizeBookAuthor(value?: string): string | undefined {
  const cleaned = value?.replace(/\s+/g, ' ').trim();
  if (!cleaned) return undefined;
  if (/^(?:unknown|unknow|n\/?a|none|null|anonymous|không rõ)$/i.test(cleaned)) return undefined;
  return cleaned;
}

function extractChapterText(html: string): { title?: string; content: string } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,noscript,iframe,object,embed,svg,form').forEach((node) => node.remove());
  const headingNode = doc.querySelector('h1,h2,h3,h4');
  const heading = headingNode?.textContent?.replace(/\s+/g, ' ').trim();
  const blocks = Array.from(doc.querySelectorAll('h1,h2,h3,h4,p,li,blockquote,pre'))
    .filter((node) => node !== headingNode)
    .map((node) => node.textContent?.replace(/[\t ]+/g, ' ').replace(/\n+/g, ' ').trim() || '')
    .filter(Boolean);
  const fallback = doc.body?.textContent?.replace(/\s+/g, ' ').trim() || '';
  return { title: heading, content: blocks.length ? blocks.join('\n\n') : fallback };
}

export async function parseEpubBook(blob: Blob): Promise<ParsedEpubBook> {
  const buffer = await blob.arrayBuffer();
  const entries = readZipEntries(buffer);
  let opfPath = '';
  try {
    const containerXml = await readZipText(buffer, entries, 'META-INF/container.xml');
    const containerDoc = new DOMParser().parseFromString(containerXml, 'application/xml');
    opfPath = findXmlElement(containerDoc, 'rootfile')?.getAttribute('full-path') || '';
  } catch {
    opfPath = '';
  }
  if (!opfPath) opfPath = [...entries.keys()].find((path) => path.toLowerCase().endsWith('.opf')) || '';
  if (!opfPath) throw new Error('EPUB không có file nội dung OPF.');

  const opfXml = await readZipText(buffer, entries, opfPath);
  const opfDoc = new DOMParser().parseFromString(opfXml, 'application/xml');
  if (opfDoc.querySelector('parsererror')) throw new Error('Không đọc được cấu trúc EPUB.');

  const title = findXmlText(opfDoc, ['title']);
  const author = normalizeBookAuthor(findXmlText(opfDoc, ['creator', 'author']));
  const manifest = new Map<string, { id: string; path: string; mediaType: string; properties: string }>();
  Array.from(opfDoc.getElementsByTagName('*'))
    .filter((node) => node.localName === 'item')
    .forEach((item) => {
      const id = item.getAttribute('id');
      const href = item.getAttribute('href');
      if (!id || !href) return;
      manifest.set(id, {
        id,
        path: resolveZipPath(opfPath, href),
        mediaType: item.getAttribute('media-type') || '',
        properties: item.getAttribute('properties') || '',
      });
    });

  const metadataCoverId = Array.from(opfDoc.getElementsByTagName('*'))
    .find((node) => node.localName === 'meta' && (node.getAttribute('name') || '').toLowerCase() === 'cover')
    ?.getAttribute('content') || '';
  let coverItem =
    (metadataCoverId ? manifest.get(metadataCoverId) : undefined) ||
    [...manifest.values()].find((item) => /(?:^|\s)cover-image(?:\s|$)/i.test(item.properties)) ||
    [...manifest.values()].find((item) => /image\//i.test(item.mediaType) && /cover/i.test(`${item.id} ${item.path}`));

  const guideCoverHref = Array.from(opfDoc.getElementsByTagName('*'))
    .find((node) => node.localName === 'reference' && (node.getAttribute('type') || '').toLowerCase() === 'cover')
    ?.getAttribute('href') || '';
  const possibleCoverPage = coverItem && !/image\//i.test(coverItem.mediaType)
    ? coverItem.path
    : (guideCoverHref ? resolveZipPath(opfPath, guideCoverHref) : '');

  if (possibleCoverPage) {
    try {
      const coverHtml = await readZipText(buffer, entries, possibleCoverPage);
      const coverDoc = new DOMParser().parseFromString(coverHtml, 'text/html');
      const imageNode = coverDoc.querySelector('img, image');
      const imageHref = imageNode?.getAttribute('src') || imageNode?.getAttribute('href') || imageNode?.getAttribute('xlink:href') || '';
      if (imageHref) {
        const imagePath = resolveZipPath(possibleCoverPage, imageHref);
        coverItem = [...manifest.values()].find((item) => item.path === imagePath) || {
          id: 'cover-fallback',
          path: imagePath,
          mediaType: imageMimeFromPath(imagePath),
          properties: 'cover-image',
        };
      }
    } catch {
      // Tiếp tục fallback sang cover image trực tiếp nếu cover page lỗi.
    }
  }

  let cover: Blob | undefined;
  if (coverItem && /image\//i.test(coverItem.mediaType || imageMimeFromPath(coverItem.path))) {
    const entry = entries.get(normalizeZipPath(coverItem.path));
    if (entry) {
      try {
        const bytes = await readZipEntry(buffer, entry);
        cover = new Blob([bytes], { type: coverItem.mediaType || imageMimeFromPath(coverItem.path) });
      } catch {
        cover = undefined;
      }
    }
  }

  const spineIds = Array.from(opfDoc.getElementsByTagName('*'))
    .filter((node) => node.localName === 'itemref')
    .map((item) => item.getAttribute('idref'))
    .filter((id): id is string => Boolean(id));
  const ordered = spineIds.map((id) => manifest.get(id)).filter((item): item is { id: string; path: string; mediaType: string; properties: string } => Boolean(item));
  const fallbackItems = [...manifest.values()].filter((item) => /xhtml|html/i.test(item.mediaType) || /\.(xhtml?|html?)$/i.test(item.path));
  const chapterItems = ordered.length ? ordered : fallbackItems;

  const chapters: EpubChapter[] = [];
  for (let index = 0; index < chapterItems.length; index += 1) {
    const item = chapterItems[index];
    try {
      const chapterHtml = await readZipText(buffer, entries, item.path);
      const extracted = extractChapterText(chapterHtml);
      if (!extracted.content.trim()) continue;
      chapters.push({
        id: item.path,
        title: extracted.title || `Chương ${chapters.length + 1}`,
        content: extracted.content,
      });
    } catch {
      // Bỏ qua một chương lỗi thay vì làm hỏng cả cuốn.
    }
  }
  if (!chapters.length) throw new Error('EPUB không có chương văn bản có thể đọc.');
  return { title, author, chapters, cover };
}
