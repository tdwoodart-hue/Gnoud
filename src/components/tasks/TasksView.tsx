import React, { useMemo, useRef, useState } from 'react';
import {
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
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
import {
  applyTaskScope,
  buildCompactTaskBuckets,
  getTaskDate,
  TaskScope,
} from '../../services/taskListLayout';
import { formatDisplayDate } from '../../data/mockData';
import { PageHeader } from '../common/PageHeader';
import { EmptyState } from '../common/EmptyState';
import {
  TASK_SWIPE_MAX_DISTANCE,
  TASK_SWIPE_START_THRESHOLD,
  resolveTaskSwipeRelease,
  shouldStartTaskSwipe,
} from '../../services/taskSwipe';

type Filter = 'open' | 'done' | 'all';
type ViewMode = 'tasks' | 'projects';

type TaskGroupProps = {
  title: string;
  tasks: Task[];
  projectNames: Map<string, string>;
  statusLabel: Record<TaskStatus, string>;
  toggleTaskComplete: (id: string) => void;
  openTaskModal: (task?: Task) => void;
  bundleKey: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  compactLimit?: number;
};

const priorityColor = {
  urgent: 'bg-rose-500',
  high: 'bg-amber-400',
  medium: 'bg-indigo-500',
  low: 'bg-slate-300',
};

const localIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TaskRow: React.FC<{
  task: Task;
  projectName?: string;
  statusLabel: Record<TaskStatus, string>;
  toggleTaskComplete: (id: string) => void;
  openTaskModal: (task?: Task) => void;
  nested?: boolean;
}> = ({ task, projectName, statusLabel, toggleTaskComplete, openTaskModal, nested = false }) => {
  const date = getTaskDate(task);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const offsetRef = useRef(0);
  const didDragRef = useRef(false);
  const isSwipingRef = useRef(false);

  const setSwipeOffset = (next: number) => {
    offsetRef.current = next;
    setOffset(next);
  };

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
    const action = resolveTaskSwipeRelease(offsetRef.current, velocityX);

    if (action === 'complete' && task.status !== 'done') {
      setSwipeOffset(TASK_SWIPE_MAX_DISTANCE);
      resetPointer();
      window.setTimeout(() => {
        toggleTaskComplete(task.id);
        setSwipeOffset(0);
      }, 120);
      return;
    }

    setSwipeOffset(0);
    resetPointer();
  };

  const cancelDrag = () => {
    setSwipeOffset(0);
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
    <div className={`relative overflow-hidden rounded-2xl ${nested ? 'ml-3' : ''}`}>
      <div className="pointer-events-none absolute inset-y-[1px] left-[1px] flex w-[180px] items-center rounded-l-[15px] bg-emerald-500 pl-6 text-white">
        <div className="flex items-center gap-2 text-xs font-bold">
          <Check className="h-5 w-5 stroke-[3]" />
          Xong
        </div>
      </div>

      <div
        className={`relative z-10 flex min-h-[58px] items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-3.5 shadow-xs hover:border-slate-300/80 hover:shadow-sm ${
          dragging ? '' : 'transition-transform duration-200 ease-out'
        } ${nested ? 'border-l-2 border-l-indigo-100 bg-slate-50/60 shadow-none' : ''}`}
        style={{ transform: `translateX(${offset}px)`, touchAction: 'pan-y' }}
        onPointerDown={(event) => {
          startXRef.current = event.clientX;
          startYRef.current = event.clientY;
          startTimeRef.current = performance.now();
          didDragRef.current = false;
          isSwipingRef.current = false;
        }}
        onPointerMove={(event) => {
          if (startXRef.current === null || startYRef.current === null) return;
          const deltaX = event.clientX - startXRef.current;
          const deltaY = event.clientY - startYRef.current;

          if (!isSwipingRef.current) {
            if (Math.abs(deltaY) >= TASK_SWIPE_START_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX)) {
              resetPointer();
              return;
            }
            if (!shouldStartTaskSwipe(deltaX, deltaY)) return;
            isSwipingRef.current = true;
            didDragRef.current = true;
            setDragging(true);
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }

          const maxRight = task.status === 'done' ? 0 : TASK_SWIPE_MAX_DISTANCE;
          setSwipeOffset(Math.max(0, Math.min(maxRight, deltaX)));
        }}
        onPointerUp={(event) => finishDrag(event.clientX)}
        onPointerCancel={cancelDrag}
      >
        <button
          type="button"
          onClick={(event) => {
            if (blockClickAfterDrag(event)) return;
            toggleTaskComplete(task.id);
          }}
          aria-label={task.status === 'done' ? 'Mở lại' : 'Hoàn thành'}
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition active:scale-95 ${
            task.status === 'done'
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-300 hover:border-indigo-400'
          }`}
        >
          {task.status === 'done' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
        </button>

        <button
          type="button"
          onClick={(event) => {
            if (blockClickAfterDrag(event)) return;
            openTaskModal(task);
          }}
          className="min-w-0 flex-1 py-2.5 text-left"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${priorityColor[task.priority]}`} />
            <p
              className={`truncate text-sm font-semibold ${
                task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'
              }`}
            >
              {task.title}
            </p>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">
            {[date ? formatDisplayDate(date) : '', task.startTime, projectName || statusLabel[task.status]]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </button>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
      </div>
    </div>
  );
};

