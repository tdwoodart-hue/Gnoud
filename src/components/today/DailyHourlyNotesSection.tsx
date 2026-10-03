import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CornerDownLeft,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getFormattedToday } from '../../data/mockData';
import { DailyHourlyNote } from '../../types';
import {
  bootstrapDailyNotes,
  deleteDailyNote,
  getCurrentTimeHHmm,
  loadDailyNotesCache,
  makeDailyNote,
  saveDailyNote,
  subscribeDailyNotes,
} from '../../services/dailyNotesService';
import { dailyNotePrompt } from '../../services/dailyNotePromptService';

export const DailyHourlyNotesSection: React.FC = () => {
  const { user } = useApp();
  const [todayStr, setTodayStr] = useState(() => getFormattedToday(0));

  const [notes, setNotes] = useState<DailyHourlyNote[]>(() => loadDailyNotesCache());
  const [content, setContent] = useState('');

  // Quick inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refreshDate = () => {
      const next = getFormattedToday(0);
      setTodayStr((current) => (current === next ? current : next));
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshDate();
    };

    const timer = window.setInterval(refreshDate, 60_000);
    window.addEventListener('focus', refreshDate);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshDate);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Sync real-time / Firestore
  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    if (!user) {
      setNotes(loadDailyNotesCache());
      return () => {};
    }

    void bootstrapDailyNotes(user.uid)
      .then((items) => {
        if (cancelled) return;
        setNotes(items);
        unsubscribe = subscribeDailyNotes(user.uid, (next) => {
          if (!cancelled) setNotes(next);
        });
      })
      .catch((err) => {
        console.warn('Could not bootstrap daily notes:', err);
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user?.uid]);

  // Filter notes for today, sorted by newest first (descending by precise creation timestamp)
  const todayNotes = useMemo(() => {
    return notes
      .filter((n) => n.date === todayStr)
      .sort((a, b) => {
        // Compare createdAt ISO timestamp (most precise)
        const timeB = b.createdAt || (b.date && b.time ? `${b.date}T${b.time}:00` : b.id);
        const timeA = a.createdAt || (a.date && a.time ? `${a.date}T${a.time}:00` : a.id);
        const cmp = timeB.localeCompare(timeA);
        if (cmp !== 0) return cmp;
        // Fallback to HH:mm
        const hourCmp = (b.time || '').localeCompare(a.time || '');
        if (hourCmp !== 0) return hourCmp;
        return (b.id || '').localeCompare(a.id || '');
      });
  }, [notes, todayStr]);

  const notePrompt = useMemo(
    () => dailyNotePrompt(todayStr, todayNotes.length),
    [todayStr, todayNotes.length],
  );

  const handleAddNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    const newNote = makeDailyNote(trimmed, todayStr, getCurrentTimeHHmm());
    setNotes((prev) => [newNote, ...prev.filter((n) => n.id !== newNote.id)]);
    setContent('');

    try {
      await saveDailyNote(user?.uid, newNote);
    } catch (err) {
      console.warn('Error saving daily note:', err);
    }
  };

  const handleDelete = async (noteId: string) => {
    const nextList = notes.filter((n) => n.id !== noteId);
    setNotes(nextList);
    try {
      await deleteDailyNote(user?.uid, noteId);
    } catch (err) {
      console.warn('Error deleting daily note:', err);
    }
  };

  const handleStartEdit = (note: DailyHourlyNote) => {
    setEditingId(note.id);
    setEditText(note.content);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const trimmed = editText.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }

    const updatedNote = notes.find((n) => n.id === editingId);
    if (!updatedNote) return;

    const nextItem: DailyHourlyNote = {
      ...updatedNote,
      content: trimmed,
      updatedAt: new Date().toISOString(),
    };

    const nextList = notes.map((n) => (n.id === editingId ? nextItem : n));
    setNotes(nextList);
    setEditingId(null);

    try {
      await saveDailyNote(user?.uid, nextItem);
    } catch (err) {
      console.warn('Error updating daily note:', err);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs transition">
      <div className="mb-2 flex items-start justify-between gap-3 px-1">
        <span className="min-w-0 flex-1 text-xs font-medium leading-5 text-slate-500">{notePrompt}</span>
        {todayNotes.length > 0 && (
          <span className="text-[11px] font-medium text-slate-400">
            {todayNotes.length} ghi chú
          </span>
        )}
      </div>

      {/* Input bar - ultra clean and compact, no clock button */}
      <form onSubmit={handleAddNote} className="flex items-center gap-1.5 sm:gap-2">
        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Gõ điều mày đang nghĩ..."
          className="min-w-0 flex-1 bg-transparent px-2.5 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none sm:text-sm"
        />

        <button
          type="submit"
          disabled={!content.trim()}
          title="Lưu ghi chú (Enter)"
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-3 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          <CornerDownLeft className="h-3.5 w-3.5 sm:hidden" />
          <span className="hidden sm:inline">Lưu</span>
        </button>
      </form>

      {/* Note list for today - newest on top, very compact, subtle */}
      {todayNotes.length > 0 && (
        <div className="mt-2.5 max-h-72 space-y-0.5 overflow-y-auto border-t border-slate-100 pt-2">
          {todayNotes.map((note) => {
            const isEditing = editingId === note.id;

            if (isEditing) {
              return (
                <div
                  key={note.id}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-50 p-1.5 text-xs"
                >
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    className="min-w-0 flex-1 rounded bg-white px-2 py-1 text-xs text-slate-800 border border-slate-200 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                    title="Xác nhận"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-200"
                    title="Hủy"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={note.id}
                className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs transition hover:bg-slate-50"
              >
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-slate-400">
                    {note.time}
                  </span>
                  <span className="break-words text-slate-700 privacy-blur">{note.content}</span>
                </div>

                <div className="flex shrink-0 items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(note)}
                    className="rounded p-1 text-slate-400 hover:text-indigo-600"
                    title="Sửa"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(note.id)}
                    className="rounded p-1 text-slate-400 hover:text-rose-500"
                    title="Xóa"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
