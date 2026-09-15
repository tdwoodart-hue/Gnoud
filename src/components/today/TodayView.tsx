import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Edit2,
  ListChecks,
  Plus,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDisplayDate, getFormattedToday } from '../../data/mockData';
import { Task } from '../../types';
import { PageHeader } from '../common/PageHeader';

const SWIPE_ACTION_WIDTH = 88;
const SWIPE_MAX_DISTANCE = 180;
const SWIPE_OPEN_THRESHOLD = 44;
const SWIPE_HARD_DELETE_DISTANCE = 132;
const SWIPE_FAST_DELETE_DISTANCE = 72;
const SWIPE_FAST_DELETE_VELOCITY = -0.85;
const SWIPE_START_THRESHOLD = 8;

export type SwipeReleaseAction = 'close' | 'open' | 'delete';

export const resolveSwipeRelease = (offset: number, velocityX: number): SwipeReleaseAction => {
  if (
    offset <= -SWIPE_HARD_DELETE_DISTANCE ||
    (offset <= -SWIPE_FAST_DELETE_DISTANCE && velocityX <= SWIPE_FAST_DELETE_VELOCITY)
  ) {
    return 'delete';
  }
  if (offset <= -SWIPE_OPEN_THRESHOLD) return 'open';
  return 'close';
};

export const shouldStartSwipe = (deltaX: number, deltaY: number): boolean => {
  const horizontal = Math.abs(deltaX);
  const vertical = Math.abs(deltaY);
  return horizontal >= SWIPE_START_THRESHOLD && horizontal > vertical;
};

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
      <div className="pointer-events-none absolute inset-y-[1px] right-[1px] w-[180px] overflow-hidden rounded-r-[15px] bg-rose-500">
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
        } ${isDone ? '!border-slate-200/50 !bg-slate-50/70 opacity-60' : ''}`}
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

          const next = Math.max(-SWIPE_MAX_DISTANCE, Math.min(0, startOffsetRef.current + deltaX));
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
            if (offsetRef.current < 0) {
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

export const TodayView: React.FC = () => {
  const {
    tasks,
    projects,
    toggleTaskComplete,
    toggleSubtask,
    setEditingTask,
    openTaskModal,
    deleteTask,
  } = useApp();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('task'),
  );
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);

  const today = getFormattedToday(0);
  const todayTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.plannedDate === today || task.isTopPriority)
        .toSorted((a, b) => {
          if (a.status === 'done' && b.status !== 'done') return 1;
          if (a.status !== 'done' && b.status === 'done') return -1;
          if (a.isTopPriority !== b.isTopPriority) return a.isTopPriority ? -1 : 1;
          return (a.startTime || '99:99').localeCompare(b.startTime || '99:99');
        }),
    [tasks, today],
  );

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
              <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-600">{selectedTask.description}</p>
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
                {selectedTask.subtasks.map((subtask, index) => (
                  <button
                    key={subtask.id}
                    type="button"
                    onClick={() => toggleSubtask(selectedTask.id, subtask.id)}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                      subtask.completed
                        ? 'border border-transparent bg-slate-50 text-slate-400'
                        : 'border border-slate-200/70 bg-white text-slate-800 shadow-xs hover:border-slate-300'
                    }`}
                  >
                    {subtask.completed ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-slate-300" />
                    )}
                    <span className="w-5 shrink-0 text-[11px] font-bold tabular-nums text-slate-400">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className={`min-w-0 flex-1 text-sm font-medium ${subtask.completed ? 'line-through' : ''}`}>
                      {subtask.title}
                    </span>
                    {subtask.estimatedMinutes ? (
                      <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                        {subtask.estimatedMinutes}p
                      </span>
                    ) : null}
                  </button>
                ))}
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

          {selectedTask.notes ? (
            <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900">Ghi chú</h2>
              <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-slate-600">{selectedTask.notes}</p>
            </section>
          ) : null}
        </main>
      </div>
    );
  }

  const completedCount = todayTasks.filter((task) => task.status === 'done').length;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Hôm nay"
        meta={`${completedCount}/${todayTasks.length}`}
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
            <p className="font-semibold text-slate-800">Hôm nay chưa có việc nào</p>
            <p className="mt-1 text-xs text-slate-400">Hãy thêm các việc cần hoàn thành trong ngày</p>
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