const TaskGroup: React.FC<TaskGroupProps> = ({
  title,
  tasks,
  projectNames,
  statusLabel,
  toggleTaskComplete,
  openTaskModal,
  bundleKey,
  collapsible = false,
  defaultCollapsed = false,
  compactLimit = 6,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [showAll, setShowAll] = useState(false);
  const rows = tasks;

  if (tasks.length === 0) return null;

  if (collapsible && collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 text-left transition hover:bg-white hover:shadow-xs"
      >
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-200/70 text-slate-500">
          <ChevronRight className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{title}</p>
          <p className="mt-0.5 text-xs text-slate-400">{tasks.length} việc đã lên lịch · bấm để xem</p>
        </div>
      </button>
    );
  }

  const visibleRows = showAll ? rows : rows.slice(0, compactLimit);
  const hiddenRows = Math.max(0, rows.length - visibleRows.length);

  return (
    <section className="space-y-2">
      <div className="flex min-h-7 items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{title}</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-400">
            {tasks.length}
          </span>
        </div>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700"
          >
            Thu gọn <ChevronDown className="h-3.5 w-3.5 rotate-180" />
          </button>
        ) : null}
      </div>

      <div className="space-y-2">
        {visibleRows.map((task) => (
          <TaskRow
            key={`${bundleKey}-task-${task.id}`}
            task={task}
            projectName={task.projectId ? projectNames.get(task.projectId) : undefined}
            statusLabel={statusLabel}
            toggleTaskComplete={toggleTaskComplete}
            openTaskModal={openTaskModal}
          />
        ))}
      </div>

      {hiddenRows > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="h-10 w-full rounded-xl border border-dashed border-slate-200 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Xem thêm {hiddenRows} việc
        </button>
      ) : showAll && rows.length > compactLimit ? (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="h-9 w-full text-xs font-semibold text-slate-400 hover:text-slate-700"
        >
          Thu gọn danh sách
        </button>
      ) : null}
    </section>
  );
};

