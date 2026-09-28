import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlignJustify,
  AlignLeft,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const epubCacheRef = useRef(new Map<string, EpubChapter[]>());
  const readingScrollRef = useRef<HTMLDivElement>(null);
  const scrollSaveTimerRef = useRef<number | null>(null);
  const speechChunksRef = useRef<string[]>([]);
  const speechIndexRef = useRef(0);
  const speechStoppedRef = useRef(false);

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
    let disposed = false;
    const createdUrls: string[] = [];
    const loadCovers = async () => {
      const next: Record<string, string> = {};
      await Promise.all(books.map(async (book) => {
        if (!book.coverKey) return;
        try {
          const blob = await loadReaderBinary(book.coverKey);
          if (!blob || disposed) return;
          const url = URL.createObjectURL(blob);
          createdUrls.push(url);
          next[book.id] = url;
        } catch {
          // Bìa là dữ liệu phụ; không chặn thư viện nếu đọc bìa lỗi.
        }
      }));
      if (!disposed) setCoverUrls(next);
    };
    void loadCovers();
    return () => {
      disposed = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [books.map((book) => `${book.id}:${book.coverKey || ''}`).join('|')]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
    const refresh = () => setTtsVoices(window.speechSynthesis.getVoices());
    refresh();
    window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', refresh);
  }, []);

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
  }, [activeBook?.id, activeBook?.binaryKey, activeBook?.format]);

  const chapterIndex = activeBook?.format === 'epub'
    ? Math.min(activeBook.currentChapter || 0, Math.max(0, epubChapters.length - 1))
    : 0;
  const activeChapter = epubChapters[chapterIndex];
  const readerText = activeBook?.format === 'epub' ? (activeChapter?.content || '') : (activeBook?.content || '');
  const readerParagraphs = useMemo(
    () => readerText.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean),
    [readerText],
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
    if (!readingOpen || !controlsVisible || settingsOpen || tocOpen || ttsOpen || activeBook?.format === 'pdf') return undefined;
    const timer = window.setTimeout(() => setControlsVisible(false), 4200);
    return () => window.clearTimeout(timer);
  }, [readingOpen, controlsVisible, settingsOpen, tocOpen, ttsOpen, activeBook?.format]);

  const supportsTts = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

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

  const stopSpeech = () => {
    speechStoppedRef.current = true;
    if (supportsTts) window.speechSynthesis.cancel();
    setTtsStatus('idle');
  };

  const speakSpeechChunk = (index: number) => {
    if (!supportsTts || speechStoppedRef.current || !activeBook) return;
    const chunks = speechChunksRef.current;
    if (index >= chunks.length) {
      setTtsStatus('idle');
      return;
    }
    speechIndexRef.current = index;
    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = 'vi-VN';
    }
    utterance.rate = activeBook.ttsRate || 0.95;
    utterance.pitch = activeBook.ttsPitch || 1;
    utterance.onend = () => {
      if (!speechStoppedRef.current) speakSpeechChunk(index + 1);
    };
    utterance.onerror = (event) => {
      if (event.error !== 'interrupted' && event.error !== 'canceled') setTtsStatus('idle');
    };
    window.speechSynthesis.speak(utterance);
    setTtsStatus('playing');
  };

  const startSpeech = () => {
    if (!activeBook || activeBook.format === 'pdf') return;
    if (!supportsTts) {
      addToast('Trình duyệt này chưa hỗ trợ đọc sách bằng giọng nói.', 'warning');
      return;
    }
    const speechSource = activeBook.ttsCleanText ? sanitizeSpeechText(readerText) : readerText;
    const chunks = splitSpeechText(speechSource);
    if (!chunks.length) {
      addToast('Chương này không có nội dung để đọc.', 'warning');
      return;
    }
    window.speechSynthesis.cancel();
    speechStoppedRef.current = false;
    speechChunksRef.current = chunks;
    const startIndex = clamp(Math.floor(liveScrollProgress * chunks.length), 0, Math.max(0, chunks.length - 1));
    speakSpeechChunk(startIndex);
  };

  const previewVoice = () => {
    if (!supportsTts || !activeBook) {
      addToast('Trình duyệt này chưa hỗ trợ nghe thử giọng.', 'warning');
      return;
    }
    window.speechSynthesis.cancel();
    speechStoppedRef.current = true;
    const utterance = new SpeechSynthesisUtterance('Đây là giọng đọc thử tiếng Việt. Bạn có thể đổi giọng, tốc độ và cao độ để nghe tự nhiên hơn.');
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = 'vi-VN';
    }
    utterance.rate = activeBook.ttsRate || 0.95;
    utterance.pitch = activeBook.ttsPitch || 1;
    window.speechSynthesis.speak(utterance);
    setTtsStatus('idle');
  };

  const toggleSpeech = () => {
    if (!supportsTts) {
      startSpeech();
      return;
    }
    if (ttsStatus === 'playing') {
      window.speechSynthesis.pause();
      setTtsStatus('paused');
    } else if (ttsStatus === 'paused') {
      window.speechSynthesis.resume();
      setTtsStatus('playing');
    } else {
      startSpeech();
    }
  };

  useEffect(() => () => {
    speechStoppedRef.current = true;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const openBook = (id: string) => {
    stopSpeech();
    setActiveBookId(id);
    setReadingOpen(true);
    setControlsVisible(true);
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
      stopSpeech();
      setActiveBookId(nextBooks[0]?.id || null);
      setReadingOpen(false);
      setTtsOpen(false);
    }
    epubCacheRef.current.delete(book.id);
    if (book.binaryKey) void deleteReaderBinary(book.binaryKey).catch(() => undefined);
    if (book.coverKey) void deleteReaderBinary(book.coverKey).catch(() => undefined);
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
      const overallProgress = calculateReaderProgress(
        activeBook.format,
        chapterIndex,
        epubChapters.length || activeBook.chapterCount,
        ratio,
      );
      updateBook(activeBook.id, { scrollProgress: ratio, overallProgress, lastOpenedAt: new Date().toISOString() });
    }, 260);
  };

  const changeChapter = (nextIndex: number) => {
    if (!activeBook || activeBook.format !== 'epub' || epubChapters.length === 0) return;
    const target = clamp(nextIndex, 0, epubChapters.length - 1);
    stopSpeech();
    setLiveScrollProgress(0);
    updateBook(activeBook.id, {
      currentChapter: target,
      currentPage: 0,
      scrollProgress: 0,
      overallProgress: calculateReaderProgress('epub', target, epubChapters.length, 0),
      chapterCount: epubChapters.length,
      lastOpenedAt: new Date().toISOString(),
    });
    setTocOpen(false);
    setTtsOpen(false);
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
              <div lang="vi" className="[text-wrap:pretty]">
                {readerParagraphs.map((paragraph, index) => (
                  <p
                    key={`${index}-${paragraph.slice(0, 18)}`}
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
              className={`w-full rounded-t-[28px] border-t p-5 pb-[max(22px,env(safe-area-inset-bottom))] shadow-2xl ${themeStyles[activeBook.theme].panel}`}
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

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${themeStyles[activeBook.theme].muted}`}>Giọng đọc</span>
                    <select
                      value={activeBook.ttsVoiceUri || ''}
                      onChange={(event) => {
                        stopSpeech();
                        updateBook(activeBook.id, { ttsVoiceUri: event.target.value || undefined });
                      }}
                      className="mt-2 h-11 w-full rounded-xl border border-current/15 bg-transparent px-3 text-sm outline-none"
                    >
                      <option value="">Tự động · ưu tiên giọng Việt</option>
                      {fallbackVoices.length ? fallbackVoices.map((voice) => (
                        <option key={`${voice.voiceURI}-${voice.name}`} value={voice.voiceURI}>{formatVoiceName(voice)}</option>
                      )) : <option value="">Chưa tìm thấy giọng trên thiết bị</option>}
                    </select>
                    <button
                      type="button"
                      onClick={previewVoice}
                      className="mt-2 h-9 w-full rounded-xl border border-current/15 text-[11px] font-bold transition hover:bg-black/5"
                    >
                      Nghe thử giọng này
                    </button>
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

                <p className={`mt-4 text-center text-[10px] font-medium leading-5 ${themeStyles[activeBook.theme].muted}`}>
                  Chỉ hiển thị các giọng tiếng Việt mà trình duyệt/thiết bị cung cấp. Nếu máy có nhiều giọng Việt, chúng sẽ xuất hiện đầy đủ ở danh sách trên.
                </p>
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
                      {book.author || formatLabels[book.format]}{book.fileSize ? ` · ${formatFileSize(book.fileSize)}` : ''}
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
