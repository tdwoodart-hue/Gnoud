import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
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
  loadReaderLibrary,
  paginateBookContent,
  READER_MAX_BOOK_CHARS,
  READER_MAX_BOOKS,
  saveReaderLibrary,
  type ReaderBook,
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

function formatFileTitle(fileName: string): string {
  return fileName.replace(/\.(txt|md|markdown)$/i, '').replace(/[-_]+/g, ' ').trim() || 'Sách mới';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const pages = useMemo(
    () => (activeBook ? paginateBookContent(activeBook.content) : []),
    [activeBook?.content],
  );
  const pageIndex = activeBook ? Math.min(activeBook.currentPage, Math.max(0, pages.length - 1)) : 0;
  const progress = pages.length ? Math.round(((pageIndex + 1) / pages.length) * 100) : 0;

  const updateBook = (id: string, updates: Partial<ReaderBook>) => {
    setBooks((previous) => previous.map((book) => (
      book.id === id
        ? { ...book, ...updates, updatedAt: new Date().toISOString() }
        : book
    )));
  };

  const openBook = (id: string) => {
    setActiveBookId(id);
    updateBook(id, { lastOpenedAt: new Date().toISOString() });
  };

  const addBook = (book: ReaderBook) => {
    if (books.length >= READER_MAX_BOOKS) {
      addToast(`Thư viện đang giới hạn ${READER_MAX_BOOKS} sách để giữ app nhẹ.`, 'warning');
      return;
    }
    setBooks((previous) => [book, ...previous]);
    setActiveBookId(book.id);
    addToast(`Đã thêm “${book.title}”`, 'success');
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(txt|md|markdown)$/i.test(file.name)) {
      addToast('Bản gọn hiện hỗ trợ file .txt và .md.', 'warning');
      return;
    }
    const content = await file.text();
    if (!content.trim()) {
      addToast('File không có nội dung để đọc.', 'warning');
      return;
    }
    if (content.length > READER_MAX_BOOK_CHARS) {
      addToast('File quá lớn cho bộ đọc gọn. Hãy dùng bản văn bản ngắn hơn.', 'warning');
      return;
    }
    addBook(createReaderBook({ title: formatFileTitle(file.name), content }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePasteSubmit = () => {
    const content = draftContent.trim();
    if (!content) {
      addToast('Hãy dán nội dung sách trước.', 'warning');
      return;
    }
    if (content.length > READER_MAX_BOOK_CHARS) {
      addToast('Nội dung quá lớn cho bộ đọc gọn.', 'warning');
      return;
    }
    addBook(createReaderBook({ title: draftTitle, author: draftAuthor, content }));
    setDraftTitle('');
    setDraftAuthor('');
    setDraftContent('');
    setPasteOpen(false);
  };

  const removeActiveBook = () => {
    if (!activeBook) return;
    const nextBooks = books.filter((book) => book.id !== activeBook.id);
    setBooks(nextBooks);
    setActiveBookId(nextBooks[0]?.id || null);
    addToast(`Đã xóa “${activeBook.title}” khỏi thư viện`, 'info');
  };

  const changePage = (nextPage: number) => {
    if (!activeBook || pages.length === 0) return;
    updateBook(activeBook.id, {
      currentPage: Math.max(0, Math.min(pages.length - 1, nextPage)),
      lastOpenedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-6">
      <PageHeader title="Sách" />

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
              <p className="mt-0.5 text-[9px] font-medium opacity-60">Trang {book.currentPage + 1}</p>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="grid h-[53px] w-[53px] shrink-0 place-items-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400 transition hover:border-indigo-300 hover:text-indigo-600"
          title="Thêm file .txt hoặc .md"
          aria-label="Thêm sách từ file"
        >
          <FilePlus2 className="h-4 w-4" />
        </button>
        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept=".txt,.md,.markdown,text/plain,text/markdown"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-medium text-slate-400">
          {books.length}/{READER_MAX_BOOKS} sách · lưu riêng theo tài khoản trên thiết bị này
        </p>
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
              <h2 className="text-sm font-bold text-slate-900">Thêm sách nhanh</h2>
              <p className="mt-0.5 text-[10px] font-medium text-slate-400">Dán nội dung, không cần upload file.</p>
            </div>
            <button type="button" onClick={() => setPasteOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Tên sách"
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-indigo-300 focus:bg-white"
            />
            <input
              value={draftAuthor}
              onChange={(event) => setDraftAuthor(event.target.value)}
              placeholder="Tác giả (không bắt buộc)"
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-indigo-300 focus:bg-white"
            />
          </div>
          <textarea
            value={draftContent}
            onChange={(event) => setDraftContent(event.target.value)}
            placeholder="Dán nội dung sách vào đây…"
            rows={7}
            className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none transition focus:border-indigo-300 focus:bg-white"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[9px] font-medium text-slate-400">{draftContent.length.toLocaleString('vi-VN')} ký tự</span>
            <button type="button" onClick={handlePasteSubmit} className="rounded-xl bg-slate-900 px-4 py-2 text-[11px] font-bold text-white hover:bg-slate-800">
              Thêm vào thư viện
            </button>
          </div>
        </section>
      )}

      {!activeBook ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white py-8 shadow-xs">
          <EmptyState title="Chưa có sách" description="Thêm file .txt/.md hoặc dán văn bản để bắt đầu đọc." />
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-900">{activeBook.title}</h2>
              <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
                {activeBook.author || 'Không ghi tác giả'} · {progress}%
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => updateBook(activeBook.id, { fontSize: Math.max(15, activeBook.fontSize - 1) })}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white"
                  aria-label="Giảm cỡ chữ"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="flex min-w-8 items-center justify-center gap-1 text-[9px] font-bold text-slate-500">
                  <Type className="h-3 w-3" /> {activeBook.fontSize}
                </span>
                <button
                  type="button"
                  onClick={() => updateBook(activeBook.id, { fontSize: Math.min(24, activeBook.fontSize + 1) })}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white"
                  aria-label="Tăng cỡ chữ"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {themeButtons.map((theme) => {
                const Icon = theme.icon;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => updateBook(activeBook.id, { theme: theme.id })}
                    className={`grid h-9 w-9 place-items-center rounded-xl border transition ${
                      activeBook.theme === theme.id
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-600'
                        : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
                    }`}
                    title={theme.label}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                );
              })}

              <button
                type="button"
                onClick={removeActiveBook}
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                title="Xóa khỏi thư viện"
                aria-label="Xóa sách"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <article className={`min-h-[430px] border-b px-5 py-7 sm:px-8 sm:py-9 ${themeClasses[activeBook.theme]}`}>
            <div
              className="mx-auto max-w-2xl whitespace-pre-wrap font-serif leading-[1.9]"
              style={{ fontSize: `${activeBook.fontSize}px` }}
            >
              {pages[pageIndex]}
            </div>
          </article>

          <div className="space-y-3 px-4 py-3.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={pageIndex <= 0}
                onClick={() => changePage(pageIndex - 1)}
                className="flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Trước
              </button>

              <div className="text-center">
                <p className="text-[11px] font-bold tabular-nums text-slate-700">{pageIndex + 1} / {pages.length}</p>
                <p className="text-[9px] font-medium text-slate-400">tự lưu vị trí đọc</p>
              </div>

              <button
                type="button"
                disabled={pageIndex >= pages.length - 1}
                onClick={() => changePage(pageIndex + 1)}
                className="flex h-9 items-center gap-1 rounded-xl bg-slate-900 px-3 text-[10px] font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Sau <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