export const TasksView: React.FC = () => {
  const {
    tasks,
    projects,
    toggleTaskComplete,
    openTaskModal,
    addTasks,
    addToast,
    addProject,
    deleteProject,
    calculateProjectProgress,
  } = useApp();

  const [filter, setFilter] = useState<Filter>('open');
  const [viewMode, setViewMode] = useState<ViewMode>('tasks');
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [scope, setScope] = useState<TaskScope>('all');
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectCategory, setProjectCategory] = useState<'work' | 'personal'>('work');
  const [projectTargetDate, setProjectTargetDate] = useState('');
  const [pendingProjectDeleteId, setPendingProjectDeleteId] = useState<string | null>(null);
  const projectPlanInputRef = useRef<HTMLInputElement>(null);
  const todayIso = localIsoDate();

  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const statusFiltered = useMemo(
    () =>
      tasks.filter(
        (task) =>
          filter === 'all' ||
          (filter === 'done' ? task.status === 'done' : task.status !== 'done'),
      ),
    [tasks, filter],
  );

  const visible = useMemo(() => {
    const projectScoped = projectFilter
      ? statusFiltered.filter((task) => task.projectId === projectFilter)
      : statusFiltered;
    return projectFilter ? projectScoped : applyTaskScope(projectScoped, scope, todayIso);
  }, [statusFiltered, projectFilter, scope, todayIso]);

  const buckets = useMemo(() => buildCompactTaskBuckets(visible, todayIso), [visible, todayIso]);
  const selectedProject = projects.find((project) => project.id === projectFilter);
  const pendingProjectTaskCount = pendingProjectDeleteId
    ? tasks.filter((task) => task.projectId === pendingProjectDeleteId).length
    : 0;

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
    setScope('all');
    setFilter('open');
    setViewMode('tasks');
  };

  const importProjectPlan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProject) return;

    try {
      const importedTasks = parseProjectPlanFile(file.name, await file.text());
      addTasks(
        importedTasks.map((task) => ({
          ...task,
          projectId: selectedProject.id,
          category: selectedProject.category,
          status: 'todo',
        })),
      );
      setFilter('open');
      addToast(`Đã nhập ${importedTasks.length} việc vào “${selectedProject.name}”`, 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Không thể đọc file lộ trình.', 'error');
    } finally {
      event.target.value = '';
    }
  };

  const openCount = tasks.filter((task) => task.status !== 'done').length;
  const scopeOptions: Array<{ id: TaskScope; label: string }> = [
    { id: 'all', label: 'Tất cả' },
    { id: 'today', label: 'Hôm nay' },
    { id: 'week', label: '7 ngày' },
    ...projects.map((project) => ({ id: `project:${project.id}` as TaskScope, label: project.name })),
    { id: 'no-project', label: 'Không dự án' },
  ];

  const groupProps = {
    projectNames,
    statusLabel,
    toggleTaskComplete,
    openTaskModal,
  };

  return (
    <div className="mx-auto min-w-0 w-full max-w-3xl overflow-x-hidden">
      <PageHeader
        title="Công việc"
        meta={viewMode === 'tasks' ? `${openCount} việc đang mở` : `${projects.length} dự án`}
        action={
          <button
            type="button"
            onClick={() => (viewMode === 'projects' ? setCreatingProject(true) : openTaskModal())}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-600 text-white shadow-xs transition hover:bg-indigo-700 active:scale-95"
            aria-label={viewMode === 'projects' ? 'Tạo dự án' : 'Thêm việc'}
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 rounded-2xl border border-slate-200/70 bg-slate-100/80 p-1">
        <button
          type="button"
          onClick={() => setViewMode('tasks')}
          className={`flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all ${
            viewMode === 'tasks'
              ? 'border border-slate-200/50 bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BriefcaseBusiness className="h-4 w-4" />
          Việc
        </button>
        <button
          type="button"
          onClick={() => setViewMode('projects')}
          className={`flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all ${
            viewMode === 'projects'
              ? 'border border-slate-200/50 bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FolderKanban className="h-4 w-4" />
          Dự án
        </button>
      </div>

      {viewMode === 'tasks' ? (
        <>
          {selectedProject ? (
            <div className="mb-3 min-w-0 space-y-2">
              <div className="flex min-h-11 min-w-0 items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4">
                <FolderKanban className="h-4 w-4 shrink-0 text-indigo-600" />
                <p className="min-w-0 flex-1 truncate text-sm font-bold text-indigo-950">{selectedProject.name}</p>
                <button
                  type="button"
                  onClick={() => setProjectFilter(null)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-indigo-500 transition hover:bg-indigo-100/80"
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
                className="flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-white px-3 text-xs font-semibold text-indigo-700 shadow-xs transition hover:bg-indigo-50/50 active:scale-[0.99]"
              >
                <Upload className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Nhập lộ trình</span>
                <span className="shrink-0 text-[11px] font-medium text-indigo-400">.json / .ics</span>
              </button>
            </div>
          ) : null}

          <div className="mb-3 flex min-w-0 gap-1.5 rounded-2xl border border-slate-200/70 bg-slate-100/80 p-1">
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
                className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                  filter === id
                    ? 'border border-indigo-100/70 bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {!selectedProject ? (
            <div className="-mx-1 mb-4 overflow-x-auto px-1 pb-1">
              <div className="flex w-max min-w-full gap-2">
                {scopeOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setScope(option.id)}
                    className={`h-8 max-w-[180px] shrink-0 truncate rounded-full px-3 text-[11px] font-semibold transition ${
                      scope === option.id
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {visible.length === 0 ? (
            <EmptyState
              title={selectedProject ? 'Dự án này chưa có công việc' : 'Không có công việc'}
              description={
                selectedProject
                  ? 'Hãy thêm công việc đầu tiên để bắt đầu triển khai dự án này.'
                  : 'Không có việc phù hợp với bộ lọc hiện tại.'
              }
              action={
                <button
                  type="button"
                  onClick={() => openTaskModal()}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
                >
                  Thêm việc
                </button>
              }
            />
          ) : (
            <div className="space-y-5">
              <TaskGroup title="Quá hạn" tasks={buckets.overdue} bundleKey="overdue" {...groupProps} />
              <TaskGroup title="Hôm nay" tasks={buckets.today} bundleKey="today" {...groupProps} />
              <TaskGroup title="Ngày mai" tasks={buckets.tomorrow} bundleKey="tomorrow" {...groupProps} />
              <TaskGroup title="7 ngày tới" tasks={buckets.week} bundleKey="week" {...groupProps} />
              <TaskGroup title="Chưa xếp lịch" tasks={buckets.unscheduled} bundleKey="unscheduled" {...groupProps} />
              <TaskGroup
                title="Sau đó"
                tasks={buckets.later}
                bundleKey="later"
                collapsible
                defaultCollapsed
                compactLimit={5}
                {...groupProps}
              />
            </div>
          )}
        </>
      ) : (
        <section>
          {creatingProject ? (
            <form
              onSubmit={createProject}
              className="mb-5 min-w-0 max-w-full overflow-hidden rounded-3xl border border-indigo-100 bg-white p-5 shadow-xs sm:p-6"
            >
              <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">Tạo dự án mới</p>
                  <p className="mt-0.5 break-words text-xs text-slate-400">Chỉ cần tên, các thông tin khác có thể bổ sung sau.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatingProject(false)}
                  className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200/70"
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
                className="h-12 w-full rounded-2xl border border-slate-200/80 px-4 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
              />

              <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2.5">
                <select
                  value={projectCategory}
                  onChange={(event) => setProjectCategory(event.target.value as 'work' | 'personal')}
                  className="h-11 min-w-0 w-full max-w-full rounded-2xl border border-slate-200/80 bg-white px-3.5 text-xs font-semibold text-slate-700 outline-none"
                >
                  <option value="work">Công việc</option>
                  <option value="personal">Cá nhân</option>
                </select>
                <label className="relative min-w-0 max-w-full overflow-hidden">
                  <CalendarDays className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    lang="vi-VN"
                    value={projectTargetDate}
                    onChange={(event) => setProjectTargetDate(event.target.value)}
                    aria-label="Hạn dự kiến"
                    className="h-11 min-w-0 w-full max-w-full rounded-2xl border border-slate-200/80 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="mt-4 h-11 w-full rounded-2xl bg-indigo-600 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700"
              >
                Tạo dự án
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreatingProject(true)}
              className="mb-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-200/90 bg-indigo-50/40 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50/80"
            >
              <Plus className="h-4 w-4" />
              Tạo dự án
            </button>
          )}

          {projects.length === 0 ? (
            <EmptyState
              title="Chưa có dự án nào"
              description="Dự án giúp bạn gom các công việc liên quan vào cùng một mục tiêu lớn."
              action={
                <button
                  type="button"
                  onClick={() => setCreatingProject(true)}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
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
                    className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs transition hover:border-slate-300/80 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-indigo-100 bg-indigo-50/80 text-indigo-600">
                        <FolderKanban className="h-5 w-5" />
                      </div>
                      <button
                        type="button"
                        onClick={() => openProjectTasks(project.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <h3 className="truncate text-base font-bold text-slate-900">{project.name}</h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {remainingTasks} việc còn lại
                          {project.targetDate ? ` · Hạn ${formatDisplayDate(project.targetDate)}` : ''}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingProjectDeleteId(project.id)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
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
                        <span className="tabular-nums text-indigo-600">{progress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-indigo-600 transition-all duration-300"
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

      {pendingProjectDeleteId ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/30 px-5 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Xóa dự án?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {pendingProjectTaskCount > 0
                ? `Xóa dự án này và ${pendingProjectTaskCount} công việc bên trong? Các công việc sẽ được chuyển vào Thùng rác.`
                : 'Dự án này không có công việc. Bạn có chắc muốn xóa?'}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingProjectDeleteId(null)}
                className="h-11 rounded-xl border border-slate-200/70 bg-slate-100/80 text-sm font-bold text-slate-600 transition hover:bg-slate-200/70"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProject(pendingProjectDeleteId);
                  if (projectFilter === pendingProjectDeleteId) setProjectFilter(null);
                  setPendingProjectDeleteId(null);
                }}
                className="h-11 rounded-xl bg-rose-600 text-sm font-bold text-white shadow-xs transition hover:bg-rose-700 active:bg-rose-800"
              >
                Xóa dự án
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
