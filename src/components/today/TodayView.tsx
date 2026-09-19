import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Edit2,
  ImageOff,
  ImagePlus,
  Link2,
  ListChecks,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDisplayDate, getFormattedToday } from '../../data/mockData';
import { Task } from '../../types';
import { PageHeader } from '../common/PageHeader';
import { fileToCompactDataUrl } from '../../services/imageAttachmentService';
import { parseManualReferenceList } from '../../services/manualReferenceService';
import {
  bootstrapReferenceLibrary,
  deleteReferenceLibraryItem,
  getReferenceLibraryItem,
  loadReferenceLibraryCache,
  makeReferenceLibraryItem,
  makeReferenceLibraryItemFromUrl,
  ReferenceLibraryItem,
  removeReferenceLibraryItem,
  saveReferenceLibraryCache,
  saveReferenceLibraryItem,
  subscribeReferenceLibrary,
  upsertReferenceLibraryItem,
} from '../../services/referenceLibraryService';
import {
  TASK_SWIPE_ACTION_WIDTH,
  TASK_SWIPE_MAX_DISTANCE,
  TASK_SWIPE_START_THRESHOLD,
  resolveTaskSwipeRelease,
  shouldStartTaskSwipe,
  type TaskSwipeReleaseAction,
} from '../../services/taskSwipe';

const SWIPE_ACTION_WIDTH = TASK_SWIPE_ACTION_WIDTH;
const SWIPE_MAX_DISTANCE = TASK_SWIPE_MAX_DISTANCE;
const SWIPE_START_THRESHOLD = TASK_SWIPE_START_THRESHOLD;

export type SwipeReleaseAction = TaskSwipeReleaseAction;
export const resolveSwipeRelease = resolveTaskSwipeRelease;
export const shouldStartSwipe = shouldStartTaskSwipe;

export const getVisibleTaskNotes = (notes?: string): string =>
  (notes || '')
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith('@activity ') && !trimmed.startsWith('@activity_result ');
    })
    .join('\n')
    .trim();

