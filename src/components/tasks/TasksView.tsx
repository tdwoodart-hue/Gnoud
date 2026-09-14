import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  FolderKanban,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Task, TaskStatus } from '../../types';
import { parseProjectPlanFile } from '../../services/taskDraft';
import { PageHeader } from '../common/PageHeader';
import { EmptyState } from '../common/EmptyState';

type Filter = 'open' | 'done' | 'all';
type ViewMode = 'tasks' | 'projects';

const priorityColor = {
  urgent: 'bg-rose-500',
  high: 'bg-amber-400',
  medium: 'bg-blue-500',
  low: 'bg-slate-300',
};

const SWIPE_DELETE_WIDTH = 88;

const SwipeTaskRow: React.FC<{
  task: Task;
  projectName?: string;
  statusLabel: string;
  isOpen: boolean;
  onSwipeOpen: (taskId: string | null) => void;
  onToggle: () => void;
  onOpen: () => void;
  onRequestDelete: () => void;
}> = ({ task, projectName, statusLabel, isOpen, onSwipeOpen, onToggle, onOpen, onRequestDelete }) => {
  const [offset, setOffset] = useState(isOpen ? -SWIPE_DELETE_WIDTH : 0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef<number | null>(null);
  const startOffsetRef = useRef(0);
  const offsetRef = useRef(offset);
  const didDragRef = useRef(false);

  const setSwipeOffset = (next: number) => {
    offsetRef.current = next;
    setOffset(next);
  };

  useEffect(() => {
    setSwipeOffset(isOpen ? -SWIPE_DELETE_WIDTH : 0);
  }, [isOpen]);

  const finishDrag = () => {
    if (startXRef.current === null) return;
    const shouldOpen = offsetRef.current < -SWIPE_DELETE_WIDTH / 2;
    setSwipeOffset(shouldOpen ? -SWIPE_DELETE_WIDTH : 0);
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
    <div className="relative overflow-hidden rounded-2xl bg-rose-500">
      <button
        type="button"
        onClick={onRequestDelete}
        className="absolute inset-y-0 right-0 flex w-[88px] flex-col items-center justify-center gap-1 bg-rose-500 text-xs font-bold text-white active:bg-rose-600"
        aria-label={`Xóa việc ${task.title}`}
      >
        <Trash2 className="h-5 w-5" />
        Xóa
      </button>

      <div
        className={`relative z-10 flex min-h-[72px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm shadow-slate-200/30 ${
          dragging ? '' : 'transition-transform duration-200 ease-out'
        }`}
        style={{ transform: `translateX(${offset}px)`, touchAction: 'pan-y' }}
        onPointerDown={(event) => {
          startXRef.current = event.clientX;
          startOffsetRef.current = offsetRef.current;
          didDragRef.current = false;
          setDragging(true);
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (startXRef.current === null) return;
          const delta = event.clientX - startXRef.current;
          if (Math.abs(delta) > 6) didDragRef.current = true;
          const next = Math.max(-SWIPE_DELETE_WIDTH, Math.min(0, startOffsetRef.current + delta));
          setSwipeOffset(next);
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <button
          type="button"
          onClick={(event) => {
            if (blockClickAfterDrag(event)) return;
            onToggle();
          }}
          aria-label={task.status === 'done' ? 'Mở lại' : 'Hoàn thành'}
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${
            task.status === 'done'
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-300'
          }`}
        >
          {task.status === 'done' && <Check className="h-4 w-4" />}
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
          className="min-w-0 flex-1 py-3 text-left"
        >
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${priorityColor[task.priority]}`} />
            <p
              className={`truncate font-semibold ${
                task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'
              }`}
            >
              {task.title}
            </p>
          </div>
          <p className="mt-1 truncate text-xs text-slate-400">
            {[task.plannedDate, task.startTime, projectName || statusLabel].filter(Boolean).join(' · ')}
          </p>
        </button>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
      </div>
    </div>
  );
};

export const TasksView: React.FC = () => {
  const {
    tasks,
    projects,
    toggleTaskComplete,
    openTaskModal,
    addTask,
    addToast,
    addProject,
    deleteProject,
    deleteTask,
    calculateProjectProgress,
  } = useApp();
  const [filter, setFilter] = useState<Filter>('open');
  const [viewMode, setViewMode] = useState<ViewMode>('tasks');
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectCategory, setProjectCategory] = useState<'work' | 'personal'>('work');
  const [projectTargetDate, setProjectTargetDate] = useState('');
  const projectPlanInputRef = useRef<HTMLInputElement>(null);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);

  const visible = useMemo(
    () =>
      tasks
        .filter((task) => !projectFilter || task.projectId === projectFilter)
        .filter(
          (task) =>
            filter === 'all' ||
            (filter === 'done' ? task.status === 'done' : task.status !== 'done'),
        )
        .sort(
          (a, b) =>
            (a.plannedDate || '9999').localeCompare(b.plannedDate || '9999') ||
            (a.startTime || '99:99').localeCompare(b.startTime || '99:99'),
        ),
    [tasks, filter, projectFilter],
  );

  const projectNameById = (id?: string) => projects.find((project) => project.id === id)?.name;
  const selectedProject = projects.find((project) => project.id === projectFilter);
  const statusLabel: Record<TaskStatus, string> = {
    todo: 'Chưa làm',
    in_progress: 'Đang làm',
    waiting: 'Đang chờ',
    done: 'Hoàn thành',
    deferred: 'Để sau',
  };

  const createProject = (event: React.FormEvent) => {
    event.preventDefault();
    const name = projectName.trim();
    if (!name) return;

    addProject({
      name,
      category: projectCategory,
      targetDate: projectTargetDate || undefined,
    });
    setProjectName('');
    setProjectCategory('work');
    setProjectTargetDate('');
    setCreatingProject(false);
  };

  const openProjectTasks = (projectId: string) => {
    setProjectFilter(projectId);
    setFilter('open');
    setViewMode('tasks');
  };

  const importProjectPlan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProject) return;

    try {
      const importedTasks = parseProjectPlanFile(file.name, await file.text());
      for (const task of importedTasks) {
        addTask({
          ...task,
          projectId: selectedProject.id,
          category: selectedProject.category,
          status: 'todo',
        });
        // addTask currently builds ids from Date.now(); a tiny yield keeps bulk-import ids unique.
        await new Promise((resolve) => window.setTimeout(resolve, 2));
      }
      setFilter('open');
      addToast(`Đã nhập ${importedTasks.length} việc vào “${selectedProject.name}”`, 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Không thể đọc file lộ trình.', 'error');
    } finally {
      event.target.value = '';
    }
  };

  const openCount = tasks.filter((task) => task.status !== 'done').length;

  return (
    <div className="mx-auto min-w-0 w-full max-w-3xl overflow-x-hidden">
      <PageHeader
        title="Công việc"
        meta={viewMode === 'tasks' ? `${openCount} việc đang mở` : `${projects.length} dự án`}
        action={
          <button
            type="button"
            onClick={() => (viewMode === 'projects' ? setCreatingProject(true) : openTaskModal())}
            className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-600/20 transition active:scale-95"
            aria-label={viewMode === 'projects' ? 'Tạo dự án' : 'Thêm việc'}
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-2 rounded-2xl bg-slate-200/70 p-1">
        <button
          type="button"
          onClick={() => setViewMode('tasks')}
          className={`flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
            viewMode === 'tasks' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'
          }`}
        >
          <BriefcaseBusiness className="h-4 w-4" />
          Việc
        </button>
        <button
          type="button"
          onClick={() => setViewMode('projects')}
          className={`flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
            viewMode === 'projects' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'
          }`}
        >
          <FolderKanban className="h-4 w-4" />
          Dự án
        </button>
      </div>

      {viewMode === 'tasks' ? (
        <>
          {selectedProject ? (
            <div className="mb-4 min-w-0 space-y-2">
              <div className="flex min-h-11 min-w-0 items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3">
                <FolderKanban className="h-4 w-4 shrink-0 text-blue-600" />
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-blue-900">
                  {selectedProject.name}
                </p>
                <button
                  type="button"
                  onClick={() => setProjectFilter(null)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-blue-500 hover:bg-blue-100"
                  aria-label="Bỏ lọc dự án"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <input
                ref={projectPlanInputRef}
                type="file"
                accept=".ics,text/calendar,.json,application/json"
                onChange={importProjectPlan}
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
              />
              <button
                type="button"
                onClick={() => projectPlanInputRef.current?.click()}
                className="flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 text-sm font-semibold text-blue-700 shadow-sm active:scale-[0.99]"
              >
                <Upload className="h-4 w-4 shrink-0" />
                <span className="truncate">Nhập lộ trình</span>
                <span className="shrink-0 text-xs font-medium text-blue-400">.json / .ics</span>
              </button>
            </div>
          ) : null}

          <div className="mb-4 flex min-w-0 gap-1 rounded-xl bg-slate-200/70 p-1">
            {(
              [
                ['open', 'Đang làm'],
                ['done', 'Đã xong'],
                ['all', 'Tất cả'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition ${
                  filter === id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              title={selectedProject ? 'Dự án này chưa có công việc' : 'Không có công việc'}
              action={
                <button
                  type="button"
                  onClick={() => openTaskModal()}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Thêm việc đầu tiên
                </button>
              }
            />
          ) : (
            <div className="space-y-2">
              {visible.map((task) => (
                <SwipeTaskRow
                  key={task.id}
                  task={task}
                  projectName={projectNameById(task.projectId)}
                  statusLabel={statusLabel[task.status]}
                  isOpen={openSwipeId === task.id}
                  onSwipeOpen={setOpenSwipeId}
                  onToggle={() => toggleTaskComplete(task.id)}
                  onOpen={() => openTaskModal(task)}
                  onRequestDelete={() => setPendingDeleteTask(task)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <section>
          {creatingProject ? (
            <form
              onSubmit={createProject}
              className="mb-4 min-w-0 max-w-full overflow-hidden rounded-2xl border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/50"
            >
              <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-950">Tạo dự án</p>
                  <p className="mt-0.5 break-words text-xs text-slate-400">Chỉ cần tên, các thông tin khác có thể bổ sung sau.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatingProject(false)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500"
                  aria-label="Đóng"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <input
                autoFocus
                required
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Tên dự án"
                className="h-12 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />

              <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
                <select
                  value={projectCategory}
                  onChange={(event) => setProjectCategory(event.target.value as 'work' | 'personal')}
                  className="h-11 min-w-0 w-full max-w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
                >
                  <option value="work">Công việc</option>
                  <option value="personal">Cá nhân</option>
                </select>
                <label className="relative min-w-0 max-w-full overflow-hidden">
                  <CalendarDays className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    value={projectTargetDate}
                    onChange={(event) => setProjectTargetDate(event.target.value)}
                    aria-label="Hạn dự kiến"
                    className="h-11 min-w-0 w-full max-w-full rounded-xl border border-slate-200 pl-9 pr-2 text-xs font-medium text-slate-700 outline-none"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="mt-3 h-11 w-full rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm shadow-blue-600/20"
              >
                Tạo dự án
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreatingProject(true)}
              className="mb-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/60 text-sm font-semibold text-blue-700"
            >
              <Plus className="h-4 w-4" />
              Tạo dự án
            </button>
          )}

          {projects.length === 0 ? (
            <EmptyState
              title="Chưa có dự án"
              action={
                <button
                  type="button"
                  onClick={() => setCreatingProject(true)}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Tạo dự án đầu tiên
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const progress = calculateProjectProgress(project.id);
                const projectTasks = tasks.filter((task) => task.projectId === project.id);
                const remainingTasks = projectTasks.filter((task) => task.status !== 'done').length;

                return (
                  <article
                    key={project.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                        <FolderKanban className="h-5 w-5" />
                      </div>
                      <button
                        type="button"
                        onClick={() => openProjectTasks(project.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <h3 className="truncate font-bold text-slate-950">{project.name}</h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {remainingTasks} việc còn lại
                          {project.targetDate ? ` · Hạn ${project.targetDate}` : ''}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          deleteProject(project.id);
                          if (projectFilter === project.id) setProjectFilter(null);
                        }}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                        aria-label={`Xóa dự án ${project.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => openProjectTasks(project.id)}
                      className="mt-4 block w-full text-left"
                    >
                      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-400">Tiến độ</span>
                        <span className="tabular-nums text-slate-700">{progress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {pendingDeleteTask ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/35 px-5" role="dialog" aria-modal="true" aria-labelledby="delete-task-title">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <h2 id="delete-task-title" className="text-lg font-bold text-slate-950">Bạn có chắc muốn xóa việc này?</h2>
            <p className="mt-2 break-words text-sm leading-6 text-slate-500">“{pendingDeleteTask.title}” sẽ bị xóa khỏi tài khoản và các thiết bị đang đồng bộ.</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setPendingDeleteTask(null);
                  setOpenSwipeId(null);
                }}
                className="h-12 rounded-xl bg-slate-100 text-sm font-bold text-slate-600"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteTask(pendingDeleteTask.id);
                  setPendingDeleteTask(null);
                  setOpenSwipeId(null);
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
