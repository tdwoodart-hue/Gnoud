import { Task } from '../types';

export type TaskDateBucket = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'unscheduled';
export type TaskScope = 'all' | 'today' | 'week' | 'no-project' | `project:${string}`;

export interface CompactTaskBuckets {
  overdue: Task[];
  today: Task[];
  tomorrow: Task[];
  week: Task[];
  later: Task[];
  unscheduled: Task[];
}

export type CompactTaskRow =
  | { kind: 'task'; task: Task; sortKey: string }
  | { kind: 'project'; projectId: string; projectName: string; tasks: Task[]; sortKey: string };

const toUtcNoon = (isoDate: string) => new Date(`${isoDate}T12:00:00Z`);

export const addDaysIso = (isoDate: string, days: number) => {
  const value = toUtcNoon(isoDate);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

export const getTaskDate = (task: Pick<Task, 'plannedDate' | 'deadline'>) => task.plannedDate || task.deadline;

export const taskSortKey = (task: Pick<Task, 'plannedDate' | 'deadline' | 'startTime' | 'id'>) =>
  `${getTaskDate(task) || '9999-12-31'}|${task.startTime || '99:99'}|${task.id}`;

export const sortTasksChronologically = <T extends Pick<Task, 'plannedDate' | 'deadline' | 'startTime' | 'id'>>(items: T[]) =>
  [...items].sort((a, b) => taskSortKey(a).localeCompare(taskSortKey(b)));

export const getTaskDateBucket = (
  task: Pick<Task, 'plannedDate' | 'deadline'>,
  todayIso: string,
): TaskDateBucket => {
  const date = getTaskDate(task);
  if (!date) return 'unscheduled';
  if (date < todayIso) return 'overdue';
  if (date === todayIso) return 'today';
  if (date === addDaysIso(todayIso, 1)) return 'tomorrow';
  if (date <= addDaysIso(todayIso, 7)) return 'week';
  return 'later';
};

export const buildCompactTaskBuckets = (tasks: Task[], todayIso: string): CompactTaskBuckets => {
  const result: CompactTaskBuckets = {
    overdue: [],
    today: [],
    tomorrow: [],
    week: [],
    later: [],
    unscheduled: [],
  };

  sortTasksChronologically(tasks).forEach((task) => {
    result[getTaskDateBucket(task, todayIso)].push(task);
  });

  return result;
};

export const applyTaskScope = (tasks: Task[], scope: TaskScope, todayIso: string) => {
  const sorted = sortTasksChronologically(tasks);
  if (scope === 'all') return sorted;
  if (scope === 'today') return sorted.filter((task) => getTaskDate(task) === todayIso);
  if (scope === 'week') {
    const end = addDaysIso(todayIso, 7);
    return sorted.filter((task) => {
      const date = getTaskDate(task);
      return Boolean(date && date >= todayIso && date <= end);
    });
  }
  if (scope === 'no-project') return sorted.filter((task) => !task.projectId);
  if (scope.startsWith('project:')) {
    const projectId = scope.slice('project:'.length);
    return sorted.filter((task) => task.projectId === projectId);
  }
  return sorted;
};

export const bundleTasksByProject = (
  tasks: Task[],
  projectNames: Map<string, string>,
  minBundleSize = 2,
): CompactTaskRow[] => {
  const sorted = sortTasksChronologically(tasks);
  const grouped = new Map<string, Task[]>();

  sorted.forEach((task) => {
    if (!task.projectId) return;
    const current = grouped.get(task.projectId) || [];
    current.push(task);
    grouped.set(task.projectId, current);
  });

  const emitted = new Set<string>();
  const rows: CompactTaskRow[] = [];

  sorted.forEach((task) => {
    const projectId = task.projectId;
    const projectTasks = projectId ? grouped.get(projectId) || [] : [];
    const canBundle = Boolean(projectId && projectTasks.length >= minBundleSize);

    if (!canBundle) {
      rows.push({ kind: 'task', task, sortKey: taskSortKey(task) });
      return;
    }

    if (!projectId || emitted.has(projectId)) return;
    emitted.add(projectId);
    rows.push({
      kind: 'project',
      projectId,
      projectName: projectNames.get(projectId) || 'Dự án',
      tasks: projectTasks,
      sortKey: taskSortKey(projectTasks[0]),
    });
  });

  return rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
};