const SwipeTodayTaskRow: React.FC<{
  task: Task;
  completedSubtasks: number;
  isDone: boolean;
  isImportant: boolean;
  subtaskProgress: number;
  startsRegularGroup: boolean;
  isOpen: boolean;
  onSwipeOpen: (taskId: string | null) => void;
  onToggle: () => void;
  onOpen: () => void;
  onRequestDelete: () => void;
  onDeleteImmediately: () => void;
}> = ({
  task,
  completedSubtasks,
  isDone,
  isImportant,
  subtaskProgress,
  startsRegularGroup,
  isOpen,
  onSwipeOpen,
  onToggle,
  onOpen,
  onRequestDelete,
  onDeleteImmediately,
}) => {
  const [offset, setOffset] = useState(isOpen ? -SWIPE_ACTION_WIDTH : 0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const startOffsetRef = useRef(0);
  const offsetRef = useRef(offset);
  const didDragRef = useRef(false);
  const isSwipingRef = useRef(false);

  const setSwipeOffset = (next: number) => {
    offsetRef.current = next;
    setOffset(next);
  };

  useEffect(() => {
    setSwipeOffset(isOpen ? -SWIPE_ACTION_WIDTH : 0);
  }, [isOpen]);

  const resetPointer = () => {
    startXRef.current = null;
    startYRef.current = null;
    isSwipingRef.current = false;
    setDragging(false);
  };

  const finishDrag = (clientX: number) => {
    if (startXRef.current === null || !isSwipingRef.current) {
      resetPointer();
      return;
    }

    const elapsed = Math.max(1, performance.now() - startTimeRef.current);
    const velocityX = (clientX - startXRef.current) / elapsed;
    const action = resolveSwipeRelease(offsetRef.current, velocityX);

    if (action === 'delete') {
      setSwipeOffset(-SWIPE_MAX_DISTANCE);
      onSwipeOpen(null);
      resetPointer();
      onDeleteImmediately();
      return;
    }

    if (action === 'complete') {
      setSwipeOffset(SWIPE_MAX_DISTANCE);
      onSwipeOpen(null);
      resetPointer();
      window.setTimeout(() => {
        if (!isDone) onToggle();
        setSwipeOffset(0);
      }, 120);
      return;
    }

    const shouldOpen = action === 'open';
    setSwipeOffset(shouldOpen ? -SWIPE_ACTION_WIDTH : 0);
    onSwipeOpen(shouldOpen ? task.id : null);
    resetPointer();
  };

  const cancelDrag = () => {
    setSwipeOffset(isOpen ? -SWIPE_ACTION_WIDTH : 0);
    resetPointer();
  };

  const blockClickAfterDrag = (event: React.MouseEvent) => {
    if (!didDragRef.current) return false;
    event.preventDefault();
    event.stopPropagation();
    didDragRef.current = false;
    return true;
  };

  return (
    <div data-swipe-shell className={`relative overflow-hidden rounded-2xl ${startsRegularGroup ? 'mt-7' : ''}`}>
      <div
        className={`pointer-events-none absolute inset-[1px] rounded-[15px] bg-emerald-500 text-white transition-opacity ${
          offset > 0 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute inset-y-0 left-0 flex items-center gap-2 pl-6 text-xs font-bold">
          <Check className="h-5 w-5 stroke-[3]" />
          Xong
        </div>
      </div>
      <div
        className={`pointer-events-none absolute inset-[1px] overflow-hidden rounded-[15px] bg-rose-500 transition-opacity ${
          offset < 0 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={onRequestDelete}
          className="pointer-events-auto absolute inset-y-0 right-0 flex w-[88px] flex-col items-center justify-center gap-1 text-xs font-bold text-white transition active:bg-rose-600"
          aria-label={`Xóa việc ${task.title}`}
        >
          <Trash2 className="h-5 w-5" />
          Xóa
        </button>
      </div>

      <article
        data-importance={isImportant ? 'priority' : 'regular'}
        className={`relative z-10 flex items-center gap-4 rounded-2xl border px-4 sm:px-5 ${
          dragging ? '' : 'transition-transform duration-200 ease-out'
        } ${
          isImportant
            ? 'min-h-[84px] border-indigo-100 bg-gradient-to-r from-indigo-50/40 via-white to-white py-4 shadow-xs hover:border-indigo-200/80 hover:shadow-sm'
            : 'min-h-[68px] border-slate-200/70 bg-white py-3.5 shadow-xs hover:border-slate-300/80 hover:shadow-sm'
        } ${isDone ? '!border-slate-200/70 !bg-slate-50' : ''}`}
        style={{ transform: `translateX(${offset}px)`, touchAction: 'pan-y' }}
        onPointerDown={(event) => {
          startXRef.current = event.clientX;
          startYRef.current = event.clientY;
          startTimeRef.current = performance.now();
          startOffsetRef.current = offsetRef.current;
          didDragRef.current = false;
          isSwipingRef.current = false;
        }}
        onPointerMove={(event) => {
          if (startXRef.current === null || startYRef.current === null) return;
          const deltaX = event.clientX - startXRef.current;
          const deltaY = event.clientY - startYRef.current;

          if (!isSwipingRef.current) {
            if (Math.abs(deltaY) >= SWIPE_START_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX)) {
              resetPointer();
              return;
            }
            if (!shouldStartSwipe(deltaX, deltaY)) return;
            isSwipingRef.current = true;
            didDragRef.current = true;
            setDragging(true);
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }

          const maxRight = isDone ? 0 : SWIPE_MAX_DISTANCE;
          const next = Math.max(-SWIPE_MAX_DISTANCE, Math.min(maxRight, startOffsetRef.current + deltaX));
          setSwipeOffset(next);
        }}
        onPointerUp={(event) => finishDrag(event.clientX)}
        onPointerCancel={cancelDrag}
      >
        <button
          type="button"
          onClick={(event) => {
            if (blockClickAfterDrag(event)) return;
            onToggle();
          }}
          aria-label={isDone ? `Đánh dấu ${task.title} chưa hoàn thành` : `Hoàn thành ${task.title}`}
          className="shrink-0 transition-transform active:scale-95"
        >
          {isDone ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          ) : (
            <Circle className={isImportant ? 'h-6 w-6 text-indigo-300' : 'h-6 w-6 text-slate-300'} />
          )}
        </button>

        <button
          type="button"
          onClick={(event) => {
            if (blockClickAfterDrag(event)) return;
            if (offsetRef.current !== 0) {
              setSwipeOffset(0);
              onSwipeOpen(null);
              return;
            }
            onOpen();
          }}
          className="flex min-w-0 flex-1 items-center gap-4 text-left"
        >
          <div className="min-w-0 flex-1">
            <h2 className={`truncate ${isImportant ? 'text-base font-bold text-slate-900 sm:text-lg' : 'text-sm font-semibold text-slate-800 sm:text-base'} ${isDone ? '!text-slate-400 line-through' : ''}`}>
              {task.title}
            </h2>
            <div className={`${isImportant ? 'mt-1.5' : 'mt-1'} flex items-center gap-3 text-xs text-slate-400`}>
              {task.startTime ? (
                <span className="inline-flex items-center gap-1 font-medium text-slate-500">
                  <Clock3 className="h-3.5 w-3.5 text-slate-400" /> {task.startTime}
                </span>
              ) : null}
              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100" aria-label={`${completedSubtasks}/${task.subtasks.length} bước`}>
                <div
                  className={`h-full rounded-full transition-all ${isImportant ? 'bg-indigo-600' : 'bg-emerald-500'}`}
                  style={{ width: `${subtaskProgress}%` }}
                />
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
        </button>
      </article>
    </div>
  );
};

interface ReferenceImagePickerProps {
  label: string;
  image?: ReferenceLibraryItem;
  onPick: (label: string, file?: File) => void;
  onLink: (label: string, url: string) => void;
  onRemove: (label: string) => void;
  compact?: boolean;
}

const ReferenceImagePicker: React.FC<ReferenceImagePickerProps> = ({
  label,
  image,
  onPick,
  onLink,
  onRemove,
  compact = false,
}) => {
  const box = compact ? 'h-12 w-12' : 'h-14 w-14';
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');

  const openLinkDialog = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setLinkValue(image?.source === 'url' ? image.dataUrl : '');
    setLinkOpen(true);
  };

  const submitLink = (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const value = linkValue.trim();
    if (!value) return;
    onLink(label, value);
    setLinkOpen(false);
  };

  return (
    <div className={`group relative ${box} shrink-0`}>
      {image ? (
        <>
          <div className="relative h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <img src={image.dataUrl} alt="" className="h-full w-full object-cover" />
            <label className="absolute inset-0 grid cursor-pointer place-items-center bg-black/0 text-[9px] font-bold text-transparent transition group-hover:bg-black/45 group-hover:text-white">
              Đổi
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void onPick(label, event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove(label);
            }}
            className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-white bg-slate-700 text-white opacity-0 shadow-sm transition group-hover:opacity-100 focus:opacity-100"
            aria-label={`Bỏ ảnh dùng chung của ${label}`}
            title="Bỏ ảnh dùng chung"
          >
            <ImageOff className="h-2.5 w-2.5" />
          </button>
        </>
      ) : (
        <label className="grid h-full w-full cursor-pointer place-items-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600">
          <ImagePlus className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              void onPick(label, event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
        </label>
      )}

      <button
        type="button"
        onClick={openLinkDialog}
        className="absolute -bottom-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full border border-white bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
        aria-label={`Gắn ảnh bằng link cho ${label}`}
        title="Gắn ảnh bằng link"
      >
        <Link2 className="h-2.5 w-2.5" />
      </button>

      {linkOpen ? (
        <div
          className="fixed inset-0 z-[180] grid place-items-center bg-slate-950/35 px-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label={`Gắn link ảnh cho ${label}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.target === event.currentTarget) setLinkOpen(false);
          }}
        >
          <form
            onSubmit={submitLink}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900">Gắn link ảnh</h3>
                <p className="mt-1 truncate text-xs text-slate-400">{label}</p>
              </div>
              <button
                type="button"
                onClick={() => setLinkOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Link ảnh trực tiếp</span>
              <input
                autoFocus
                type="url"
                inputMode="url"
                value={linkValue}
                onChange={(event) => setLinkValue(event.target.value)}
                placeholder="https://.../image.jpg"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                Dán URL ảnh mở trực tiếp được trên trình duyệt, ví dụ .jpg, .png hoặc .webp.
              </p>
            </label>

            {image?.source === 'url' ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <img src={image.dataUrl} alt="Ảnh hiện tại" className="max-h-44 w-full object-contain" />
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setLinkOpen(false)}
                className="h-11 rounded-xl bg-slate-100 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!linkValue.trim()}
                className="h-11 rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Gắn ảnh
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
};

export const TodayView: React.FC = () => {
  const {
    user,
    tasks,
    projects,
    toggleTaskComplete,
    toggleSubtask,
    setEditingTask,
    openTaskModal,
    addToast,
    deleteTask,
    updateTask,
  } = useApp();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('task'),
  );
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);
  const [referenceLibrary, setReferenceLibrary] = useState<ReferenceLibraryItem[]>(() => loadReferenceLibraryCache());
  const [reflectionDrafts, setReflectionDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    if (!user) {
      setReferenceLibrary(loadReferenceLibraryCache());
      return () => {};
    }

    void bootstrapReferenceLibrary(user.uid)
      .then((items) => {
        if (cancelled) return;
        setReferenceLibrary(items);
        unsubscribe = subscribeReferenceLibrary(
          user.uid,
          (next) => {
            if (!cancelled) setReferenceLibrary(next);
          },
          () => {
            if (!cancelled) addToast('Không thể đồng bộ kho ảnh tham khảo.', 'warning');
          },
        );
      })
      .catch((error) => {
        console.warn('Could not load reference library:', error);
        if (!cancelled) addToast('Đang dùng kho ảnh trên thiết bị này.', 'warning');
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user?.uid, addToast]);

  const today = getFormattedToday(0);
  const allTodayTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.plannedDate === today || (task.isTopPriority && task.status !== 'done'))
        .toSorted((a, b) => {
          if (a.isTopPriority !== b.isTopPriority) return a.isTopPriority ? -1 : 1;
          return (a.startTime || '99:99').localeCompare(b.startTime || '99:99');
        }),
    [tasks, today],
  );
  const todayTasks = useMemo(() => allTodayTasks.filter((task) => task.status !== 'done'), [allTodayTasks]);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId);

  const closeDetail = () => {
    setSelectedTaskId(null);
    if (window.location.search) window.history.replaceState({}, '', window.location.pathname);
  };

  if (selectedTask) {
    const completedSubtasks = selectedTask.subtasks.filter((subtask) => subtask.completed).length;
    const subtaskProgress = selectedTask.subtasks.length
      ? Math.round((completedSubtasks / selectedTask.subtasks.length) * 100)
      : 0;
    const project = projects.find((item) => item.id === selectedTask.projectId);
    const priorityLabel =
      selectedTask.priority === 'urgent'
        ? 'Khẩn cấp'
        : selectedTask.priority === 'high'
          ? 'Quan trọng'
          : selectedTask.priority === 'low'
            ? 'Nhẹ'
            : 'Thường';
    const referenceLines = parseManualReferenceList(selectedTask.description);
    const visibleNotes = getVisibleTaskNotes(selectedTask.notes);
    const reflectionDraft = reflectionDrafts[selectedTask.id] ?? selectedTask.reflection ?? '';
    const reflectionChanged = reflectionDraft !== (selectedTask.reflection || '');
    const isDailyDiscoveryPrompt = /hôm nay có gì mới/i.test(visibleNotes);

    const saveReflection = () => {
      const cleaned = reflectionDraft.trim();
      updateTask(selectedTask.id, { reflection: cleaned || undefined });
      setReflectionDrafts((current) => {
        const next = { ...current };
        delete next[selectedTask.id];
        return next;
      });
      addToast(cleaned ? 'Đã lưu ghi chú hôm nay' : 'Đã xóa ghi chú hôm nay', 'success');
    };

    const chooseReferenceImage = async (label: string, file?: File) => {
      if (!file) return;
      try {
        const dataUrl = await fileToCompactDataUrl(file);
        const item = makeReferenceLibraryItem(label, dataUrl, file.name);
        setReferenceLibrary((current) => {
          const next = upsertReferenceLibraryItem(current, item);
          saveReferenceLibraryCache(next);
          return next;
        });
        await saveReferenceLibraryItem(user?.uid, item);
        addToast(`Đã nhớ ảnh cho “${item.label}”`, 'success');
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Không thể thêm ảnh.', 'error');
      }
    };

    const chooseReferenceImageUrl = async (label: string, url: string) => {
      try {
        const item = makeReferenceLibraryItemFromUrl(label, url);
        setReferenceLibrary((current) => {
          const next = upsertReferenceLibraryItem(current, item);
          saveReferenceLibraryCache(next);
          return next;
        });
        await saveReferenceLibraryItem(user?.uid, item);
        addToast(`Đã gắn link ảnh cho “${item.label}”`, 'success');
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Link ảnh không hợp lệ.', 'error');
      }
    };

    const clearReferenceImage = async (label: string) => {
      const item = getReferenceLibraryItem(referenceLibrary, label);
      if (!item) return;
      setReferenceLibrary((current) => {
        const next = removeReferenceLibraryItem(current, item.id);
        saveReferenceLibraryCache(next);
        return next;
      });
      try {
        await deleteReferenceLibraryItem(user?.uid, item.id);
      } catch (error) {
        console.warn('Could not delete shared reference image:', error);
        addToast('Ảnh đã bỏ trên máy này nhưng chưa đồng bộ được lên cloud.', 'warning');
      }
    };

    return (
      <div data-testid="task-detail-page" className="fixed inset-0 z-[100] overflow-y-auto bg-[#fafbfc] text-slate-900">
        <div className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-4 sm:px-5">
            <button
              type="button"
              onClick={closeDetail}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200/60 bg-slate-50/80 text-slate-600 transition hover:bg-slate-100 active:scale-95"
              aria-label="Quay lại hôm nay"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-slate-900">Chi tiết công việc</p>
              <p className="truncate text-xs font-medium text-slate-400">Hôm nay</p>
            </div>
            <button
              type="button"
              onClick={() => setEditingTask(selectedTask)}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50/80 px-3.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100/70 active:scale-95"
            >
              <Edit2 className="h-3.5 w-3.5" /> Sửa
            </button>
          </div>
        </div>

        <main className="mx-auto max-w-2xl space-y-4 px-4 pb-[max(32px,env(safe-area-inset-bottom))] pt-5 sm:px-5 sm:pt-6">
          <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-xs sm:p-7">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
              <span>{formatDisplayDate(selectedTask.plannedDate)}</span>
              {selectedTask.startTime ? (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <Clock3 className="h-3.5 w-3.5 text-slate-400" /> {selectedTask.startTime}
                  </span>
                </>
              ) : null}
              <span>·</span>
              <span>{selectedTask.estimatedMinutes} phút</span>
            </div>

            <h1 className="mt-3 break-words text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
              {selectedTask.title}
            </h1>

            <div className="mt-4 flex flex-wrap gap-2">
              {project ? (
                <span className="rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-700">
                  {project.name}
                </span>
              ) : null}
              <span className="rounded-full border border-slate-200/60 bg-slate-100/80 px-3 py-1 text-xs font-semibold text-slate-600">
                {priorityLabel}
              </span>
            </div>

            {selectedTask.description ? (
              referenceLines.length > 0 ? (
                <div className="mt-5">
                  <div className="mb-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Các bước / tham khảo</p>
                  </div>
                  <div className="space-y-2.5">
                    {referenceLines.map((reference, index) => {
                      const image = getReferenceLibraryItem(referenceLibrary, reference.label);
                      return (
                        <div
                          key={reference.id}
                          className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/35 p-3"
                        >
                          <ReferenceImagePicker
                            label={reference.label}
                            image={image}
                            onPick={chooseReferenceImage}
                            onLink={chooseReferenceImageUrl}
                            onRemove={clearReferenceImage}
                          />
                          <span className="w-5 shrink-0 text-[11px] font-bold tabular-nums text-slate-400">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-semibold leading-5 text-slate-800">{reference.label}</p>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-600">{selectedTask.description}</p>
              )
            ) : null}

            <button
              type="button"
              onClick={() => toggleTaskComplete(selectedTask.id)}
              className={`mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold transition-all ${
                selectedTask.status === 'done'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/60'
                  : 'border border-slate-200 bg-slate-900 text-white shadow-xs hover:bg-slate-800'
              }`}
            >
              <Check className="h-4 w-4" /> {selectedTask.status === 'done' ? 'Đã xong' : 'Hoàn thành nhiệm vụ'}
            </button>
          </section>

          <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Tiến độ</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {selectedTask.subtasks.length > 0
                    ? `${completedSubtasks}/${selectedTask.subtasks.length} bước đã hoàn thành`
                    : 'Chưa có bước nhỏ'}
                </p>
              </div>
              <span className="text-xl font-bold tabular-nums text-indigo-600">{subtaskProgress}%</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-indigo-600 transition-all duration-300" style={{ width: `${subtaskProgress}%` }} />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-xs">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Các bước thực hiện</h2>
                <p className="mt-1 text-xs text-slate-400">Chạm vào từng bước để đánh dấu hoàn thành</p>
              </div>
              <span className="rounded-full border border-slate-200/60 bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                {selectedTask.subtasks.length}
              </span>
            </div>

            {selectedTask.subtasks.length > 0 ? (
              <div className="space-y-2.5">
                {selectedTask.subtasks.map((subtask, index) => {
                  const image = getReferenceLibraryItem(referenceLibrary, subtask.title);
                  return (
                    <div
                      key={subtask.id}
                      className={`flex min-h-16 w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
                        subtask.completed
                          ? 'border border-transparent bg-slate-50 text-slate-400'
                          : 'border border-slate-200/70 bg-white text-slate-800 shadow-xs hover:border-slate-300'
                      }`}
                    >
                      <ReferenceImagePicker
                        compact
                        label={subtask.title}
                        image={image}
                        onPick={chooseReferenceImage}
                        onLink={chooseReferenceImageUrl}
                        onRemove={clearReferenceImage}
                      />
                      <button
                        type="button"
                        onClick={() => toggleSubtask(selectedTask.id, subtask.id)}
                        className="shrink-0"
                        aria-label={subtask.completed ? 'Đánh dấu chưa hoàn thành' : 'Hoàn thành bước'}
                      >
                        {subtask.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-slate-300" />
                        )}
                      </button>
                      <span className="w-5 shrink-0 text-[11px] font-bold tabular-nums text-slate-400">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSubtask(selectedTask.id, subtask.id)}
                        className={`min-w-0 flex-1 text-left text-sm font-medium ${subtask.completed ? 'line-through' : ''}`}
                      >
                        <span className="block break-words">{subtask.title}</span>
                      </button>
                      {subtask.estimatedMinutes ? (
                        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                          {subtask.estimatedMinutes}p
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-8 text-center">
                <ListChecks className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-600">Chưa có nhiệm vụ nhỏ</p>
                <button
                  type="button"
                  onClick={() => setEditingTask(selectedTask)}
                  className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/80 px-4 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                >
                  <Plus className="h-3.5 w-3.5" /> Thêm bước
                </button>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Ghi chú & kết quả</h2>
                <p className="mt-1 text-xs text-slate-400">Ghi lại ngay trong task, dữ liệu sẽ đi cùng công việc.</p>
              </div>
              {selectedTask.reflection && !reflectionChanged ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                  Đã lưu
                </span>
              ) : null}
            </div>

            {visibleNotes ? (
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Gợi ý</p>
                <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-slate-600">
                  {visibleNotes}
                </p>
              </div>
            ) : null}

            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-bold text-slate-700">
                {isDailyDiscoveryPrompt ? 'Hôm nay có gì mới?' : 'Ghi lại điều muốn nhớ'}
              </span>
              <textarea
                rows={4}
                value={reflectionDraft}
                onChange={(event) =>
                  setReflectionDrafts((current) => ({
                    ...current,
                    [selectedTask.id]: event.target.value,
                  }))
                }
                placeholder={
                  isDailyDiscoveryPrompt
                    ? 'Ví dụ: Mình phát hiện con đường này có một quán nhỏ khá hay...'
                    : 'Viết nhanh vài dòng sau khi hoàn thành việc này...'
                }
                className="min-h-28 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            </label>

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[10px] font-medium text-slate-400">
                {reflectionDraft.trim().length} ký tự
              </span>
              <button
                type="button"
                onClick={saveReflection}
                disabled={!reflectionChanged}
                className="h-10 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
              >
                Lưu ghi chú
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const completedCount = allTodayTasks.filter((task) => task.status === 'done').length;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Hôm nay"
        meta={`${completedCount}/${allTodayTasks.length}`}
        action={
          <button
            type="button"
            onClick={() => openTaskModal()}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-600 text-white shadow-xs transition hover:bg-indigo-700 active:scale-95"
            aria-label="Thêm việc"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      <main data-testid="today-task-list" className="space-y-3">
        {todayTasks.length > 0 ? (
          todayTasks.map((task, taskIndex) => {
            const completedSubtasks = task.subtasks.filter((subtask) => subtask.completed).length;
            const isDone = task.status === 'done';
            const isImportant = Boolean(task.isTopPriority);
            const subtaskProgress = task.subtasks.length
              ? (completedSubtasks / task.subtasks.length) * 100
              : 0;
            const startsRegularGroup = !isImportant && taskIndex > 0 && Boolean(todayTasks[taskIndex - 1]?.isTopPriority);

            return (
              <SwipeTodayTaskRow
                key={task.id}
                task={task}
                completedSubtasks={completedSubtasks}
                isDone={isDone}
                isImportant={isImportant}
                subtaskProgress={subtaskProgress}
                startsRegularGroup={startsRegularGroup}
                isOpen={openSwipeId === task.id}
                onSwipeOpen={setOpenSwipeId}
                onToggle={() => toggleTaskComplete(task.id)}
                onOpen={() => setSelectedTaskId(task.id)}
                onRequestDelete={() => {
                  setPendingDeleteTask(task);
                  setOpenSwipeId(null);
                }}
                onDeleteImmediately={() => deleteTask(task.id)}
              />
            );
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 px-6 py-20 text-center backdrop-blur-xs">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="font-semibold text-slate-800">{allTodayTasks.length > 0 ? 'Xong hết việc hôm nay' : 'Hôm nay chưa có việc nào'}</p>
            <p className="mt-1 text-xs text-slate-400">
              {allTodayTasks.length > 0 ? 'Việc đã hoàn thành được ẩn để danh sách gọn hơn' : 'Hãy thêm các việc cần hoàn thành trong ngày'}
            </p>
            <button
              type="button"
              onClick={() => openTaskModal()}
              className="mt-4 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700"
            >
              Thêm việc đầu tiên
            </button>
          </div>
        )}
      </main>

      <button
        type="button"
        onClick={() => openTaskModal()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200/90 bg-white/50 py-4 text-sm font-semibold text-slate-500 transition hover:border-indigo-300 hover:bg-white hover:text-indigo-600"
      >
        <Plus className="h-4 w-4" /> Thêm việc hôm nay
      </button>

      {pendingDeleteTask ? (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/30 px-5 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="today-delete-task-title"
        >
          <div className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <h2 id="today-delete-task-title" className="text-lg font-bold text-slate-900">Bạn có chắc muốn xóa việc này?</h2>
            <p className="mt-2 break-words text-sm leading-relaxed text-slate-500">
              “{pendingDeleteTask.title}” sẽ được chuyển vào Thùng rác và có thể khôi phục trong 30 ngày.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteTask(null)}
                className="h-11 rounded-xl border border-slate-200/70 bg-slate-100/80 text-sm font-bold text-slate-600 transition hover:bg-slate-200/70"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteTask(pendingDeleteTask.id);
                  setPendingDeleteTask(null);
                }}
                className="h-11 rounded-xl bg-rose-600 text-sm font-bold text-white shadow-xs transition hover:bg-rose-700 active:bg-rose-800"
              >
                Xóa việc
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};