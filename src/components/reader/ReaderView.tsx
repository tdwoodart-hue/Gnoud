import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FilePlus2,
  Library,
  List,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Moon,
  Settings2,
  SunMedium,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  createReaderBook,
  deleteReaderBinary,
  detectReaderFormat,
  loadReaderBinary,
  loadReaderLibrary,
  parseEpubBook,
  READER_MAX_BOOK_CHARS,
  READER_MAX_BOOKS,
  READER_MAX_FILE_BYTES,
  saveReaderBinary,
  saveReaderLibrary,
  type EpubChapter,
  type ReaderBook,
  type ReaderFont,
  type ReaderFormat,
  type ReaderTheme,
  type ReaderWidth,
} from '../../services/readerService';
import { EmptyState } from '../common/EmptyState';
import { PageHeader } from '../common/PageHeader';

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const epubCacheRef = useRef(new Map<string, EpubChapter[]>());
  const readingScrollRef = useRef<HTMLDivElement>(null);
  const scrollSaveTimerRef = useRef<number | null>(null);

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

  const activeBook = books.find((book) => book.id === activeBookId) || null;

  const updateBook = (id: string, updates: Partial<ReaderBook>) => {
    setBooks((previous) => previous.map((book) => (
      book.id === id
        ? { ...book, ...updates, updatedAt: new Date().toISOString() }
        : book
    )));
  };

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;
    setPdfUrl(null);
    setEpubChapters([]);
    setBinaryError('');
    setBinaryLoading(false);

    if (!activeBook || activeBook.format === 'text' || !activeBook.binaryKey) return undefined;

    const load = async () => {
      setBinaryLoading(true);
      try {
        if (activeBook.format === 'epub') {
          const cached = epubCacheRef.current.get(activeBook.id);
          if (cached) {
            if (!disposed) setEpubChapters(cached);
            return;
          }
        }
        const blob = await loadReaderBinary(activeBook.binaryKey as string);
        if (!blob) throw new Error('Không tìm thấy file gốc trên thiết bị này.');
        if (activeBook.format === 'pdf') {
          objectUrl = URL.createObjectURL(blob);
          if (!disposed) setPdfUrl(objectUrl);
        } else {
          const parsed = await parseEpubBook(blob);
          epubCacheRef.current.set(activeBook.id, parsed.chapters);
          if (!disposed) {
            setEpubChapters(parsed.chapters);
            if ((!activeBook.author && parsed.author) || (activeBook.title === formatFileTitle(activeBook.fileName || '') && parsed.title)) {
              setBooks((previous) => previous.map((book) => book.id === activeBook.id ? {
                ...book,
                title: parsed.title || book.title,
                author: parsed.author || book.author,
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
  }, [activeBook?.id, activeBook?.binaryKey, activeBook?.format]);

  const chapterIndex = activeBook?.format === 'epub'
    ? Math.min(activeBook.currentChapter || 0, Math.max(0, epubChapters.length - 1))
    : 0;
  const activeChapter = epubChapters[chapterIndex];
  const readerText = activeBook?.format === 'epub' ? (activeChapter?.content || '') : (activeBook?.content || '');

  const progress = useMemo(() => {
    if (!activeBook || activeBook.format === 'pdf') return 0;
    if (activeBook.format === 'epub' && epubChapters.length) {
      return Math.round(((chapterIndex + liveScrollProgress) / epubChapters.length) * 100);
    }
    return Math.round(liveScrollProgress * 100);
  }, [activeBook, chapterIndex, epubChapters.length, liveScrollProgress]);

  useEffect(() => {
    if (!readingOpen || !activeBook || activeBook.format === 'pdf') return;
    setLiveScrollProgress(clamp(activeBook.scrollProgress || 0, 0, 1));
    const frame = window.requestAnimationFrame(() => {
      const element = readingScrollRef.current;
      if (!element) return;
      const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
      element.scrollTop = maxScroll * clamp(activeBook.scrollProgress || 0, 0, 1);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [readingOpen, activeBook?.id, activeBook?.currentChapter, activeBook?.format, readerText]);

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
        setSettingsOpen(false);
        setTocOpen(false);
        setReadingOpen(false);
        return;
      }
      const element = readingScrollRef.current;
      if (!element || activeBook?.format === 'pdf') return;
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        element.scrollBy({ top: element.clientHeight * 0.82, behavior: 'smooth' });
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        element.scrollBy({ top: -element.clientHeight * 0.82, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [readingOpen, activeBook?.format]);

  useEffect(() => {
    if (!readingOpen || !controlsVisible || settingsOpen || tocOpen || activeBook?.format === 'pdf') return undefined;
    const timer = window.setTimeout(() => setControlsVisible(false), 4200);
    return () => window.clearTimeout(timer);
  }, [readingOpen, controlsVisible, settingsOpen, tocOpen, activeBook?.format]);

  const openBook = (id: string) => {
    setActiveBookId(id);
    setReadingOpen(true);
    setControlsVisible(true);
    setSettingsOpen(false);
    setTocOpen(false);
    updateBook(id, { lastOpenedAt: new Date().toISOString() });
  };

  const addBook = (book: ReaderBook) => {
    setBooks((previous) => [book, ...previous]);
    setActiveBookId(book.id);
    setReadingOpen(true);
    setControlsVisible(true);
    addToast(`Đã thêm “${book.title}”`, 'success');
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
        addBook(createReaderBook({
          title: formatFileTitle(file.name),
          content,
          format,
          fileName: file.name,
          fileSize: file.size,
        }));
        return;
      }

      let parsedTitle = formatFileTitle(file.name);
      let parsedAuthor: string | undefined;
      let parsedChapters: EpubChapter[] | undefined;
      if (format === 'epub') {
        const parsed = await parseEpubBook(file);
        parsedTitle = parsed.title || parsedTitle;
        parsedAuthor = parsed.author;
        parsedChapters = parsed.chapters;
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
      if (parsedChapters) epubCacheRef.current.set(book.id, parsedChapters);
      addBook(book);
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
    addBook(createReaderBook({ title: draftTitle, author: draftAuthor, content, format: 'text' }));
    setDraftTitle('');
    setDraftAuthor('');
    setDraftContent('');
    setPasteOpen(false);
  };

  const removeBook = (book: ReaderBook) => {
    const nextBooks = books.filter((item) => item.id !== book.id);
    setBooks(nextBooks);
    if (activeBookId === book.id) {
      setActiveBookId(nextBooks[0]?.id || null);
      setReadingOpen(false);
    }
    epubCacheRef.current.delete(book.id);
    if (book.binaryKey) void deleteReaderBinary(book.binaryKey).catch(() => undefined);
    addToast(`Đã xóa “${book.title}” khỏi thư viện`, 'info');
  };

  const handleReaderScroll = () => {
    const element = readingScrollRef.current;
    if (!element || !activeBook || activeBook.format === 'pdf') return;
    const maxScroll = Math.max(1, element.scrollHeight - element.clientHeight);
    const ratio = clamp(element.scrollTop / maxScroll, 0, 1);
    setLiveScrollProgress(ratio);
    if (scrollSaveTimerRef.current) window.clearTimeout(scrollSaveTimerRef.current);
    scrollSaveTimerRef.current = window.setTimeout(() => {
      updateBook(activeBook.id, { scrollProgress: ratio, lastOpenedAt: new Date().toISOString() });
    }, 260);
  };

  const changeChapter = (nextIndex: number) => {
    if (!activeBook || activeBook.format !== 'epub' || epubChapters.length === 0) return;
    const target = clamp(nextIndex, 0, epubChapters.length - 1);
    setLiveScrollProgress(0);
    updateBook(activeBook.id, { currentChapter: target, currentPage: 0, scrollProgress: 0, lastOpenedAt: new Date().toISOString() });
    setTocOpen(false);
    setControlsVisible(true);
  };

  const stepViewport = (direction: -1 | 1) => {
    const element = readingScrollRef.current;
    if (!element || !activeBook || activeBook.format === 'pdf') return;
    const atTop = element.scrollTop <= 4;
    const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 6;
    if (direction < 0 && atTop && activeBook.format === 'epub' && chapterIndex > 0) {
      changeChapter(chapterIndex - 1);
      window.requestAnimationFrame(() => {
        const reader = readingScrollRef.current;
        if (reader) reader.scrollTop = reader.scrollHeight;
      });
      return;
    }
    if (direction > 0 && atBottom && activeBook.format === 'epub' && chapterIndex < epubChapters.length - 1) {
      changeChapter(chapterIndex + 1);
      return;
    }
    element.scrollBy({ top: direction * element.clientHeight * 0.82, behavior: 'smooth' });
  };

  const handleReadingSurfaceClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a')) return;
    if (!activeBook || activeBook.format === 'pdf') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / Math.max(1, rect.width);
    if (ratio < 0.18) stepViewport(-1);
    else if (ratio > 0.82) stepViewport(1);
    else setControlsVisible((value) => !value);
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
    setReadingOpen(false);
    setSettingsOpen(false);
    setTocOpen(false);
    setControlsVisible(true);
  };

  const readingOverlay = readingOpen && activeBook ? (
    <div className={`fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col overflow-hidden ${themeStyles[activeBook.theme].shell}`}>
      <div
        className="relative flex min-h-0 flex-1 overflow-hidden"
        onClick={handleReadingSurfaceClick}
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
            onScroll={handleReaderScroll}
            className="h-full w-full overflow-y-auto overscroll-y-contain scroll-smooth"
          >
            <article
              className={`mx-auto min-h-full px-7 pb-28 pt-24 sm:px-10 ${widthClasses[activeBook.contentWidth]}`}
              style={{
                fontFamily: fontFamilies[activeBook.fontFamily],
                fontSize: `${activeBook.fontSize}px`,
                lineHeight: activeBook.lineHeight,
              }}
            >
              {activeBook.format === 'epub' && activeChapter?.title ? (
                <h1 className="mb-8 text-[1.45em] font-bold leading-tight tracking-[-0.02em]">{activeChapter.title}</h1>
              ) : null}
              <div className="whitespace-pre-wrap text-left [text-wrap:pretty]">{readerText}</div>
            </article>
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
                  onClick={() => { setTocOpen(true); setSettingsOpen(false); }}
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
                  onClick={() => { setSettingsOpen(true); setTocOpen(false); }}
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
                    <button
                      type="button"
                      onClick={() => stepViewport(-1)}
                      className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/5"
                      aria-label="Lùi một màn"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setControlsVisible(false)}
                      className={`min-w-0 flex-1 text-center text-[10px] font-semibold ${themeStyles[activeBook.theme].muted}`}
                    >
                      {activeBook.format === 'epub'
                        ? `Chương ${chapterIndex + 1}/${Math.max(1, epubChapters.length)} · chạm giữa màn hình để ẩn/hiện thanh công cụ`
                        : 'Chạm hai mép để lật nhanh · chạm giữa để ẩn/hiện thanh công cụ'}
                    </button>
                    <button
                      type="button"
                      onClick={() => stepViewport(1)}
                      className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/5"
                      aria-label="Tiến một màn"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
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

        {!controlsVisible && activeBook.format !== 'pdf' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1 bg-black/5 dark:bg-white/5">
            <div className="h-full bg-indigo-500/80" style={{ width: `${progress}%` }} />
          </div>
        )}

        {settingsOpen && activeBook.format !== 'pdf' && (
          <div className="absolute inset-0 z-30 flex items-end bg-black/20" onClick={() => setSettingsOpen(false)}>
            <section
              className={`w-full rounded-t-[28px] border-t p-5 pb-[max(22px,env(safe-area-inset-bottom))] shadow-2xl ${themeStyles[activeBook.theme].panel}`}
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
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white shadow-sm">
              <BookOpen className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-500">Đọc tiếp</p>
              <h2 className="mt-1 truncate text-base font-bold text-slate-900">{activeBook.title}</h2>
              <p className="mt-1 truncate text-[11px] font-medium text-slate-400">
                {activeBook.author || formatLabels[activeBook.format]}
                {activeBook.format !== 'pdf' ? ` · ${Math.round((activeBook.scrollProgress || 0) * 100)}% chương hiện tại` : ''}
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
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">{books.length}/{READER_MAX_BOOKS} sách · PDF/EPUB lưu trên thiết bị này</p>
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
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${book.format === 'epub' ? 'bg-indigo-50 text-indigo-600' : book.format === 'pdf' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-900">{book.title}</span>
                    <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400">{book.author || formatLabels[book.format]}{book.fileSize ? ` · ${formatFileSize(book.fileSize)}` : ''}</span>
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
