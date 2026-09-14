import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Edit2,
  ListChecks,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getFormattedToday } from '../../data/mockData';
import { Task } from '../../types';
import { PageHeader } from '../common/PageHeader';

const SWIPE_ACTION_WIDTH = 88;
const SWIPE_MAX_DISTANCE = 180;
const SWIPE_OPEN_THRESHOLD = 44;
const SWIPE_HARD_DELETE_DISTANCE = 132;
const SWIPE_FAST_DELETE_DISTANCE = 72;
const SWIPE_FAST_DELETE_VELOCITY = -0.85;

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
  const startTimeRef = useRef(0);
  const startOffsetRef = useRef(0);
  const offsetRef = useRef(offset);
  const didDragRef = useRef(false);

  const setSwipeOffset = (next: number) => {
    offsetRef.current = next;
    setOffset(next);
  };

  useEffect(() => {
    setSwipeOffset(isOpen ? -SWIPE_ACTION_WIDTH : 0);
  }, [isOpen]);

  const finishDrag = (clientX: number) => {
    if (startXRef.current === null) return;
    const elapsed = Math.max(1, performance.now() - startTimeRef.current);
    const velocityX = (clientX - startXRef.current) / elapsed;
    const action = resolveSwipeRelease(offsetRef.current, velocityX);

    if (action === 'delete') {
      setSwipeOffset(-SWIPE_MAX_DISTANCE);
      onSwipeOpen(null);
      startXRef.current = null;
      setDragging(false);
      onDeleteImmediately();
      return;
    }

    const shouldOpen = action === 'open';
    setSwipeOffset(shouldOpen ? -SWIPE_ACTION_WIDTH : 0);
    onSwipeOpen(shouldOpen ? task.id : null);
    startXRef.current = null;
    setDragging(false);
  };

  const blockClickAfterDrag = (event: React.MouseEvent) => {
    if (!didDragRef.current) return false;
    event.preventDefault();
    event.stopPropagation();
    didDragRef.current = false;
    return true;
  };

  return (
    <div
      data-swipe-shell
      className={`relative overflow-hidden rounded-2xl ${startsRegularGroup ? 'mt-8' : ''}`}
    >
      <div className="pointer-events-none absolute inset-y-[1px] right-[1px] w-[180px] overflow-hidden rounded-r-[15px] bg-rose-600">
        <button
          type="button"
          onClick={onRequestDelete}
          className="pointer-events-auto absolute inset-y-0 right-0 flex w-[88px] flex-col items-center justify-center gap-1 text-xs font-bold text-white active:bg-rose-700"
          aria-label={`Xóa việc ${task.title}`}
        >
          <Trash2 className="h-5 w-5" />
          Xóa
        </button>
      </div>

      <article
        data-importance={isImportant ? 'priority' : 'regular'}
        data-priority={isImportant ? 'important' : 'regular'}
        className={`relative z-10 flex items-center gap-4 rounded-2xl border px-4 sm:px-6 ${
          dragging ? '' : 'transition-transform duration-200 ease-out'
        } ${isImportant ? 'min-h-24 border-l-4 border-l-blue-500 bg-blue-50 py-4 shadow-sm' : 'min-h-16 bg-white py-3'} ${
          isDone
            ? 'border-stone-200 !bg-stone-100/60 opacity-60'
            : isImportant
              ? 'border-blue-100 hover:border-blue-200 hover:shadow-md'
              : 'border-stone-200 hover:border-stone-300 hover:shadow-sm'
        }`}
        style={{ transform: `translateX(${offset}px)`, touchAction: 'pan-y' }}
        onPointerDown={(event) => {
          startXRef.current = event.clientX;
          startTimeRef.current = performance.now();
          startOffsetRef.current = offsetRef.current;
          didDragRef.current = false;
          setDragging(true);
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (startXRef.current === null) return;
          const delta = event.clientX - startXRef.current;
          if (Math.abs(delta) > 6) didDragRef.current = true;
          const next = Math.max(-SWIPE_MAX_DISTANCE, Math.min(0, startOffsetRef.current + delta));
          setSwipeOffset(next);
        }}
        onPointerUp={(event) => finishDrag(event.clientX)}
        onPointerCancel={(event) => finishDrag(event.clientX)}
      >
        <button
          type="button"
          onClick={(event) => {
            if (blockClickAfterDrag(event)) return;
            onToggle();
          }}
          aria-label={isDone ? `Đánh dấu ${task.title} chưa hoàn thành` : `Hoàn thành ${task.title}`}
          className="shrink-0 text-stone-300 hover:text-emerald-600"
        >
          {isDone ? (
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          ) : (
            <Circle className={isImportant ? 'h-7 w-7 text-blue-300' : 'h-6 w-6'} />
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
            <h2 className={`truncate ${isImportant ? 'text-lg font-bold text-blue-950 sm:text-xl' : 'text-sm font-medium text-stone-700 sm:text-base'} ${isDone ? '!text-stone-400 line-through' : ''}`}>
              {task.title}
            </h2>
            <div className={`${isImportant ? 'mt-2' : 'mt-1'} flex items-center gap-3 text-xs text-stone-400`}>
              {task.startTime ? (
                <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{task.startTime}</span>
              ) : null}
              <div className="h-1 w-14 overflow-hidden rounded-full bg-stone-200" aria-label={`${completedSubtasks}/${task.subtasks.length} bước`}>
                <div className={`h-full rounded-full ${isImportant ? 'bg-blue-600' : 'bg-emerald-500'}`} style={{ width: `${subtaskProgress}%` }} />
              </div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-stone-300" />
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
    startFocusSession,
    setEditingTask,
    openTaskModal,
    deleteTask,
  } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('task'),
  );
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);

  const closeFocusPage = () => {
    setSelectedTaskId(null);
    if (window.location.search) window.history.replaceState({}, '', window.location.pathname);
  };

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

  if (selectedTask) {
    const completedSubtasks = selectedTask.subtasks.filter((subtask) => subtask.completed).length;
    const subtaskProgress = selectedTask.subtasks.length
      ? Math.round((completedSubtasks / selectedTask.subtasks.length) * 100)
      : 0;
    const project = projects.find((item) => item.id === selectedTask.projectId);

    return (
      <div
        data-testid="subtask-focus-page"
        className="fixed inset-0 z-[100] overflow-y-auto bg-[#faf9f5] text-stone-950"
      >
        <div className="mx-auto min-h-screen max-w-3xl px-5 py-6 sm:px-8 sm:py-10">
          <button
            type="button"
            onClick={closeFocusPage}
            className="mb-10 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-stone-500 transition-colors hover:bg-white hover:text-stone-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại hôm nay
          </button>

          <header className="border-b border-stone-200 pb-7">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-stone-400">
              {project ? <span>{project.name}</span> : null}
              {project && selectedTask.startTime ? <span>·</span> : null}
              {selectedTask.startTime ? <span>{selectedTask.startTime}</span> : null}
              <span>·</span>
              <span>{selectedTask.estimatedMinutes} phút</span>
            </div>
            <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {selectedTask.title}
            </h1>
            {selectedTask.description ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
                {selectedTask.description}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => startFocusSession(selectedTask)}
                className="inline-flex items-center gap-2 rounded-xl bg-stone-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800"
              >
                <Play className="h-4 w-4 fill-current" />
                Bắt đầu tập trung
              </button>
              <button
                type="button"
                onClick={() => setEditingTask(selectedTask)}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:border-stone-300"
              >
                <Edit2 className="h-4 w-4" />
                Chỉnh sửa
              </button>
            </div>
          </header>

          <main className="py-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                  Các bước thực hiện
                </p>
                <p className="mt-2 text-sm text-stone-500">
                  {completedSubtasks}/{selectedTask.subtasks.length} nhiệm vụ đã hoàn thành
                </p>
              </div>
              <span className="text-2xl font-semibold tabular-nums text-stone-900">
                {subtaskProgress}%
              </span>
            </div>

            <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${subtaskProgress}%` }}
              />
            </div>

            {selectedTask.subtasks.length > 0 ? (
              <div className="space-y-3">
                {selectedTask.subtasks.map((subtask, index) => (
                  <button
                    key={subtask.id}
                    type="button"
                    onClick={() => toggleSubtask(selectedTask.id, subtask.id)}
                    className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-5 text-left transition-all sm:px-6 ${
                      subtask.completed
                        ? 'border-stone-200 bg-stone-100/70 text-stone-400'
                        : 'border-stone-200 bg-white text-stone-900 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm'
                    }`}
                  >
                    {subtask.completed ? (
                      <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="h-6 w-6 shrink-0 text-stone-300" />
                    )}
                    <span className="w-6 shrink-0 text-xs font-semibold tabular-nums text-stone-300">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className={`min-w-0 flex-1 text-base font-medium ${subtask.completed ? 'line-through' : ''}`}>
                      {subtask.title}
                    </span>
                    {subtask.estimatedMinutes ? (
                      <span className="shrink-0 text-xs text-stone-400">
                        {subtask.estimatedMinutes}p
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
                <ListChecks className="mx-auto mb-3 h-7 w-7 text-stone-300" />
                <p className="font-medium text-stone-700">Việc này chưa có nhiệm vụ nhỏ</p>
                <p className="mt-1 text-sm text-stone-400">Thêm các bước để bắt đầu xử lý lần lượt.</p>
                <button
                  type="button"
                  onClick={() => setEditingTask(selectedTask)}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-stone-950 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Plus className="h-4 w-4" /> Thêm nhiệm vụ nhỏ
                </button>
              </div>
            )}
          </main>

          <footer className="flex items-center justify-between border-t border-stone-200 py-6">
            <button
              type="button"
              onClick={() => toggleTaskComplete(selectedTask.id)}
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-emerald-700"
            >
              <Check className="h-4 w-4" />
              {selectedTask.status === 'done' ? 'Đánh dấu chưa xong' : 'Hoàn thành toàn bộ việc'}
            </button>
            <button
              type="button"
              onClick={closeFocusPage}
              className="inline-flex items-center gap-2 text-sm font-semibold text-stone-900"
            >
              Việc tiếp theo <ArrowRight className="h-4 w-4" />
            </button>
          </footer>
        </div>
      </div>
    );
  }

  const completedCount = todayTasks.filter((task) => task.status === 'done').length;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Hôm nay" meta={`${completedCount}/${todayTasks.length}`} action={<button type="button" onClick={() => openTaskModal()} className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-white shadow-sm" aria-label="Thêm việc"><Plus className="h-5 w-5" /></button>} />

      <main data-testid="today-task-list" className="space-y-3">
        {todayTasks.length > 0 ? (
          todayTasks.map((task, index) => {
            const completedSubtasks = task.subtasks.filter((subtask) => subtask.completed).length;
            const isDone = task.status === 'done';
            const isImportant = Boolean(task.isTopPriority);
            const subtaskProgress = task.subtasks.length
              ? (completedSubtasks / task.subtasks.length) * 100
              : 0;
            const startsRegularGroup = !isImportant && index > 0 && todayTasks[index - 1].isTopPriority;

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
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-20 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-stone-300" />
            <p className="font-medium text-stone-700">Hôm nay chưa có việc nào</p>
            <button type="button" onClick={() => openTaskModal()} className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Thêm việc đầu tiên</button>
          </div>
        )}
      </main>

      <button
        type="button"
        onClick={() => openTaskModal()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 py-4 text-sm font-medium text-stone-500 hover:border-stone-400 hover:bg-white hover:text-stone-900"
      >
        <Plus className="h-4 w-4" /> Thêm việc hôm nay
      </button>

      {pendingDeleteTask ? (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/35 px-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="today-delete-task-title"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <h2 id="today-delete-task-title" className="text-lg font-bold text-slate-950">
              Bạn có chắc muốn xóa việc này?
            </h2>
            <p className="mt-2 break-words text-sm leading-6 text-slate-500">
              “{pendingDeleteTask.title}” sẽ được chuyển vào Thùng rác và có thể khôi phục trong 30 ngày.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPendingDeleteTask(null)}
                className="h-12 rounded-xl bg-slate-100 text-sm font-bold text-slate-600"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteTask(pendingDeleteTask.id);
                  setPendingDeleteTask(null);
                }}
                className="h-12 rounded-xl bg-rose-600 text-sm font-bold text-white active:bg-rose-700"
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
