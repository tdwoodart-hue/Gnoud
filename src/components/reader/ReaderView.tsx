import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FilePlus2,
  LoaderCircle,
  Minus,
  Moon,
  Plus,
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
  paginateBookContent,
  parseEpubBook,
  READER_MAX_BOOK_CHARS,
  READER_MAX_BOOKS,
  READER_MAX_FILE_BYTES,
  saveReaderBinary,
  saveReaderLibrary,
  type EpubChapter,
  type ReaderBook,
  type ReaderFormat,
  type ReaderTheme,
} from '../../services/readerService';
import { EmptyState } from '../common/EmptyState';
import { PageHeader } from '../common/PageHeader';

const themeClasses: Record<ReaderTheme, string> = {
  paper: 'border-slate-200/70 bg-white text-slate-800',
  warm: 'border-amber-200/60 bg-[#fbf5e9] text-stone-800',
  night: 'border-slate-700 bg-slate-900 text-slate-100',
};

const themeButtons: Array<{ id: ReaderTheme; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'paper', label: 'Sáng', icon: SunMedium },
  { id: 'warm', label: 'Ấm', icon: BookOpen },
  { id: 'night', label: 'Tối', icon: Moon },
];

const formatLabels: Record<ReaderFormat, string> = {
  text: 'TEXT',
  pdf: 'PDF',
  epub: 'EPUB',
};

