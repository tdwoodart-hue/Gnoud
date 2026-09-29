import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlignJustify,
  AlignLeft,
  BookmarkCheck,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cloud,
  ExternalLink,
  FilePlus2,
  Headphones,
  Library,
  List,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Moon,
  Pause,
  Play,
  Settings2,
  Square,
  Smartphone,
  SunMedium,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  calculateReaderProgress,
  createReaderBook,
  deleteReaderBinary,
  detectReaderFormat,
  loadReaderBinary,
  loadReaderLibrary,
  parseEpubBook,
  paginateBookContent,
  READER_MAX_BOOK_CHARS,
  READER_MAX_BOOKS,
  READER_MAX_FILE_BYTES,
  saveReaderBinary,
  saveReaderLibrary,
  sanitizeSpeechText,
  type EpubChapter,
  type ReaderBook,
  type ReaderFont,
  type ReaderFormat,
  type ReaderTheme,
  type ReaderWidth,
  type ReaderPageTransition,
  type ReaderReadingMode,
  type ReaderTtsProvider,
} from '../../services/readerService';
import {
  cacheCloudCoverLocally,
  cacheCloudPayloadLocally,
  deleteCloudReaderBook,
  mergeReaderLibraries,
  migrateLocalReaderLibraryToCloud,
  saveCloudReaderMetadata,
  subscribeCloudReaderBooks,
  uploadReaderBookPayload,
  uploadReaderCover,
  type ReaderCloudStatus,
} from '../../services/readerCloudService';
import { EmptyState } from '../common/EmptyState';
import { PageHeader } from '../common/PageHeader';



type OnlineTtsVoice = {
  id: string;
  provider: ReaderTtsProvider;
  name: string;
  gender: 'female' | 'male' | 'neutral';
  locale: 'vi-VN';
  quality: 'standard' | 'neural' | 'hd';
  available: boolean;
  note?: string;
};

const formatLabels: Record<ReaderFormat, string> = {
  text: 'TEXT',
  pdf: 'PDF',
  epub: 'EPUB',
};

const themeStyles: Record<ReaderTheme, { shell: string; muted: string; panel: string }> = {
  paper: {
    shell: 'bg-[#fbfbfa] text-slate-900',
    muted: 'text-slate-400',
    panel: 'border-slate-200/70 bg-white/95',
  },
  warm: {
    shell: 'bg-[#f5efe3] text-stone-900',
    muted: 'text-stone-500',
    panel: 'border-stone-300/60 bg-[#fbf6ec]/95',
  },
  night: {
    shell: 'bg-[#111318] text-slate-100',
    muted: 'text-slate-500',
    panel: 'border-slate-700/80 bg-[#181b22]/95',
  },
};

const fontFamilies: Record<ReaderFont, string> = {
  book: 'Charter, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  sans: '"Plus Jakarta Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const widthClasses: Record<ReaderWidth, string> = {
  narrow: 'max-w-[620px]',
  medium: 'max-w-[760px]',
  wide: 'max-w-[920px]',
};

const themeButtons: Array<{ id: ReaderTheme; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'paper', label: 'Sáng', icon: SunMedium },
  { id: 'warm', label: 'Ấm', icon: BookOpen },
  { id: 'night', label: 'Tối', icon: Moon },
];

function formatFileTitle(fileName: string): string {
  return fileName.replace(/\.(pdf|epub|txt|md|markdown)$/i, '').replace(/[-_]+/g, ' ').trim() || 'Sách mới';
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}


