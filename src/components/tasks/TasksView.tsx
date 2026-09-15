import React, { useMemo, useRef, useState } from 'react';
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
import { TaskStatus } from '../../types';
import { parseProjectPlanFile } from '../../services/taskDraft';
import { formatDisplayDate } from '../../data/mockData';
import { PageHeader } from '../common/PageHeader';
import { EmptyState } from '../common/EmptyState';

type Filter = 'open' | 'done' | 'all';
type ViewMode = 'tasks' | 'projects';

const priorityColor = {
  urgent: 'bg-rose-500',
  high: 'bg-amber-400',
  medium: 'bg-indigo-500',
  low: 'bg-slate-300',
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
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectCategory, setProjectCategory] = useState<'work' | 'personal'>('work');
  const [projectTargetDate, setProjectTargetDate] = useState('');
  const [pendingProjectDeleteId, setPendingProjectDeleteId] = useState<string | null>(null);
  const projectPlanInputRef = useRef<HTMLInputElement>(null);

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

      {/* Switcher ViewMode */}
      <div className="mb-5 grid grid-cols-2 rounded-2xl border border-slate-200/70 bg-slate-100/80 p-1">
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
            <div className="mb-4 min-w-0 space-y-2">
              <div className="flex min-h-12 min-w-0 items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4">
                <FolderKanban className="h-4 w-4 shrink-0 text-indigo-600" />
                <p className="min-w-0 flex-1 truncate text-sm font-bold text-indigo-950">
                  {selectedProject.name}
                </p>
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
                className="flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-white px-3 text-xs font-semibold text-indigo-700 shadow-xs transition hover:bg-indigo-50/50 active:scale-[0.99]"
              >
                <Upload className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Nhập lộ trình</span>
                <span className="shrink-0 text-[11px] font-medium text-indigo-400">.json / .ics</span>
              </button>
            </div>
          ) : null}

          <div className="mb-4 flex min-w-0 gap-1.5 rounded-2xl border border-slate-200/70 bg-slate-100/80 p-1">
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

          {visible.length === 0 ? (
            <EmptyState
              title={selectedProject ? 'Dự án này chưa có công việc' : 'Không có công việc'}
              description={
                selectedProject
                  ? 'Hãy thêm công việc đầu tiên để bắt đầu triển khai dự án này.'
                  : 'Danh sách công việc của bạn hiện đang trống.'
              }
              action={
                <button
                  type="button"
                  onClick={() => openTaskModal()}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
                >
                  Thêm việc đầu tiên
                </button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {visible.map((task) => (
                <div
                  key={task.id}
                  className="flex min-h-[72px] items-center gap-3.5 rounded-2xl border border-slate-200/70 bg-white px-4 shadow-xs transition hover:border-slate-300/80 hover:shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleTaskComplete(task.id)}
                    aria-label={task.status === 'done' ? 'Mở lại' : 'Hoàn thành'}
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl border-2 transition active:scale-95 ${
                      task.status === 'done'
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 hover:border-indigo-400'
                    }`}
                  >
                    {task.status === 'done' && <Check className="h-4 w-4 stroke-[3]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => openTaskModal(task)}
                    className="min-w-0 flex-1 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${priorityColor[task.priority]}`} />
                      <p
                        className={`truncate text-sm font-semibold sm:text-base ${
                          task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </p>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {[
                        formatDisplayDate(task.plannedDate),
                        task.startTime,
                        projectNameById(task.projectId) || statusLabel[task.status],
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </button>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </div>
              ))}
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