function formatFileTitle(fileName: string): string {
  return fileName.replace(/\.(pdf|epub|txt|md|markdown)$/i, '').replace(/[-_]+/g, ' ').trim() || 'Sách mới';
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const epubCacheRef = useRef(new Map<string, EpubChapter[]>());

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

  const textPages = useMemo(
    () => activeBook?.format === 'text' ? paginateBookContent(activeBook.content) : [],
    [activeBook?.format, activeBook?.content],
  );
  const chapterIndex = activeBook?.format === 'epub'
    ? Math.min(activeBook.currentChapter || 0, Math.max(0, epubChapters.length - 1))
    : 0;
  const activeChapter = epubChapters[chapterIndex];
  const epubPages = useMemo(
    () => activeChapter ? paginateBookContent(activeChapter.content, 2600) : [],
    [activeChapter?.id, activeChapter?.content],
  );
  const pages = activeBook?.format === 'epub' ? epubPages : textPages;
  const pageIndex = activeBook && activeBook.format !== 'pdf'
    ? Math.min(activeBook.currentPage, Math.max(0, pages.length - 1))
    : 0;
  const progress = activeBook?.format === 'epub' && epubChapters.length
    ? Math.round(((chapterIndex + ((pageIndex + 1) / Math.max(1, pages.length))) / epubChapters.length) * 100)
    : pages.length
      ? Math.round(((pageIndex + 1) / pages.length) * 100)
      : 0;

  const openBook = (id: string) => {
    setActiveBookId(id);
    updateBook(id, { lastOpenedAt: new Date().toISOString() });
  };

  const addBook = (book: ReaderBook) => {
    setBooks((previous) => [book, ...previous]);
    setActiveBookId(book.id);
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

  const removeActiveBook = () => {
    if (!activeBook) return;
    const removed = activeBook;
    const nextBooks = books.filter((book) => book.id !== removed.id);
    setBooks(nextBooks);
    setActiveBookId(nextBooks[0]?.id || null);
    epubCacheRef.current.delete(removed.id);
    if (removed.binaryKey) void deleteReaderBinary(removed.binaryKey).catch(() => undefined);
    addToast(`Đã xóa “${removed.title}” khỏi thư viện`, 'info');
  };

  const changePage = (nextPage: number) => {
    if (!activeBook || activeBook.format === 'pdf' || pages.length === 0) return;
    if (activeBook.format === 'epub') {
      if (nextPage < 0 && chapterIndex > 0) {
        const previousChapter = epubChapters[chapterIndex - 1];
        const previousPages = paginateBookContent(previousChapter.content, 2600);
        updateBook(activeBook.id, { currentChapter: chapterIndex - 1, currentPage: Math.max(0, previousPages.length - 1), lastOpenedAt: new Date().toISOString() });
        return;
      }
      if (nextPage >= pages.length && chapterIndex < epubChapters.length - 1) {
        updateBook(activeBook.id, { currentChapter: chapterIndex + 1, currentPage: 0, lastOpenedAt: new Date().toISOString() });
        return;
      }
    }
    updateBook(activeBook.id, {
      currentPage: Math.max(0, Math.min(pages.length - 1, nextPage)),
      lastOpenedAt: new Date().toISOString(),
    });
  };

  const canGoBack = activeBook?.format === 'epub' ? chapterIndex > 0 || pageIndex > 0 : pageIndex > 0;
  const canGoForward = activeBook?.format === 'epub'
    ? chapterIndex < epubChapters.length - 1 || pageIndex < pages.length - 1
    : pageIndex < pages.length - 1;

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-6">
      <PageHeader title="Sách" />

      <section className="rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800">Thêm sách</p>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">PDF · EPUB · TXT · MD · tối đa 50 MB/file</p>
          </div>
          <button
            type="button"
            disabled={fileBusy}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-[10px] font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {fileBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <FilePlus2 className="h-3.5 w-3.5" />}
            {fileBusy ? 'Đang đọc…' : 'Chọn file'}
          </button>
        </div>
        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept=".pdf,.epub,.txt,.md,.markdown,application/pdf,application/epub+zip,text/plain,text/markdown"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </section>

      {books.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {books.map((book) => {
            const active = book.id === activeBookId;
            return (
              <button
                key={book.id}
                type="button"
                onClick={() => openBook(book.id)}
                className={`min-w-0 shrink-0 rounded-xl border px-3 py-2 text-left transition ${
                  active
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                    : 'border-slate-200/70 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <p className="max-w-40 truncate text-xs font-bold">{book.title}</p>
                <p className="mt-0.5 text-[9px] font-semibold opacity-55">{formatLabels[book.format]}{book.fileSize ? ` · ${formatFileSize(book.fileSize)}` : ''}</p>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-medium text-slate-400">{books.length}/{READER_MAX_BOOKS} sách · file PDF/EPUB lưu trên thiết bị</p>
        <button
          type="button"
          onClick={() => setPasteOpen((value) => !value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 shadow-xs transition hover:bg-slate-50"
        >
          {pasteOpen ? 'Đóng' : 'Dán văn bản'}
        </button>
      </div>

      {pasteOpen && (
        <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Thêm văn bản</h2>
              <p className="mt-0.5 text-[10px] font-medium text-slate-400">Dùng cho ghi chú dài hoặc sách dạng text.</p>
            </div>
            <button type="button" onClick={() => setPasteOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Tên sách" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-300 focus:bg-white" />
            <input value={draftAuthor} onChange={(event) => setDraftAuthor(event.target.value)} placeholder="Tác giả (không bắt buộc)" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-300 focus:bg-white" />
          </div>
          <textarea value={draftContent} onChange={(event) => setDraftContent(event.target.value)} placeholder="Dán nội dung sách vào đây…" rows={7} className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none focus:border-indigo-300 focus:bg-white" />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[9px] font-medium text-slate-400">{draftContent.length.toLocaleString('vi-VN')} ký tự</span>
            <button type="button" onClick={handlePasteSubmit} className="rounded-xl bg-slate-900 px-4 py-2 text-[11px] font-bold text-white hover:bg-slate-800">Thêm vào thư viện</button>
          </div>
        </section>
      )}

      {!activeBook ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white py-8 shadow-xs">
          <EmptyState title="Chưa có sách" description="Upload PDF hoặc EPUB để bắt đầu đọc." />
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-900">{activeBook.title}</h2>
              <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
                {activeBook.author || formatLabels[activeBook.format]}{activeBook.format !== 'pdf' && pages.length ? ` · ${progress}%` : ''}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {activeBook.format !== 'pdf' && (
                <>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                    <button type="button" onClick={() => updateBook(activeBook.id, { fontSize: Math.max(15, activeBook.fontSize - 1) })} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white" aria-label="Giảm cỡ chữ"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="flex min-w-8 items-center justify-center gap-1 text-[9px] font-bold text-slate-500"><Type className="h-3 w-3" /> {activeBook.fontSize}</span>
                    <button type="button" onClick={() => updateBook(activeBook.id, { fontSize: Math.min(26, activeBook.fontSize + 1) })} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white" aria-label="Tăng cỡ chữ"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  {themeButtons.map((theme) => {
                    const Icon = theme.icon;
                    return (
                      <button key={theme.id} type="button" onClick={() => updateBook(activeBook.id, { theme: theme.id })} className={`grid h-9 w-9 place-items-center rounded-xl border transition ${activeBook.theme === theme.id ? 'border-indigo-200 bg-indigo-50 text-indigo-600' : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'}`} title={theme.label}>
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    );
                  })}
                </>
              )}
              <button type="button" onClick={removeActiveBook} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600" title="Xóa khỏi thư viện" aria-label="Xóa sách"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {binaryLoading ? (
            <div className="grid min-h-[430px] place-items-center bg-slate-50">
              <div className="text-center text-slate-400"><LoaderCircle className="mx-auto h-6 w-6 animate-spin" /><p className="mt-2 text-xs font-semibold">Đang mở sách…</p></div>
            </div>
          ) : binaryError ? (
            <div className="grid min-h-[360px] place-items-center bg-slate-50 p-6 text-center">
              <div><p className="text-sm font-bold text-slate-800">Không mở được sách</p><p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{binaryError}</p></div>
            </div>
          ) : activeBook.format === 'pdf' ? (
            <div className="bg-slate-100">
              {pdfUrl ? (
                <>
                  <iframe src={`${pdfUrl}#view=FitH`} title={activeBook.title} className="h-[72vh] min-h-[520px] w-full bg-white" />
                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
                    <p className="text-[10px] font-medium text-slate-400">PDF dùng trình xem gốc của trình duyệt để giữ nguyên bố cục.</p>
                    <a href={pdfUrl} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50">Toàn màn hình <ExternalLink className="h-3 w-3" /></a>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <>
              {activeBook.format === 'epub' && epubChapters.length > 0 && (
                <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                  <select
                    value={chapterIndex}
                    onChange={(event) => updateBook(activeBook.id, { currentChapter: Number(event.target.value), currentPage: 0, lastOpenedAt: new Date().toISOString() })}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-300"
                    aria-label="Mục lục EPUB"
                  >
                    {epubChapters.map((chapter, index) => <option key={chapter.id} value={index}>{index + 1}. {chapter.title}</option>)}
                  </select>
                </div>
              )}

              <article className={`min-h-[430px] border-b px-5 py-7 sm:px-8 sm:py-9 ${themeClasses[activeBook.theme]}`}>
                <div className="mx-auto max-w-2xl whitespace-pre-wrap font-serif leading-[1.9]" style={{ fontSize: `${activeBook.fontSize}px` }}>
                  {pages[pageIndex] || ''}
                </div>
              </article>

              <div className="space-y-3 px-4 py-3.5">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} /></div>
                <div className="flex items-center justify-between gap-3">
                  <button type="button" disabled={!canGoBack} onClick={() => changePage(pageIndex - 1)} className="flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"><ChevronLeft className="h-3.5 w-3.5" /> Trước</button>
                  <div className="min-w-0 text-center">
                    <p className="text-[11px] font-bold tabular-nums text-slate-700">{pageIndex + 1} / {Math.max(1, pages.length)}</p>
                    <p className="max-w-40 truncate text-[9px] font-medium text-slate-400">{activeBook.format === 'epub' ? `Chương ${chapterIndex + 1}/${epubChapters.length}` : 'tự lưu vị trí đọc'}</p>
                  </div>
                  <button type="button" disabled={!canGoForward} onClick={() => changePage(pageIndex + 1)} className="flex h-9 items-center gap-1 rounded-xl bg-slate-900 px-3 text-[10px] font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-35">Sau <ChevronRight className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
};