function formatSavedAt(value?: string | null): string {
  if (!value) return 'Chưa ghim';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Đã ghim';
  return `Đã ghim ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readerDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readingLabel(book: ReaderBook): string {
  if (book.format === 'pdf') return 'PDF';
  const value = Math.round(clamp(book.overallProgress || 0, 0, 1) * 100);
  if (value <= 0) return 'Chưa đọc';
  if (value >= 100) return 'Đã đọc xong';
  return `${value}% đã đọc`;
}

function splitSpeechText(text: string, maxChars = 240): string[] {
  const sentences = (text.replace(/\s+/g, ' ').trim().match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [])
    .map((item) => item.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      if (current) { chunks.push(current); current = ''; }
      for (let start = 0; start < sentence.length; start += maxChars) {
        chunks.push(sentence.slice(start, start + maxChars).trim());
      }
      continue;
    }
    const next = current ? `${current} ${sentence}` : sentence;
    if (current && next.length > maxChars) {
      chunks.push(current);
      current = sentence;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function voiceScore(voice: SpeechSynthesisVoice): number {
  const language = voice.lang.toLowerCase();
  const name = voice.name.toLowerCase();
  let score = 0;
  if (language === 'vi-vn') score += 100;
  else if (language.startsWith('vi')) score += 80;
  if (voice.localService) score += 12;
  if (/linh|nam|vietnam|tiếng việt|tieng viet|google/.test(name)) score += 8;
  if (/enhanced|premium|neural|natural/.test(name)) score += 5;
  return score;
}

function formatVoiceName(voice: SpeechSynthesisVoice): string {
  const language = voice.lang.toLowerCase().startsWith('vi') ? 'Tiếng Việt' : voice.lang;
  return `${voice.name} · ${language}${voice.localService ? ' · trên máy' : ''}`;
}

export const ReaderView: React.FC = () => {
  const { user, addToast } = useApp();
  const [books, setBooks] = useState<ReaderBook[]>([]);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftAuthor, setDraftAuthor] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [fileBusy, setFileBusy] = useState(false);
  const [binaryLoading, setBinaryLoading] = useState(false);
  const [binaryError, setBinaryError] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [epubChapters, setEpubChapters] = useState<EpubChapter[]>([]);
  const [readingOpen, setReadingOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [liveScrollProgress, setLiveScrollProgress] = useState(0);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [ttsOpen, setTtsOpen] = useState(false);
  const [ttsStatus, setTtsStatus] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [onlineVoices, setOnlineVoices] = useState<OnlineTtsVoice[]>([]);
  const [onlineVoicesLoading, setOnlineVoicesLoading] = useState(false);
  const [onlineTtsError, setOnlineTtsError] = useState('');
  const [visualPage, setVisualPage] = useState(1);
  const [visualPageCount, setVisualPageCount] = useState(1);
  const [lastPinnedAt, setLastPinnedAt] = useState<string | null>(null);
  const [readerViewport, setReaderViewport] = useState({ width: 390, height: 640 });
  const [pageTurnFx, setPageTurnFx] = useState<'next' | 'prev' | null>(null);
  const [cloudStatus, setCloudStatus] = useState<ReaderCloudStatus>('idle');
  const [cloudError, setCloudError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const epubCacheRef = useRef(new Map<string, EpubChapter[]>());
  const readingScrollRef = useRef<HTMLDivElement>(null);
  const scrollSaveTimerRef = useRef<number | null>(null);
  const speechChunksRef = useRef<string[]>([]);
  const speechIndexRef = useRef(0);
  const speechStoppedRef = useRef(false);
  const onlineAudioRef = useRef<HTMLAudioElement | null>(null);
  const onlineAudioUrlRef = useRef<string | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const lastTtsPinWriteRef = useRef(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const pendingPageScrollRef = useRef<number | null>(null);
  const pageTurnTimerRef = useRef<number | null>(null);
  const cloudMetadataTimerRef = useRef<number | null>(null);
  const readerActivityAtRef = useRef(Date.now());
  const readerTimePendingRef = useRef({ reading: 0, listening: 0 });

  const storageIdentity = user?.uid || 'guest';

  useEffect(() => {
    setLoadedFor(null);
    const loaded = loadReaderLibrary(user?.uid);
    const ordered = [...loaded].sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
    setBooks(ordered);
    setActiveBookId(ordered[0]?.id || null);
    setLoadedFor(storageIdentity);
  }, [storageIdentity, user?.uid]);

  useEffect(() => {
    if (loadedFor !== storageIdentity) return;
    saveReaderLibrary(user?.uid, books);
  }, [books, loadedFor, storageIdentity, user?.uid]);

  useEffect(() => {
    if (!user?.uid || loadedFor !== storageIdentity) {
      setCloudStatus('idle');
      setCloudError('');
      return undefined;
    }

    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    const userId = user.uid;
    setCloudStatus('syncing');
    setCloudError('');

    const bootstrap = async () => {
      try {
        // Lần đầu sau khi cập nhật: đẩy sách đang có trên thiết bị lên tài khoản.
        const localSnapshot = loadReaderLibrary(userId);
        const migrated = await migrateLocalReaderLibraryToCloud(userId, localSnapshot);
        if (disposed) return;
        setBooks((current) => mergeReaderLibraries(current, migrated));
        setActiveBookId((currentId) => {
          const merged = mergeReaderLibraries(loadReaderLibrary(userId), migrated);
          return currentId && merged.some((book) => book.id === currentId) ? currentId : (merged[0]?.id || null);
        });
        setCloudStatus('synced');

        unsubscribe = subscribeCloudReaderBooks(
          userId,
          (remoteBooks) => {
            if (disposed) return;
            setBooks((current) => {
              const remoteIds = new Set(remoteBooks.map((book) => book.id));
              // Cloud là nguồn chuẩn cho sách đã sync; sách local đang upload vẫn được giữ.
              const keepLocal = current.filter((book) => remoteIds.has(book.id) || !book.cloudFilePath);
              const merged = mergeReaderLibraries(keepLocal, remoteBooks);
              setActiveBookId((currentId) => currentId && merged.some((book) => book.id === currentId) ? currentId : (merged[0]?.id || null));
              return merged;
            });
            setCloudStatus('synced');
            setCloudError('');
          },
          (error) => {
            if (disposed) return;
            setCloudStatus('error');
            setCloudError(error instanceof Error ? error.message : 'Không đồng bộ được thư viện.');
          },
        );
      } catch (error) {
        if (disposed) return;
        setCloudStatus('error');
        setCloudError(error instanceof Error ? error.message : 'Không đồng bộ được thư viện.');
      }
    };

    void bootstrap();
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [user?.uid, loadedFor, storageIdentity]);

  useEffect(() => {
    let disposed = false;
    const createdUrls: string[] = [];
    const loadCovers = async () => {
      const next: Record<string, string> = {};
      await Promise.all(books.map(async (book) => {
        if (!book.coverKey && !book.cloudCoverPath) return;
        try {
          let blob = book.coverKey ? await loadReaderBinary(book.coverKey) : null;
          if (!blob && book.cloudCoverPath) blob = await cacheCloudCoverLocally(book);
          if (!blob || disposed) return;
          const url = URL.createObjectURL(blob);
          createdUrls.push(url);
          next[book.id] = url;
        } catch {
          // Bìa là dữ liệu phụ; không chặn thư viện nếu tải bìa lỗi.
        }
      }));
      if (!disposed) setCoverUrls(next);
    };
    void loadCovers();
    return () => {
      disposed = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [books.map((book) => `${book.id}:${book.coverKey || ''}:${book.cloudCoverPath || ''}`).join('|')]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
    const refresh = () => setTtsVoices(window.speechSynthesis.getVoices());
    refresh();
    window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', refresh);
  }, []);


  useEffect(() => {
    let disposed = false;
    setOnlineVoicesLoading(true);
    setOnlineTtsError('');
    void fetch('/api/reader/tts')
      .then(async (response) => {
        if (!response.ok) throw new Error(`API giọng online trả lỗi ${response.status}.`);
        return response.json() as Promise<{ voices?: OnlineTtsVoice[] }>;
      })
      .then((payload) => {
        if (disposed) return;
        const voices = Array.isArray(payload.voices) ? payload.voices.filter((voice) => voice.available) : [];
        setOnlineVoices(voices);
        if (!voices.length) setOnlineTtsError('Chưa có provider giọng online khả dụng trên server hiện tại.');
      })
      .catch(() => {
        if (!disposed) {
          setOnlineVoices([]);
          setOnlineTtsError('Bản Preview hiện tại không kết nối được API giọng online.');
        }
      })
      .finally(() => {
        if (!disposed) setOnlineVoicesLoading(false);
      });
    return () => { disposed = true; };
  }, []);

  const activeBook = books.find((book) => book.id === activeBookId) || null;
  const readingMode: ReaderReadingMode = activeBook?.readingMode === 'paged' ? 'paged' : 'scroll';

  const updateBook = (id: string, updates: Partial<ReaderBook>) => {
    setBooks((previous) => previous.map((book) => (
      book.id === id
        ? { ...book, ...updates, updatedAt: new Date().toISOString() }
        : book
    )));
  };

  useEffect(() => {
    if (!user?.uid || !activeBook || loadedFor !== storageIdentity) return undefined;
    if (cloudMetadataTimerRef.current) window.clearTimeout(cloudMetadataTimerRef.current);
    cloudMetadataTimerRef.current = window.setTimeout(() => {
      void saveCloudReaderMetadata(user.uid, activeBook)
        .then(() => {
          const syncedAt = new Date().toISOString();
          setBooks((current) => current.map((book) => book.id === activeBook.id ? { ...book, cloudSyncedAt: syncedAt } : book));
          setCloudStatus('synced');
          setCloudError('');
        })
        .catch((error) => {
          console.warn('Could not sync reader progress:', error);
          setCloudStatus('error');
          setCloudError('Tiến độ vẫn lưu trên máy nhưng chưa đồng bộ được.');
        });
    }, 900);
    return () => {
      if (cloudMetadataTimerRef.current) window.clearTimeout(cloudMetadataTimerRef.current);
    };
  }, [user?.uid, activeBook?.id, activeBook?.updatedAt, loadedFor, storageIdentity]);

  const syncNewBookToCloud = async (book: ReaderBook, payload: Blob, cover?: Blob) => {
    if (!user?.uid) return;
    setCloudStatus('syncing');
    try {
      const cloudFilePath = await uploadReaderBookPayload(user.uid, book, payload);
      const cloudCoverPath = cover ? await uploadReaderCover(user.uid, book, cover) : book.cloudCoverPath;
      const cloudSyncedAt = new Date().toISOString();
      const syncedBook = { ...book, cloudFilePath, cloudCoverPath, cloudSyncedAt };
      await saveCloudReaderMetadata(user.uid, syncedBook);
      setBooks((current) => current.map((item) => item.id === book.id ? { ...item, cloudFilePath, cloudCoverPath, cloudSyncedAt } : item));
      setCloudStatus('synced');
      setCloudError('');
    } catch (error) {
      console.warn('Could not upload reader book:', error);
      setCloudStatus('error');
      setCloudError('Sách đang chỉ có trên thiết bị này.');
      addToast('Đã thêm sách trên thiết bị, nhưng chưa đồng bộ lên tài khoản.', 'warning');
    }
  };

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;
    setPdfUrl(null);
    setEpubChapters([]);
    setBinaryError('');
    setBinaryLoading(false);

    if (!activeBook) return undefined;

    const load = async () => {
      if (activeBook.format === 'text') {
        if (activeBook.content || !activeBook.cloudFilePath) return;
        setBinaryLoading(true);
        try {
          const blob = await cacheCloudPayloadLocally(activeBook);
          if (!blob) throw new Error('Không tải được nội dung sách từ tài khoản.');
          const content = await blob.text();
          if (!disposed) updateBook(activeBook.id, { content, binaryKey: activeBook.binaryKey || `reader-file:${activeBook.id}` });
        } catch (error) {
          if (!disposed) setBinaryError(error instanceof Error ? error.message : 'Không mở được sách.');
        } finally {
          if (!disposed) setBinaryLoading(false);
        }
        return;
      }

      if (!activeBook.binaryKey && !activeBook.cloudFilePath) return;
      setBinaryLoading(true);
      try {
        if (activeBook.format === 'epub') {
          const cached = epubCacheRef.current.get(activeBook.id);
          if (cached) {
            if (!disposed) setEpubChapters(cached);
            return;
          }
        }
        let blob = activeBook.binaryKey ? await loadReaderBinary(activeBook.binaryKey) : null;
        if (!blob && activeBook.cloudFilePath) blob = await cacheCloudPayloadLocally(activeBook);
        if (!blob) throw new Error('Không tìm thấy file sách trên thiết bị hoặc tài khoản.');
        if (!activeBook.binaryKey) updateBook(activeBook.id, { binaryKey: `reader-file:${activeBook.id}` });

        if (activeBook.format === 'pdf') {
          objectUrl = URL.createObjectURL(blob);
          if (!disposed) setPdfUrl(objectUrl);
        } else {
          const parsed = await parseEpubBook(blob);
          epubCacheRef.current.set(activeBook.id, parsed.chapters);
          let discoveredCoverKey = activeBook.coverKey;
          if (parsed.cover && !discoveredCoverKey) {
            discoveredCoverKey = `reader-cover:${activeBook.id}`;
            await saveReaderBinary(discoveredCoverKey, parsed.cover);
          }
          if (!disposed) {
            setEpubChapters(parsed.chapters);
            const shouldRefreshMetadata =
              (!activeBook.author && parsed.author) ||
              (activeBook.title === formatFileTitle(activeBook.fileName || '') && parsed.title) ||
              !activeBook.chapterCount ||
              Boolean(discoveredCoverKey && discoveredCoverKey !== activeBook.coverKey);
            if (shouldRefreshMetadata) {
              setBooks((previous) => previous.map((book) => book.id === activeBook.id ? {
                ...book,
                title: parsed.title || book.title,
                author: parsed.author || book.author,
                coverKey: discoveredCoverKey || book.coverKey,
                chapterCount: parsed.chapters.length,
                overallProgress: calculateReaderProgress('epub', book.currentChapter, parsed.chapters.length, book.scrollProgress),
                updatedAt: new Date().toISOString(),
              } : book));
            }
          }
        }
      } catch (error) {
        if (!disposed) setBinaryError(error instanceof Error ? error.message : 'Không mở được file sách.');
      } finally {
        if (!disposed) setBinaryLoading(false);
      }
    };

    void load();
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activeBook?.id, activeBook?.binaryKey, activeBook?.cloudFilePath, activeBook?.format]);

  const chapterIndex = activeBook?.format === 'epub'
    ? Math.min(activeBook.currentChapter || 0, Math.max(0, epubChapters.length - 1))
    : 0;
  const activeChapter = epubChapters[chapterIndex];
  const readerText = activeBook?.format === 'epub' ? (activeChapter?.content || '') : (activeBook?.content || '');
  const pageCharLimit = useMemo(() => {
    if (!activeBook) return 470;
    const widthFactor = clamp(readerViewport.width / 390, 0.78, 1.8);
    const heightFactor = clamp(readerViewport.height / 640, 0.72, 1.8);
    const fontFactor = Math.pow(19 / Math.max(15, activeBook.fontSize), 1.72);
    const lineFactor = 1.8 / Math.max(1.4, activeBook.lineHeight);
    const widthSettingFactor = activeBook.contentWidth === 'narrow' ? 0.88 : activeBook.contentWidth === 'wide' ? 1.1 : 1;
    const modeFactor = readingMode === 'scroll' ? 2.15 : 1;
    return Math.round(clamp(470 * widthFactor * heightFactor * fontFactor * lineFactor * widthSettingFactor * modeFactor, 220, 3200));
  }, [activeBook?.fontSize, activeBook?.lineHeight, activeBook?.contentWidth, readerViewport.height, readerViewport.width, readingMode]);

  const readerPages = useMemo(
    () => activeBook?.format === 'pdf' ? [''] : paginateBookContent(readerText, pageCharLimit),
    [activeBook?.format, readerText, pageCharLimit],
  );

  const epubPageCounts = useMemo(
    () => activeBook?.format === 'epub'
      ? epubChapters.map((chapter) => Math.max(1, paginateBookContent(chapter.content, pageCharLimit).length))
      : [],
    [activeBook?.format, epubChapters, pageCharLimit],
  );
  const bookPageOffset = activeBook?.format === 'epub'
    ? epubPageCounts.slice(0, chapterIndex).reduce((sum, count) => sum + count, 0)
    : 0;
  const bookPageCount = activeBook?.format === 'epub'
    ? Math.max(1, epubPageCounts.reduce((sum, count) => sum + count, 0))
    : Math.max(1, readerPages.length);
  const bookVisualPage = Math.min(bookPageCount, Math.max(1, bookPageOffset + visualPage));

  const visiblePageText = readerPages[Math.max(0, Math.min(readerPages.length - 1, visualPage - 1))] || '';
  const visiblePageParagraphs = useMemo(
    () => visiblePageText.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean),
    [visiblePageText],
  );

  const progressRatio = useMemo(() => {
    if (!activeBook) return 0;
    return calculateReaderProgress(
      activeBook.format,
      chapterIndex,
      epubChapters.length || activeBook.chapterCount,
      liveScrollProgress,
    );
  }, [activeBook, chapterIndex, epubChapters.length, liveScrollProgress]);
  const progress = Math.round(progressRatio * 100);

  useEffect(() => {
    if (!readingOpen || !activeBook || activeBook.format === 'pdf') return undefined;
    const element = readingScrollRef.current;
    if (!element) return undefined;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      setReaderViewport({
        width: Math.max(280, rect.width),
        height: Math.max(360, rect.height),
      });
    };

    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [readingOpen, activeBook?.id, activeBook?.format]);

  useEffect(() => {
    if (!readingOpen || !activeBook || activeBook.format === 'pdf') return;
    const count = Math.max(1, readerPages.length);
    const page = clamp((activeBook.currentPage || 0) + 1, 1, count);
    setVisualPageCount(count);
    setVisualPage(page);
    setLiveScrollProgress(clamp(activeBook.scrollProgress || 0, 0, 1));
    setLastPinnedAt(activeBook.lastPositionAt || null);
    pendingPageScrollRef.current = readingMode === 'scroll' ? clamp(activeBook.pageScrollProgress || 0, 0, 1) : 0;
  }, [readingOpen, activeBook?.id, activeBook?.currentChapter, activeBook?.format, readerPages.length, readingMode]);

  useEffect(() => {
    if (!readingOpen || !activeBook || activeBook.format === 'pdf' || readingMode !== 'scroll') return undefined;
    const element = readingScrollRef.current;
    if (!element) return undefined;
    const requested = pendingPageScrollRef.current;
    if (requested === null) return undefined;

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
        element.scrollTop = maxScroll * clamp(requested, 0, 1);
        pendingPageScrollRef.current = null;
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [readingOpen, activeBook?.id, activeBook?.currentChapter, activeBook?.format, readingMode, visualPage, visiblePageText]);

  useEffect(() => {
    if (!readingOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [readingOpen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      setIsBrowserFullscreen(Boolean(document.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!readingOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        speechStoppedRef.current = true;
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
        setTtsStatus('idle');
        setTtsOpen(false);
        setSettingsOpen(false);
        setTocOpen(false);
        setReadingOpen(false);
        return;
      }
      const element = readingScrollRef.current;
      if (!element || activeBook?.format === 'pdf') return;
      if (readingMode === 'scroll') {
        if (event.key === 'ArrowDown' || event.key === 'PageDown') {
          element.scrollBy({ top: element.clientHeight * 0.82, behavior: 'smooth' });
        } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
          element.scrollBy({ top: -element.clientHeight * 0.82, behavior: 'smooth' });
        }
      } else if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        stepViewport(1);
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        stepViewport(-1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [readingOpen, activeBook?.format, readingMode, visualPage, readerPages.length, chapterIndex, epubChapters.length, activeBook?.pageTransition]);

  useEffect(() => {
    if (!readingOpen || !controlsVisible || settingsOpen || tocOpen || ttsOpen || activeBook?.format === 'pdf') return undefined;
    const timer = window.setTimeout(() => setControlsVisible(false), 4200);
    return () => window.clearTimeout(timer);
  }, [readingOpen, controlsVisible, settingsOpen, tocOpen, ttsOpen, activeBook?.format]);

  const supportsDeviceTts = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  const vietnameseVoices = useMemo(() => {
    const seen = new Set<string>();
    return [...ttsVoices]
      .filter((voice) => voice.lang.toLowerCase().startsWith('vi'))
      .filter((voice) => {
        const key = `${voice.voiceURI}|${voice.name}|${voice.lang}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
  }, [ttsVoices]);

  const fallbackVoices = vietnameseVoices.length ? vietnameseVoices : ttsVoices;
  const automaticVoice = fallbackVoices[0];
  const selectedVoice = activeBook
    ? ttsVoices.find((voice) => voice.voiceURI === activeBook.ttsVoiceUri) || automaticVoice
    : undefined;

  const availableOnlineVoices = onlineVoices.filter((voice) => voice.available);
  const selectedOnlineVoice = activeBook
    ? availableOnlineVoices.find((voice) => voice.id === activeBook.ttsOnlineVoiceId)
      || availableOnlineVoices.find((voice) => voice.provider === 'azure')
      || availableOnlineVoices[0]
    : undefined;

  const ttsPlaybackMode: ReaderTtsMode = activeBook?.ttsMode === 'online' && selectedOnlineVoice ? 'online' : 'device';

  const cleanupOnlineAudio = () => {
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    const audio = onlineAudioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.ontimeupdate = null;
      audio.pause();
      audio.src = '';
    }
    onlineAudioRef.current = null;
    if (onlineAudioUrlRef.current) URL.revokeObjectURL(onlineAudioUrlRef.current);
    onlineAudioUrlRef.current = null;
  };

  const pinListeningPosition = (chunkIndex: number, chunkCount: number) => {
    if (!activeBook || activeBook.format === 'pdf' || chunkCount <= 0) return;
    const ratio = clamp(chunkIndex / chunkCount, 0, 1);
    setLiveScrollProgress(ratio);
    const overallProgress = calculateReaderProgress(
      activeBook.format,
      chapterIndex,
      epubChapters.length || activeBook.chapterCount,
      ratio,
    );
    const nowMs = Date.now();
    const isFinal = chunkIndex >= chunkCount;
    const page = Math.max(1, Math.min(visualPageCount, Math.floor(ratio * Math.max(1, visualPageCount - 1)) + 1));
    setVisualPage(page);
    if (readingMode === 'scroll') {
      const element = readingScrollRef.current;
      if (element) {
        const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
        element.scrollTop = maxScroll * ratio;
      }
    }
    if (!isFinal && nowMs - lastTtsPinWriteRef.current < 700) return;
    lastTtsPinWriteRef.current = nowMs;
    const now = new Date(nowMs).toISOString();
    setLastPinnedAt(now);
    updateBook(activeBook.id, {
      scrollProgress: ratio,
      overallProgress,
      listeningProgress: overallProgress,
      currentPage: page - 1,
      lastPositionAt: now,
      lastOpenedAt: now,
    });
  };

  const stopSpeech = () => {
    speechStoppedRef.current = true;
    cleanupOnlineAudio();
    if (supportsDeviceTts) window.speechSynthesis.cancel();
    setTtsStatus('idle');
  };

  const speakDeviceChunk = (index: number) => {
    if (!supportsDeviceTts || speechStoppedRef.current || !activeBook) return;
    const chunks = speechChunksRef.current;
    if (index >= chunks.length) {
      pinListeningPosition(chunks.length, chunks.length);
      setTtsStatus('idle');
      return;
    }
    speechIndexRef.current = index;
    pinListeningPosition(index, chunks.length);
    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = 'vi-VN';
    }
    utterance.rate = activeBook.ttsRate || 0.95;
    utterance.pitch = activeBook.ttsPitch || 1;
    utterance.onboundary = (event) => {
      const local = chunks[index]?.length ? clamp(event.charIndex / chunks[index].length, 0, 1) : 0;
      pinListeningPosition(index + local, chunks.length);
    };
    utterance.onend = () => {
      if (!speechStoppedRef.current) speakDeviceChunk(index + 1);
    };
    utterance.onerror = (event) => {
      if (event.error !== 'interrupted' && event.error !== 'canceled') setTtsStatus('idle');
    };
    window.speechSynthesis.speak(utterance);
    setTtsStatus('playing');
  };

  const requestOnlineAudio = async (text: string): Promise<Blob> => {
    if (!activeBook || !selectedOnlineVoice) throw new Error('Chưa có giọng online khả dụng.');
    ttsAbortRef.current?.abort();
    const controller = new AbortController();
    ttsAbortRef.current = controller;
    const response = await fetch('/api/reader/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        text,
        provider: selectedOnlineVoice.provider,
        voice: selectedOnlineVoice.id,
        rate: activeBook.ttsRate,
        pitch: activeBook.ttsPitch,
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(payload.error || 'Không tạo được giọng đọc online.');
    }
    return response.blob();
  };

  const speakOnlineChunk = async (index: number) => {
    if (speechStoppedRef.current || !activeBook) return;
    const chunks = speechChunksRef.current;
    if (index >= chunks.length) {
      pinListeningPosition(chunks.length, chunks.length);
      setTtsStatus('idle');
      return;
    }
    speechIndexRef.current = index;
    pinListeningPosition(index, chunks.length);
    try {
      cleanupOnlineAudio();
      const blob = await requestOnlineAudio(chunks[index]);
      if (speechStoppedRef.current) return;
      const url = URL.createObjectURL(blob);
      onlineAudioUrlRef.current = url;
      const audio = new Audio(url);
      onlineAudioRef.current = audio;
      audio.ontimeupdate = () => {
        if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
        const local = clamp(audio.currentTime / audio.duration, 0, 1);
        pinListeningPosition(index + local, chunks.length);
      };
      audio.onended = () => {
        cleanupOnlineAudio();
        if (!speechStoppedRef.current) void speakOnlineChunk(index + 1);
      };
      audio.onerror = () => {
        cleanupOnlineAudio();
        setTtsStatus('idle');
        addToast('Giọng online bị lỗi khi phát. Thử đổi giọng hoặc chuyển sang giọng trên máy.', 'warning');
      };
      await audio.play();
      setTtsStatus('playing');
    } catch (error) {
      if ((error as Error)?.name === 'AbortError' || speechStoppedRef.current) return;
      cleanupOnlineAudio();
      setTtsStatus('idle');
      addToast(error instanceof Error ? error.message : 'Không tạo được giọng đọc online.', 'warning');
    }
  };

  const startSpeech = () => {
    if (!activeBook || activeBook.format === 'pdf') return;
    const speechSource = activeBook.ttsCleanText ? sanitizeSpeechText(readerText) : readerText;
    const chunks = splitSpeechText(speechSource);
    if (!chunks.length) {
      addToast('Chương này không có nội dung để đọc.', 'warning');
      return;
    }
    stopSpeech();
    speechStoppedRef.current = false;
    speechChunksRef.current = chunks;
    const startIndex = clamp(Math.floor(liveScrollProgress * chunks.length), 0, Math.max(0, chunks.length - 1));
    if (ttsPlaybackMode === 'online' && selectedOnlineVoice) {
      void speakOnlineChunk(startIndex);
      return;
    }
    if (!supportsDeviceTts) {
      addToast('Không có giọng online và trình duyệt cũng không hỗ trợ giọng trên máy.', 'warning');
      return;
    }
    speakDeviceChunk(startIndex);
  };

  const previewVoice = async () => {
    if (!activeBook) return;
    const sample = 'Đây là giọng đọc thử tiếng Việt. Hãy chọn giọng bạn thấy dễ nghe nhất để nghe sách.';
    stopSpeech();
    speechStoppedRef.current = false;
    if (ttsPlaybackMode === 'online' && selectedOnlineVoice) {
      try {
        const blob = await requestOnlineAudio(sample);
        if (speechStoppedRef.current) return;
        const url = URL.createObjectURL(blob);
        onlineAudioUrlRef.current = url;
        const audio = new Audio(url);
        onlineAudioRef.current = audio;
        audio.onended = () => { cleanupOnlineAudio(); setTtsStatus('idle'); };
        await audio.play();
        setTtsStatus('playing');
      } catch (error) {
        cleanupOnlineAudio();
        setTtsStatus('idle');
        addToast(error instanceof Error ? error.message : 'Không nghe thử được giọng online.', 'warning');
      }
      return;
    }
    if (!supportsDeviceTts) {
      addToast('Trình duyệt này chưa có giọng đọc trên máy.', 'warning');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(sample);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = 'vi-VN';
    }
    utterance.rate = activeBook.ttsRate || 0.95;
    utterance.pitch = activeBook.ttsPitch || 1;
    utterance.onend = () => setTtsStatus('idle');
    window.speechSynthesis.speak(utterance);
    setTtsStatus('playing');
  };

  const toggleSpeech = () => {
    if (!activeBook) return;
    if (ttsPlaybackMode === 'online' && onlineAudioRef.current) {
      if (ttsStatus === 'playing') {
        onlineAudioRef.current.pause();
        setTtsStatus('paused');
      } else if (ttsStatus === 'paused') {
        void onlineAudioRef.current.play();
        setTtsStatus('playing');
      } else {
        startSpeech();
      }
      return;
    }
    if (ttsPlaybackMode === 'device' && supportsDeviceTts) {
      if (ttsStatus === 'playing') {
        window.speechSynthesis.pause();
        setTtsStatus('paused');
      } else if (ttsStatus === 'paused') {
        window.speechSynthesis.resume();
        setTtsStatus('playing');
      } else {
        startSpeech();
      }
      return;
    }
    startSpeech();
  };

  useEffect(() => () => {
    speechStoppedRef.current = true;
    cleanupOnlineAudio();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const flushReaderTime = () => {
    const pending = readerTimePendingRef.current;
    if (!activeBookId || (pending.reading <= 0 && pending.listening <= 0)) return;
    const date = readerDateKey();
    const reading = Math.round(pending.reading);
    const listening = Math.round(pending.listening);
    readerTimePendingRef.current = { reading: 0, listening: 0 };
    setBooks((previous) => previous.map((book) => {
      if (book.id !== activeBookId) return book;
      return {
        ...book,
        readingSecondsByDate: reading > 0
          ? { ...book.readingSecondsByDate, [date]: (book.readingSecondsByDate?.[date] || 0) + reading }
          : book.readingSecondsByDate,
        listeningSecondsByDate: listening > 0
          ? { ...book.listeningSecondsByDate, [date]: (book.listeningSecondsByDate?.[date] || 0) + listening }
          : book.listeningSecondsByDate,
        updatedAt: new Date().toISOString(),
      };
    }));
  };

  useEffect(() => {
    if (!readingOpen || !activeBookId) return undefined;
    let lastTick = Date.now();
    readerActivityAtRef.current = lastTick;
    const timer = window.setInterval(() => {
      const now = Date.now();
      const delta = clamp((now - lastTick) / 1000, 0, 6);
      lastTick = now;
      if (document.visibilityState !== 'visible') return;
      if (ttsStatus === 'playing') {
        readerTimePendingRef.current.listening += delta;
      } else if (now - readerActivityAtRef.current <= 180_000) {
        readerTimePendingRef.current.reading += delta;
      }
      if (readerTimePendingRef.current.reading + readerTimePendingRef.current.listening >= 30) flushReaderTime();
    }, 5000);

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushReaderTime();
      else {
        lastTick = Date.now();
        readerActivityAtRef.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      flushReaderTime();
    };
  }, [readingOpen, activeBookId, ttsStatus]);

  const openBook = (id: string) => {
    stopSpeech();
    readerActivityAtRef.current = Date.now();
    setActiveBookId(id);
    setReadingOpen(true);
    setControlsVisible(false);
    setSettingsOpen(false);
    setTocOpen(false);
    setTtsOpen(false);
    updateBook(id, { lastOpenedAt: new Date().toISOString() });
  };

  const addBook = (book: ReaderBook) => {
    setBooks((previous) => [book, ...previous]);
    if (!activeBookId) setActiveBookId(book.id);
    addToast(`Đã thêm “${book.title}” vào thư viện`, 'success');
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (books.length >= READER_MAX_BOOKS) {
      addToast(`Thư viện đang giới hạn ${READER_MAX_BOOKS} sách.`, 'warning');
      return;
    }
    const format = detectReaderFormat(file.name);
    if (!format) {
      addToast('Hỗ trợ PDF, EPUB, TXT và MD.', 'warning');
      return;
    }
    if (file.size > READER_MAX_FILE_BYTES) {
      addToast(`File vượt giới hạn ${Math.round(READER_MAX_FILE_BYTES / 1024 / 1024)} MB.`, 'warning');
      return;
    }

    setFileBusy(true);
    try {
      if (format === 'text') {
        const content = await file.text();
        if (!content.trim()) throw new Error('File không có nội dung để đọc.');
        if (content.length > READER_MAX_BOOK_CHARS) throw new Error('File văn bản quá lớn để lưu trực tiếp.');
        const book = createReaderBook({
          title: formatFileTitle(file.name),
          content,
          format,
          fileName: file.name,
          fileSize: file.size,
        });
        book.binaryKey = `reader-file:${book.id}`;
        await saveReaderBinary(book.binaryKey, new Blob([content], { type: file.type || 'text/plain;charset=utf-8' }));
        addBook(book);
        void syncNewBookToCloud(book, file);
        return;
      }

      let parsedTitle = formatFileTitle(file.name);
      let parsedAuthor: string | undefined;
      let parsedEpub: Awaited<ReturnType<typeof parseEpubBook>> | undefined;
      if (format === 'epub') {
        parsedEpub = await parseEpubBook(file);
        parsedTitle = parsedEpub.title || parsedTitle;
        parsedAuthor = parsedEpub.author;
      }

      const book = createReaderBook({
        title: parsedTitle,
        author: parsedAuthor,
        format,
        fileName: file.name,
        fileSize: file.size,
      });
      book.binaryKey = `reader-file:${book.id}`;
      await saveReaderBinary(book.binaryKey, file);
      if (parsedEpub) {
        if (parsedEpub.cover) {
          book.coverKey = `reader-cover:${book.id}`;
          await saveReaderBinary(book.coverKey, parsedEpub.cover);
        }
        book.chapterCount = parsedEpub.chapters.length;
        epubCacheRef.current.set(book.id, parsedEpub.chapters);
      }
      addBook(book);
      void syncNewBookToCloud(book, file, parsedEpub?.cover);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Không thể thêm file sách.', 'error');
    } finally {
      setFileBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePasteSubmit = () => {
    const content = draftContent.trim();
    if (!content) {
      addToast('Hãy dán nội dung sách trước.', 'warning');
      return;
    }
    if (books.length >= READER_MAX_BOOKS) {
      addToast(`Thư viện đang giới hạn ${READER_MAX_BOOKS} sách.`, 'warning');
      return;
    }
    if (content.length > READER_MAX_BOOK_CHARS) {
      addToast('Nội dung quá lớn để lưu trực tiếp.', 'warning');
      return;
    }
    const book = createReaderBook({ title: draftTitle, author: draftAuthor, content, format: 'text' });
    book.binaryKey = `reader-file:${book.id}`;
    void saveReaderBinary(book.binaryKey, new Blob([content], { type: 'text/plain;charset=utf-8' }));
    addBook(book);
    void syncNewBookToCloud(book, new Blob([content], { type: 'text/plain;charset=utf-8' }));
    setDraftTitle('');
    setDraftAuthor('');
    setDraftContent('');
    setPasteOpen(false);
  };

  const removeBook = (book: ReaderBook) => {
    const nextBooks = books.filter((item) => item.id !== book.id);
    setBooks(nextBooks);
    if (activeBookId === book.id) {
      stopSpeech();
      setActiveBookId(nextBooks[0]?.id || null);
      setReadingOpen(false);
      setTtsOpen(false);
    }
    epubCacheRef.current.delete(book.id);
    if (book.binaryKey) void deleteReaderBinary(book.binaryKey).catch(() => undefined);
    if (book.coverKey) void deleteReaderBinary(book.coverKey).catch(() => undefined);
    if (user?.uid) void deleteCloudReaderBook(user.uid, book).catch(() => undefined);
    addToast(`Đã xóa “${book.title}” khỏi thư viện`, 'info');
  };

  const getScrollMetrics = () => {
    const element = readingScrollRef.current;
    if (!element) return null;
    const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
    const withinPage = maxScroll <= 0 ? 0 : clamp(element.scrollTop / maxScroll, 0, 1);
    const pageCount = Math.max(1, readerPages.length);
    const page = clamp(visualPage, 1, pageCount);
    const chapterRatio = clamp(((page - 1) + withinPage) / pageCount, 0, 1);
    return { withinPage, chapterRatio, page, pageCount };
  };

  const persistCurrentReadingPosition = (pageOverride?: number) => {
    if (!activeBook || activeBook.format === 'pdf') return;

    if (readingMode === 'scroll') {
      const metrics = getScrollMetrics();
      if (!metrics) return;
      const overallProgress = calculateReaderProgress(
        activeBook.format,
        chapterIndex,
        epubChapters.length || activeBook.chapterCount,
        metrics.chapterRatio,
      );
      const now = new Date().toISOString();
      setLiveScrollProgress(metrics.chapterRatio);
      setVisualPageCount(metrics.pageCount);
      setVisualPage(metrics.page);
      setLastPinnedAt(now);
      updateBook(activeBook.id, {
        currentPage: metrics.page - 1,
        pageScrollProgress: metrics.withinPage,
        scrollProgress: metrics.chapterRatio,
        overallProgress,
        lastPositionAt: now,
        lastOpenedAt: now,
      });
      return;
    }

    const pageCount = Math.max(1, readerPages.length);
    const page = clamp(pageOverride || visualPage, 1, pageCount);
    const ratio = pageCount <= 1 ? 0 : (page - 1) / (pageCount - 1);
    const overallProgress = calculateReaderProgress(
      activeBook.format,
      chapterIndex,
      epubChapters.length || activeBook.chapterCount,
      ratio,
    );
    const now = new Date().toISOString();
    setLiveScrollProgress(ratio);
    setVisualPageCount(pageCount);
    setVisualPage(page);
    setLastPinnedAt(now);
    updateBook(activeBook.id, {
      currentPage: page - 1,
      scrollProgress: ratio,
      overallProgress,
      lastPositionAt: now,
      lastOpenedAt: now,
    });
  };

  const handleReadingScroll = () => {
    if (!activeBook || activeBook.format === 'pdf' || readingMode !== 'scroll') return;
    const metrics = getScrollMetrics();
    if (!metrics) return;
    readerActivityAtRef.current = Date.now();
    setLiveScrollProgress(metrics.chapterRatio);
    setVisualPageCount(metrics.pageCount);
    setVisualPage(metrics.page);

    if (scrollSaveTimerRef.current) window.clearTimeout(scrollSaveTimerRef.current);
    scrollSaveTimerRef.current = window.setTimeout(() => {
      const overallProgress = calculateReaderProgress(
        activeBook.format,
        chapterIndex,
        epubChapters.length || activeBook.chapterCount,
        metrics.chapterRatio,
      );
      const now = new Date().toISOString();
      setLastPinnedAt(now);
      updateBook(activeBook.id, {
        currentPage: metrics.page - 1,
        pageScrollProgress: metrics.withinPage,
        scrollProgress: metrics.chapterRatio,
        overallProgress,
        lastPositionAt: now,
        lastOpenedAt: now,
      });
    }, 320);
  };

  useEffect(() => {
    if (!readingOpen || !activeBook || activeBook.format === 'pdf') return undefined;
    const flush = () => persistCurrentReadingPosition();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [readingOpen, activeBook?.id, activeBook?.format, chapterIndex, readerText, readingMode]);

  const changeChapter = (nextIndex: number, edge: 'start' | 'end' = 'start') => {
    if (!activeBook || activeBook.format !== 'epub' || epubChapters.length === 0) return;
    const target = clamp(nextIndex, 0, epubChapters.length - 1);
    stopSpeech();
    readerActivityAtRef.current = Date.now();
    const ratio = edge === 'end' ? 1 : 0;
    const targetPageCount = Math.max(1, epubPageCounts[target] || 1);
    const targetPage = edge === 'end' ? targetPageCount : 1;
    pendingPageScrollRef.current = edge === 'end' ? 1 : 0;
    setLiveScrollProgress(ratio);
    setVisualPage(targetPage);
    setVisualPageCount(targetPageCount);
    const now = new Date().toISOString();
    setLastPinnedAt(now);
    updateBook(activeBook.id, {
      currentChapter: target,
      currentPage: targetPage - 1,
      pageScrollProgress: edge === 'end' ? 1 : 0,
      scrollProgress: ratio,
      overallProgress: calculateReaderProgress('epub', target, epubChapters.length, ratio),
      chapterCount: epubChapters.length,
      lastPositionAt: now,
      lastOpenedAt: now,
    });
    setTocOpen(false);
    setTtsOpen(false);
    setControlsVisible(false);
  };

  const commitPage = (page: number) => {
    const count = Math.max(1, readerPages.length);
    const nextPage = clamp(page, 1, count);
    setVisualPageCount(count);
    setVisualPage(nextPage);
    persistCurrentReadingPosition(nextPage);
  };

  const stepScrollPage = (direction: -1 | 1) => {
    if (!activeBook || activeBook.format === 'pdf' || readingMode !== 'scroll') return;
    const count = Math.max(1, readerPages.length);
    const target = visualPage + direction;
    readerActivityAtRef.current = Date.now();

    if (target >= 1 && target <= count) {
      const edgeScroll = direction > 0 ? 0 : 1;
      const chapterRatio = clamp(((target - 1) + edgeScroll) / count, 0, 1);
      pendingPageScrollRef.current = edgeScroll;
      setVisualPage(target);
      setVisualPageCount(count);
      setLiveScrollProgress(chapterRatio);
      const now = new Date().toISOString();
      setLastPinnedAt(now);
      updateBook(activeBook.id, {
        currentPage: target - 1,
        pageScrollProgress: edgeScroll,
        scrollProgress: chapterRatio,
        overallProgress: calculateReaderProgress(
          activeBook.format,
          chapterIndex,
          epubChapters.length || activeBook.chapterCount,
          chapterRatio,
        ),
        lastPositionAt: now,
        lastOpenedAt: now,
      });
      setPageTurnFx(direction > 0 ? 'next' : 'prev');
      if (pageTurnTimerRef.current) window.clearTimeout(pageTurnTimerRef.current);
      pageTurnTimerRef.current = window.setTimeout(() => setPageTurnFx(null), 110);
      return;
    }

    if (direction > 0 && activeBook.format === 'epub' && chapterIndex < epubChapters.length - 1) {
      setPageTurnFx('next');
      changeChapter(chapterIndex + 1, 'start');
    } else if (direction < 0 && activeBook.format === 'epub' && chapterIndex > 0) {
      setPageTurnFx('prev');
      changeChapter(chapterIndex - 1, 'end');
    }
  };

  const stepViewport = (direction: -1 | 1) => {
    if (!activeBook || activeBook.format === 'pdf' || readingMode !== 'paged') return;
    const count = Math.max(1, readerPages.length);
    const target = visualPage + direction;

    if (target >= 1 && target <= count) {
      commitPage(target);
      if (activeBook.pageTransition === 'slide') {
        setPageTurnFx(direction > 0 ? 'next' : 'prev');
        if (pageTurnTimerRef.current) window.clearTimeout(pageTurnTimerRef.current);
        pageTurnTimerRef.current = window.setTimeout(() => setPageTurnFx(null), 110);
      } else {
        setPageTurnFx(null);
      }
      return;
    }

    setPageTurnFx(null);
    if (direction > 0 && activeBook.format === 'epub' && chapterIndex < epubChapters.length - 1) {
      changeChapter(chapterIndex + 1, 'start');
    } else if (direction < 0 && activeBook.format === 'epub' && chapterIndex > 0) {
      changeChapter(chapterIndex - 1, 'end');
    }
  };

  const handlePageTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    readerActivityAtRef.current = Date.now();
    const touch = event.touches[0];
    touchStartXRef.current = touch?.clientX ?? null;
    touchStartYRef.current = touch?.clientY ?? null;
  };

  const handlePageTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const touch = event.changedTouches[0];
    const dx = (touch?.clientX ?? touchStartXRef.current) - touchStartXRef.current;
    const dy = (touch?.clientY ?? touchStartYRef.current) - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    readerActivityAtRef.current = Date.now();

    if (Math.abs(dx) < 52 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    if (readingMode === 'scroll') stepScrollPage(dx < 0 ? 1 : -1);
    else stepViewport(dx < 0 ? 1 : -1);
  };

  const toggleBrowserFullscreen = async () => {
    const root = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> | void; webkitFullscreenElement?: Element | null };
    try {
      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else await doc.webkitExitFullscreen?.();
      } else if (root.requestFullscreen) {
        await root.requestFullscreen();
      } else if (root.webkitRequestFullscreen) {
        await root.webkitRequestFullscreen();
      } else {
        addToast('Trình duyệt này không hỗ trợ toàn màn hình hệ thống. Chế độ đọc vẫn phủ toàn bộ ứng dụng.', 'info');
      }
    } catch {
      addToast('Trình duyệt đang chặn toàn màn hình hệ thống. Chế độ đọc vẫn hoạt động toàn màn hình trong app.', 'info');
    }
  };

  const closeReader = () => {
    if (scrollSaveTimerRef.current) {
      window.clearTimeout(scrollSaveTimerRef.current);
      scrollSaveTimerRef.current = null;
    }
    if (pageTurnTimerRef.current) {
      window.clearTimeout(pageTurnTimerRef.current);
      pageTurnTimerRef.current = null;
    }
    persistCurrentReadingPosition();
    flushReaderTime();
    stopSpeech();
    setReadingOpen(false);
    setSettingsOpen(false);
    setTocOpen(false);
    setTtsOpen(false);
    setControlsVisible(true);
  };

  const readingOverlay = readingOpen && activeBook ? (
    <div className={`fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col overflow-hidden ${themeStyles[activeBook.theme].shell}`}>
      <div
        className="relative flex min-h-0 flex-1 overflow-hidden"
        onPointerDown={() => { readerActivityAtRef.current = Date.now(); }}
      >
        {binaryLoading ? (
          <div className="grid flex-1 place-items-center">
            <div className="text-center opacity-60">
              <LoaderCircle className="mx-auto h-6 w-6 animate-spin" />
              <p className="mt-2 text-xs font-semibold">Đang mở sách…</p>
            </div>
          </div>
        ) : binaryError ? (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <p className="text-base font-bold">Không mở được sách</p>
              <p className={`mt-2 max-w-md text-sm leading-6 ${themeStyles[activeBook.theme].muted}`}>{binaryError}</p>
            </div>
          </div>
        ) : activeBook.format === 'pdf' ? (
          pdfUrl ? (
            <iframe
              title={activeBook.title}
              src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
              className="h-full w-full border-0 bg-white"
            />
          ) : null
        ) : (
          <div
            ref={readingScrollRef}
            onScroll={handleReadingScroll}
            onTouchStart={handlePageTouchStart}
            onTouchEnd={handlePageTouchEnd}
            className={`relative h-full w-full ${readingMode === 'scroll' ? 'overflow-y-auto overscroll-y-contain' : 'overflow-hidden'}`}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {readingMode === 'scroll' ? (
              <article
                key={`${activeBook.id}-${chapterIndex}-hybrid-${visualPage}-${pageCharLimit}`}
                className={`reader-page mx-auto min-h-full px-7 pb-20 pt-20 sm:px-10 ${widthClasses[activeBook.contentWidth]} ${pageTurnFx === 'next' ? 'reader-page-slide-next' : pageTurnFx === 'prev' ? 'reader-page-slide-prev' : ''}`}
                style={{
                  fontFamily: fontFamilies[activeBook.fontFamily],
                  fontSize: `${activeBook.fontSize}px`,
                  lineHeight: activeBook.lineHeight,
                }}
              >
                {activeBook.format === 'epub' && activeChapter?.title && visualPage === 1 ? (
                  <h1 className="mb-7 text-[1.45em] font-bold leading-tight tracking-[-0.02em]">{activeChapter.title}</h1>
                ) : null}
                <div lang="vi" className="[text-wrap:pretty]">
                  {visiblePageParagraphs.map((paragraph, index) => (
                    <p
                      key={`${visualPage}-${index}-${paragraph.slice(0, 18)}`}
                      className="mb-[0.95em] last:mb-0"
                      style={{
                        textAlign: activeBook.textAlign,
                        textJustify: 'inter-word',
                        hyphens: 'auto',
                        wordSpacing: activeBook.textAlign === 'justify' ? '0.015em' : undefined,
                      }}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            ) : (
              <>
                <article
                  key={`${activeBook.id}-${chapterIndex}-${visualPage}-${pageCharLimit}`}
                  className={`reader-page mx-auto flex h-full flex-col px-7 pb-24 pt-24 sm:px-10 ${widthClasses[activeBook.contentWidth]} ${
                    activeBook.pageTransition === 'slide' && pageTurnFx === 'next' ? 'reader-page-slide-next' : activeBook.pageTransition === 'slide' && pageTurnFx === 'prev' ? 'reader-page-slide-prev' : ''
                  }`}
                  style={{
                    fontFamily: fontFamilies[activeBook.fontFamily],
                    fontSize: `${activeBook.fontSize}px`,
                    lineHeight: activeBook.lineHeight,
                  }}
                >
                  <div className="min-h-0 flex-1 overflow-hidden">
                    {activeBook.format === 'epub' && activeChapter?.title && visualPage === 1 ? (
                      <h1 className="mb-7 text-[1.45em] font-bold leading-tight tracking-[-0.02em]">{activeChapter.title}</h1>
                    ) : null}
                    <div lang="vi" className="[text-wrap:pretty]">
                      {visiblePageParagraphs.map((paragraph, index) => (
                        <p
                          key={`${visualPage}-${index}-${paragraph.slice(0, 18)}`}
                          className="mb-[0.95em] last:mb-0"
                          style={{
                            textAlign: activeBook.textAlign,
                            textJustify: 'inter-word',
                            hyphens: 'auto',
                            wordSpacing: activeBook.textAlign === 'justify' ? '0.015em' : undefined,
                          }}
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </article>
                <div className="pointer-events-none absolute inset-y-20 left-0 w-5 bg-gradient-to-r from-black/[0.035] to-transparent" />
                <div className="pointer-events-none absolute inset-y-20 right-0 w-5 bg-gradient-to-l from-black/[0.035] to-transparent" />
              </>
            )}
          </div>
        )}

        {controlsVisible && (
          <>
            <header className={`absolute inset-x-0 top-0 z-20 flex items-center gap-2 border-b px-3 pb-2 pt-[max(10px,env(safe-area-inset-top))] backdrop-blur-xl ${themeStyles[activeBook.theme].panel}`}>
              <button
                type="button"
                onClick={closeReader}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Đóng trình đọc"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1 px-1">
                <p className="truncate text-sm font-bold">{activeBook.title}</p>
                <p className={`mt-0.5 truncate text-[10px] font-semibold ${themeStyles[activeBook.theme].muted}`}>
                  {activeBook.format === 'epub' && activeChapter ? activeChapter.title : activeBook.author || formatLabels[activeBook.format]}
                  {activeBook.format !== 'pdf' ? ` · ${progress}%` : ''}
                </p>
              </div>
              {activeBook.format === 'epub' && (
                <button
                  type="button"
                  onClick={() => { setTocOpen(true); setSettingsOpen(false); setTtsOpen(false); }}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/5"
                  title="Mục lục"
                  aria-label="Mục lục"
                >
                  <List className="h-[18px] w-[18px]" />
                </button>
              )}
              {activeBook.format !== 'pdf' && (
                <button
                  type="button"
                  onClick={() => { setTtsOpen(true); setSettingsOpen(false); setTocOpen(false); }}
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/5 ${ttsStatus !== 'idle' ? 'text-indigo-500' : ''}`}
                  title="Nghe sách"
                  aria-label="Nghe sách"
                >
                  <Headphones className="h-[18px] w-[18px]" />
                </button>
              )}
              {activeBook.format !== 'pdf' && (
                <button
                  type="button"
                  onClick={() => { setSettingsOpen(true); setTocOpen(false); setTtsOpen(false); }}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/5"
                  title="Kiểu đọc"
                  aria-label="Kiểu đọc"
                >
                  <Type className="h-[18px] w-[18px]" />
                </button>
              )}
              <button
                type="button"
                onClick={() => void toggleBrowserFullscreen()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/5"
                title={isBrowserFullscreen ? 'Thoát toàn màn hình hệ thống' : 'Toàn màn hình hệ thống'}
                aria-label="Toàn màn hình"
              >
                {isBrowserFullscreen ? <Minimize2 className="h-[18px] w-[18px]" /> : <Maximize2 className="h-[18px] w-[18px]" />}
              </button>
            </header>

            {activeBook.format !== 'pdf' ? (
              <footer className={`absolute inset-x-0 bottom-0 z-20 border-t px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl ${themeStyles[activeBook.theme].panel}`}>
                <div className="mx-auto max-w-3xl">
                  <div className="mb-3 h-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div className="h-full rounded-full bg-indigo-500 transition-[width] duration-200" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    {readingMode === 'paged' ? (
                      <button
                        type="button"
                        onClick={() => stepViewport(-1)}
                        className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/5"
                        aria-label="Lùi một trang"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                    ) : <span className="h-10 w-10" />}
                    <button
                      type="button"
                      onClick={() => setControlsVisible(false)}
                      className={`min-w-0 flex-1 text-center text-[10px] font-semibold ${themeStyles[activeBook.theme].muted}`}
                    >
                      <span className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-current">
                        <BookmarkCheck className="h-3.5 w-3.5 text-indigo-500" />
                        {formatSavedAt(lastPinnedAt || activeBook.lastPositionAt)} · Trang {bookVisualPage}/{bookPageCount}
                      </span>
                      <span className="mt-0.5 block text-[9px] font-medium">
                        {activeBook.format === 'epub'
                          ? `Chương ${chapterIndex + 1}/${Math.max(1, epubChapters.length)} · ${progress}% toàn sách`
                          : `${progress}% toàn sách · ${readingMode === 'scroll' ? 'cuộn dọc qua từng trang' : 'chạm hai mép để chuyển trang'}`}
                      </span>
                    </button>
                    {readingMode === 'paged' ? (
                      <button
                        type="button"
                        onClick={() => stepViewport(1)}
                        className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/5"
                        aria-label="Tiến một trang"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    ) : <span className="h-10 w-10" />}
                  </div>
                </div>
              </footer>
            ) : (
              <footer className={`absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl ${themeStyles[activeBook.theme].panel}`}>
                <span className={`text-[10px] font-semibold ${themeStyles[activeBook.theme].muted}`}>PDF · trình xem của thiết bị</span>
                {pdfUrl ? (
                  <a href={pdfUrl} target="_blank" rel="noreferrer" className="flex h-9 items-center gap-1.5 rounded-xl border border-current/15 px-3 text-[10px] font-bold">
                    <ExternalLink className="h-3.5 w-3.5" /> Mở riêng
                  </a>
                ) : null}
              </footer>
            )}
          </>
        )}

        {!controlsVisible && (
          <>
            <button
              type="button"
              aria-label="Mở thanh công cụ phía trên"
              onClick={() => { readerActivityAtRef.current = Date.now(); setControlsVisible(true); }}
              className="absolute inset-x-0 top-0 z-20 h-[max(54px,env(safe-area-inset-top))] bg-transparent"
            />
            <button
              type="button"
              aria-label="Mở thanh công cụ phía dưới"
              onClick={() => { readerActivityAtRef.current = Date.now(); setControlsVisible(true); }}
              className="absolute inset-x-0 bottom-0 z-20 h-[max(62px,env(safe-area-inset-bottom))] bg-transparent"
            />
          </>
        )}

        {settingsOpen && activeBook.format !== 'pdf' && (
          <div className="absolute inset-0 z-30 flex items-end bg-black/20" onClick={() => setSettingsOpen(false)}>
            <section
              className={`max-h-[88dvh] w-full overflow-y-auto rounded-t-[28px] border-t p-5 pb-[max(22px,env(safe-area-inset-bottom))] shadow-2xl ${themeStyles[activeBook.theme].panel}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto max-w-xl">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold">Kiểu đọc</h2>
                    <p className={`mt-0.5 text-[10px] font-semibold ${themeStyles[activeBook.theme].muted}`}>Lưu riêng theo từng cuốn sách</p>
                  </div>
                  <button type="button" onClick={() => setSettingsOpen(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5"><X className="h-4 w-4" /></button>
                </div>

                <div className="space-y-5">
                  <div>
                    <p className={`mb-2 text-[10px] font-bold uppercase tracking-wider ${themeStyles[activeBook.theme].muted}`}>Cách đọc</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([['scroll', 'Cuộn trong trang'], ['paged', 'Lật ngang']] as Array<[ReaderReadingMode, string]>).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => { persistCurrentReadingPosition(); updateBook(activeBook.id, { readingMode: id }); }}
                          className={`h-10 rounded-xl border text-xs font-bold transition ${readingMode === id ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-current/15 bg-transparent'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className={`mt-2 text-[9px] leading-4 ${themeStyles[activeBook.theme].muted}`}>Cuộn trong trang: vuốt lên/xuống chỉ trong trang hiện tại; muốn sang trang thì vuốt ngang trái/phải. Khi thanh công cụ ẩn, màn hình chỉ còn nội dung sách.</p>
                  </div>

                  <div>
                    <p className={`mb-2 text-[10px] font-bold uppercase tracking-wider ${themeStyles[activeBook.theme].muted}`}>Font chữ</p>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        ['book', 'Sách'],
                        ['serif', 'Serif'],
                        ['sans', 'Sans'],
                      ] as Array<[ReaderFont, string]>).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => updateBook(activeBook.id, { fontFamily: id })}
                          className={`h-11 rounded-xl border text-sm font-bold transition ${activeBook.fontFamily === id ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-current/15 bg-transparent'}`}
                          style={{ fontFamily: fontFamilies[id] }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label>
                      <span className={`flex items-center justify-between text-[10px] font-bold uppercase tracking-wider ${themeStyles[activeBook.theme].muted}`}><span>Cỡ chữ</span><span>{activeBook.fontSize}px</span></span>
                      <input type="range" min="15" max="30" step="1" value={activeBook.fontSize} onChange={(event) => updateBook(activeBook.id, { fontSize: Number(event.target.value) })} className="mt-3 w-full accent-indigo-500" />
                    </label>
                    <label>
                      <span className={`flex items-center justify-between text-[10px] font-bold uppercase tracking-wider ${themeStyles[activeBook.theme].muted}`}><span>Giãn dòng</span><span>{activeBook.lineHeight.toFixed(1)}</span></span>
                      <input type="range" min="1.4" max="2.3" step="0.1" value={activeBook.lineHeight} onChange={(event) => updateBook(activeBook.id, { lineHeight: Number(event.target.value) })} className="mt-3 w-full accent-indigo-500" />
                    </label>
                  </div>

                  <div>
                    <p className={`mb-2 text-[10px] font-bold uppercase tracking-wider ${themeStyles[activeBook.theme].muted}`}>Căn chữ</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateBook(activeBook.id, { textAlign: 'justify' })}
                        className={`flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-bold transition ${activeBook.textAlign === 'justify' ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-current/15 bg-transparent'}`}
                      >
                        <AlignJustify className="h-4 w-4" /> Căn đều
                      </button>
                      <button
                        type="button"
                        onClick={() => updateBook(activeBook.id, { textAlign: 'left' })}
                        className={`flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-bold transition ${activeBook.textAlign === 'left' ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-current/15 bg-transparent'}`}
                      >
                        <AlignLeft className="h-4 w-4" /> Căn trái
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className={`mb-2 text-[10px] font-bold uppercase tracking-wider ${themeStyles[activeBook.theme].muted}`}>Bề rộng trang</p>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        ['narrow', 'Hẹp'],
                        ['medium', 'Vừa'],
                        ['wide', 'Rộng'],
                      ] as Array<[ReaderWidth, string]>).map(([id, label]) => (
                        <button key={id} type="button" onClick={() => updateBook(activeBook.id, { contentWidth: id })} className={`h-10 rounded-xl border text-xs font-bold transition ${activeBook.contentWidth === id ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-current/15 bg-transparent'}`}>{label}</button>
                      ))}
                    </div>
                  </div>

                  {readingMode === 'paged' ? (
                    <div>
                      <p className={`mb-2 text-[10px] font-bold uppercase tracking-wider ${themeStyles[activeBook.theme].muted}`}>Chuyển trang</p>
                      <div className="grid grid-cols-2 gap-2">
                        {([['none', 'Không hiệu ứng'], ['slide', 'Trượt nhẹ']] as Array<[ReaderPageTransition, string]>).map(([id, label]) => (
                          <button key={id} type="button" onClick={() => updateBook(activeBook.id, { pageTransition: id })} className={`h-10 rounded-xl border text-xs font-bold transition ${activeBook.pageTransition === id ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-current/15 bg-transparent'}`}>{label}</button>
                        ))}
                      </div>
                      <p className={`mt-2 text-[9px] leading-4 ${themeStyles[activeBook.theme].muted}`}>Mặc định không hiệu ứng. Vuốt trái/phải để chuyển trang.</p>
                    </div>
                  ) : null}

                  <div>
                    <p className={`mb-2 text-[10px] font-bold uppercase tracking-wider ${themeStyles[activeBook.theme].muted}`}>Màu nền</p>
                    <div className="grid grid-cols-3 gap-2">
                      {themeButtons.map((theme) => {
                        const Icon = theme.icon;
                        return (
                          <button key={theme.id} type="button" onClick={() => updateBook(activeBook.id, { theme: theme.id })} className={`flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-bold transition ${activeBook.theme === theme.id ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-current/15 bg-transparent'}`}>
                            <Icon className="h-3.5 w-3.5" /> {theme.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {ttsOpen && activeBook.format !== 'pdf' && (
          <div className="absolute inset-0 z-30 flex items-end bg-black/20" onClick={() => setTtsOpen(false)}>
            <section
              className={`max-h-[88dvh] w-full overflow-y-auto rounded-t-[28px] border-t p-5 pb-[max(22px,env(safe-area-inset-bottom))] shadow-2xl ${themeStyles[activeBook.theme].panel}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto max-w-xl">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold">Nghe sách</h2>
                    <p className={`mt-0.5 text-[10px] font-semibold ${themeStyles[activeBook.theme].muted}`}>Đọc từ vị trí hiện tại trong chương này</p>
                  </div>
                  <button type="button" onClick={() => setTtsOpen(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5"><X className="h-4 w-4" /></button>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={toggleSpeech}
                    className="grid h-14 w-14 place-items-center rounded-full bg-indigo-500 text-white shadow-sm transition hover:bg-indigo-600"
                    aria-label={ttsStatus === 'playing' ? 'Tạm dừng' : 'Phát'}
                  >
                    {ttsStatus === 'playing' ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
                  </button>
                  <button
                    type="button"
                    onClick={stopSpeech}
                    disabled={ttsStatus === 'idle'}
                    className="grid h-11 w-11 place-items-center rounded-full border border-current/15 disabled:opacity-35"
                    aria-label="Dừng đọc"
                  >
                    <Square className="h-4 w-4" />
                  </button>
                </div>

                <div className={`mt-5 grid gap-2 rounded-2xl border border-current/10 p-1.5 ${availableOnlineVoices.length ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {availableOnlineVoices.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        stopSpeech();
                        updateBook(activeBook.id, { ttsMode: 'online' });
                      }}
                      className={`flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-bold transition ${ttsPlaybackMode === 'online' ? 'bg-indigo-500 text-white shadow-sm' : 'hover:bg-black/5'}`}
                    >
                      <Cloud className="h-4 w-4" /> Online neural
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      stopSpeech();
                      updateBook(activeBook.id, { ttsMode: 'device' });
                    }}
                    className={`flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-bold transition ${ttsPlaybackMode === 'device' ? 'bg-indigo-500 text-white shadow-sm' : 'hover:bg-black/5'}`}
                  >
                    <Smartphone className="h-4 w-4" /> Trên máy
                  </button>
                </div>

                {!onlineVoicesLoading && availableOnlineVoices.length === 0 && onlineTtsError ? (
                  <div className="mt-3 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-3.5 py-3 text-[10px] font-semibold leading-5 text-amber-800">
                    {onlineTtsError} Reader đã tự chuyển sang giọng trên máy; khi API online hoạt động, tab Online neural sẽ tự xuất hiện lại.
                  </div>
                ) : null}

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className={`flex items-center justify-between text-[10px] font-bold uppercase tracking-wider ${themeStyles[activeBook.theme].muted}`}>
                      <span>Giọng đọc</span>
                      <span className="normal-case tracking-normal">
                        {ttsPlaybackMode === 'online'
                          ? `${availableOnlineVoices.length} dùng được`
                          : `${vietnameseVoices.length || fallbackVoices.length} trên máy`}
                      </span>
                    </span>
                    {ttsPlaybackMode === 'online' ? (
                      <select
                        value={selectedOnlineVoice ? `${selectedOnlineVoice.provider}|${selectedOnlineVoice.id}` : ''}
                        onChange={(event) => {
                          stopSpeech();
                          const [provider, ...voiceParts] = event.target.value.split('|');
                          const voiceId = voiceParts.join('|');
                          if (!voiceId) return;
                          updateBook(activeBook.id, {
                            ttsOnlineProvider: provider === 'google' ? 'google' : 'azure',
                            ttsOnlineVoiceId: voiceId,
                          });
                        }}
                        className="mt-2 h-11 w-full rounded-xl border border-current/15 bg-transparent px-3 text-sm outline-none"
                      >
                        {onlineVoicesLoading && <option value="">Đang tải giọng online…</option>}
                        {onlineVoices.some((voice) => voice.provider === 'azure') && (
                          <optgroup label="Microsoft Azure">
                            {onlineVoices.filter((voice) => voice.provider === 'azure').map((voice) => (
                              <option key={`${voice.provider}-${voice.id}`} value={`${voice.provider}|${voice.id}`} disabled={!voice.available}>
                                {voice.name} · {voice.quality === 'hd' ? 'HD' : 'Neural'}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {onlineVoices.some((voice) => voice.provider === 'google') && (
                          <optgroup label="Google Cloud · nhiều giọng">
                            {onlineVoices.filter((voice) => voice.provider === 'google').map((voice) => (
                              <option key={`${voice.provider}-${voice.id}`} value={`${voice.provider}|${voice.id}`} disabled={!voice.available}>
                                {voice.name}{voice.available ? '' : ' · chưa bật API key'}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    ) : (
                      <select
                        value={activeBook.ttsVoiceUri || ''}
                        onChange={(event) => {
                          stopSpeech();
                          updateBook(activeBook.id, { ttsVoiceUri: event.target.value || undefined });
                        }}
                        className="mt-2 h-11 w-full rounded-xl border border-current/15 bg-transparent px-3 text-sm outline-none"
                      >
                        <option value="">Tự động · ưu tiên tiếng Việt</option>
                        {fallbackVoices.length ? fallbackVoices.map((voice) => (
                          <option key={`${voice.voiceURI}-${voice.name}`} value={voice.voiceURI}>{formatVoiceName(voice)}</option>
                        )) : <option value="">Chưa tìm thấy giọng trên thiết bị</option>}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => void previewVoice()}
                      className="mt-2 h-9 w-full rounded-xl border border-current/15 text-[11px] font-bold transition hover:bg-black/5"
                    >
                      Nghe thử giọng này
                    </button>
                    <p className={`mt-2 text-[9px] leading-4 ${themeStyles[activeBook.theme].muted}`}>
                      {ttsPlaybackMode === 'online'
                        ? 'Microsoft Azure có Hoài My/Nam Minh; Google Cloud có nhiều giọng hơn. Các nhóm chỉ hiện khi server đã cấu hình API key tương ứng.'
                        : availableOnlineVoices.length ? 'iPhone/Safari thường chỉ trả về ít giọng hệ thống; có thể chuyển sang Online neural khi API đang hoạt động.' : 'Đây là các giọng mà trình duyệt/thiết bị đang cung cấp. Giọng online sẽ tự hiện khi API reader TTS kết nối được.'}
                    </p>
                  </label>

                  <div className="space-y-4">
                    <label className="block">
                      <span className={`flex items-center justify-between text-[10px] font-bold uppercase tracking-wider ${themeStyles[activeBook.theme].muted}`}><span>Tốc độ</span><span>{activeBook.ttsRate.toFixed(2)}×</span></span>
                      <input
                        type="range"
                        min="0.75"
                        max="1.35"
                        step="0.05"
                        value={activeBook.ttsRate}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          stopSpeech();
                          updateBook(activeBook.id, { ttsRate: value });
                        }}
                        className="mt-3 w-full accent-indigo-500"
                      />
                    </label>
                    <label className="block">
                      <span className={`flex items-center justify-between text-[10px] font-bold uppercase tracking-wider ${themeStyles[activeBook.theme].muted}`}><span>Cao độ</span><span>{activeBook.ttsPitch.toFixed(2)}</span></span>
                      <input
                        type="range"
                        min="0.8"
                        max="1.2"
                        step="0.05"
                        value={activeBook.ttsPitch}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          stopSpeech();
                          updateBook(activeBook.id, { ttsPitch: value });
                        }}
                        className="mt-3 w-full accent-indigo-500"
                      />
                    </label>
                  </div>
                </div>

                <label className="mt-5 flex items-start gap-3 rounded-2xl border border-current/10 p-3">
                  <input
                    type="checkbox"
                    checked={activeBook.ttsCleanText}
                    onChange={(event) => {
                      stopSpeech();
                      updateBook(activeBook.id, { ttsCleanText: event.target.checked });
                    }}
                    className="mt-0.5 h-4 w-4 accent-indigo-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold">Lọc nội dung gây khó chịu</span>
                    <span className={`mt-0.5 block text-[10px] leading-4 ${themeStyles[activeBook.theme].muted}`}>Bỏ URL, www, email, domain, ISBN/DOI, số chú thích và ký hiệu rác trước khi đọc.</span>
                  </span>
                </label>

                <div className={`mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] font-medium leading-5 ${themeStyles[activeBook.theme].muted}`}>
                  <BookmarkCheck className="h-3.5 w-3.5 text-indigo-500" />
                  Khi đọc hoặc nghe, vị trí được ghim tự động. Mở lại sách sẽ quay đúng chỗ gần nhất.
                </div>
              </div>
            </section>
          </div>
        )}

        {tocOpen && activeBook.format === 'epub' && (
          <div className="absolute inset-0 z-30 flex items-end bg-black/20" onClick={() => setTocOpen(false)}>
            <section
              className={`max-h-[78dvh] w-full overflow-hidden rounded-t-[28px] border-t shadow-2xl ${themeStyles[activeBook.theme].panel}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-current/10 px-5 py-4">
                <div>
                  <h2 className="text-base font-bold">Mục lục</h2>
                  <p className={`mt-0.5 text-[10px] font-semibold ${themeStyles[activeBook.theme].muted}`}>{epubChapters.length} chương</p>
                </div>
                <button type="button" onClick={() => setTocOpen(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5"><X className="h-4 w-4" /></button>
              </div>
              <div className="max-h-[calc(78dvh-72px)] overflow-y-auto px-3 pb-[max(18px,env(safe-area-inset-bottom))] pt-2">
                {epubChapters.map((chapter, index) => (
                  <button
                    key={chapter.id}
                    type="button"
                    onClick={() => changeChapter(index)}
                    className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${index === chapterIndex ? 'bg-indigo-500 text-white' : 'hover:bg-black/5'}`}
                  >
                    <span className={`mt-0.5 w-6 shrink-0 text-right text-[10px] font-bold ${index === chapterIndex ? 'text-white/70' : themeStyles[activeBook.theme].muted}`}>{index + 1}</span>
                    <span className="min-w-0 flex-1 text-sm font-semibold leading-5">{chapter.title}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-6">
      <PageHeader title="Sách" />

      {activeBook && (
        <button
          type="button"
          onClick={() => openBook(activeBook.id)}
          className="group w-full overflow-hidden rounded-[24px] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 text-left shadow-xs transition hover:border-indigo-200 hover:shadow-sm"
        >
          <div className="flex items-center gap-4">
            <span className="grid h-[76px] w-[54px] shrink-0 place-items-center overflow-hidden rounded-xl bg-indigo-600 text-white shadow-sm">
              {coverUrls[activeBook.id] ? (
                <img src={coverUrls[activeBook.id]} alt="" className="h-full w-full object-cover" />
              ) : (
                <BookOpen className="h-6 w-6" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-500">{activeBook.overallProgress > 0 ? 'Đọc tiếp' : 'Bắt đầu đọc'}</p>
              <h2 className="mt-1 truncate text-base font-bold text-slate-900">{activeBook.title}</h2>
              <p className="mt-1 truncate text-[11px] font-medium text-slate-400">
                {activeBook.author ? `${activeBook.author} · ` : ''}{readingLabel(activeBook)}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-indigo-400 transition group-hover:translate-x-0.5" />
          </div>
        </button>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Library className="h-4 w-4 text-slate-400" /> Thư viện</h2>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">
              {books.length}/{READER_MAX_BOOKS} sách · {user ? (
                cloudStatus === 'syncing' ? 'đang đồng bộ tài khoản…' : cloudStatus === 'error' ? 'một số sách chỉ có trên thiết bị' : 'đồng bộ theo tài khoản'
              ) : 'chỉ lưu trên thiết bị · đăng nhập để đồng bộ'}
            </p>
            {cloudError ? <p className="mt-0.5 text-[9px] font-medium text-amber-600">{cloudError}</p> : null}
          </div>
          <button
            type="button"
            disabled={fileBusy}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-3.5 text-[11px] font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {fileBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
            {fileBusy ? 'Đang đọc…' : 'Thêm sách'}
          </button>
          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept=".pdf,.epub,.txt,.md,.markdown,application/pdf,application/epub+zip,text/plain,text/markdown"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
        </div>

        {books.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xs">
            {books.map((book, index) => (
              <div key={book.id} className={`flex items-center gap-3 px-3 py-3 ${index > 0 ? 'border-t border-slate-100' : ''}`}>
                <button type="button" onClick={() => openBook(book.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className={`grid h-14 w-10 shrink-0 place-items-center overflow-hidden rounded-lg ${book.format === 'epub' ? 'bg-indigo-50 text-indigo-600' : book.format === 'pdf' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                    {coverUrls[book.id] ? (
                      <img src={coverUrls[book.id]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <BookOpen className="h-5 w-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-900">{book.title}</span>
                    <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400">
                      {book.author || formatLabels[book.format]}{book.fileSize ? ` · ${formatFileSize(book.fileSize)}` : ''}{user && book.cloudFilePath ? ' · đã sync' : ''}
                    </span>
                    {book.format !== 'pdf' ? <span className="mt-1 block text-[9px] font-bold text-indigo-500">{readingLabel(book)}</span> : null}
                  </span>
                </button>
                <button type="button" onClick={() => removeBook(book)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-300 transition hover:bg-rose-50 hover:text-rose-500" title="Xóa sách" aria-label="Xóa sách"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/70 bg-white py-8 shadow-xs">
            <EmptyState title="Chưa có sách" description="Thêm PDF hoặc EPUB để bắt đầu đọc." />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs">
        <button type="button" onClick={() => setPasteOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left">
          <div>
            <p className="text-xs font-bold text-slate-800">Văn bản thủ công</p>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">TXT · MD · hoặc dán nội dung trực tiếp</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition ${pasteOpen ? 'rotate-180' : ''}`} />
        </button>

        {pasteOpen && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Tên sách" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-300 focus:bg-white" />
              <input value={draftAuthor} onChange={(event) => setDraftAuthor(event.target.value)} placeholder="Tác giả (không bắt buộc)" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-300 focus:bg-white" />
            </div>
            <textarea value={draftContent} onChange={(event) => setDraftContent(event.target.value)} placeholder="Dán nội dung sách vào đây…" rows={6} className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none focus:border-indigo-300 focus:bg-white" />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[9px] font-medium text-slate-400">{draftContent.length.toLocaleString('vi-VN')} ký tự</span>
              <button type="button" onClick={handlePasteSubmit} className="rounded-xl bg-slate-900 px-4 py-2 text-[11px] font-bold text-white hover:bg-slate-800">Thêm vào thư viện</button>
            </div>
          </div>
        )}
      </section>

      {typeof document !== 'undefined' && readingOverlay ? createPortal(readingOverlay, document.body) : null}
    </div>
  );
};
