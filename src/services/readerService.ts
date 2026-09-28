export type ReaderTheme = 'paper' | 'warm' | 'night';

export interface ReaderBook {
  id: string;
  title: string;
  author?: string;
  content: string;
  currentPage: number;
  fontSize: number;
  theme: ReaderTheme;
  addedAt: string;
  updatedAt: string;
  lastOpenedAt: string;
}

export const READER_MAX_BOOK_CHARS = 300_000;
export const READER_MAX_BOOKS = 12;
const READER_STORAGE_VERSION = 'v1';

export function buildReaderStorageKey(userId?: string | null): string {
  return `lich_song_reader_${READER_STORAGE_VERSION}_${userId || 'guest'}`;
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
  content: string;
}): ReaderBook {
  const now = new Date().toISOString();
  return {
    id: `book-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title.trim() || 'Sách chưa đặt tên',
    author: input.author?.trim() || undefined,
    content: input.content.trim(),
    currentPage: 0,
    fontSize: 18,
    theme: 'paper',
    addedAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  };
}

export function loadReaderLibrary(userId?: string | null): ReaderBook[] {
  try {
    const raw = localStorage.getItem(buildReaderStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ReaderBook[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((book) => book && typeof book.id === 'string' && typeof book.content === 'string')
      .map((book) => ({
        ...book,
        currentPage: Math.max(0, Number(book.currentPage) || 0),
        fontSize: Math.min(24, Math.max(15, Number(book.fontSize) || 18)),
        theme: ['paper', 'warm', 'night'].includes(book.theme) ? book.theme : 'paper',
      }));
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
