import type { CalendarEvent, Goal, Habit, Project, Task } from '../types';
import type { TelemetrySnapshot } from './usageTelemetry';

export interface ChatGPTSnapshotInput {
  tasks: Task[];
  projects: Project[];
  calendarEvents: CalendarEvent[];
  habits: Habit[];
  goals: Goal[];
  telemetry: TelemetrySnapshot;
  now?: Date;
}

const round = (value: number, digits = 1): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const safeDate = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isWithinPastDays = (value: string | undefined, days: number, now: Date): boolean => {
  const date = safeDate(value);
  if (!date) return false;
  const diff = now.getTime() - date.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
};

const average = (values: number[]): number =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const localDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const countBy = <T>(items: T[], key: (item: T) => string): Record<string, number> =>
  items.reduce<Record<string, number>>((counts, item) => {
    const value = key(item) || 'unknown';
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});

export const buildChatGPTSnapshot = ({
  tasks,
  projects,
  calendarEvents,
  habits,
  goals,
  telemetry,
  now = new Date(),
}: ChatGPTSnapshotInput) => {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const completedTasks = tasks.filter((task) => task.status === 'done');
  const openTasks = tasks.filter((task) => task.status !== 'done');
  const completedWithTiming = completedTasks.filter(
    (task) => task.estimatedMinutes > 0 && task.actualMinutes > 0,
  );
  const tasksCreated30d = tasks.filter((task) => isWithinPastDays(task.createdAt, 30, now)).length;
  const tasksCompleted30d = completedTasks.filter((task) => isWithinPastDays(task.completedAt, 30, now)).length;
  const today = localDateKey(now);
  const overdueOpenTasks = openTasks.filter((task) => task.deadline && task.deadline < today).length;

  const usageCounts = countBy(telemetry.events, (event) => event.name);
  const recentEvents = [...telemetry.events].slice(-100);
  const recentErrors = [...telemetry.errors].slice(-20);

  const exportedTasks = [...tasks]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 120)
    .map((task) => ({
      title: task.title,
      project: task.projectId ? projectById.get(task.projectId)?.name || null : null,
      category: task.category,
      status: task.status,
      priority: task.priority,
      plannedDate: task.plannedDate || null,
      startTime: task.startTime || null,
      deadline: task.deadline || null,
      estimatedMinutes: task.estimatedMinutes,
      actualMinutes: task.actualMinutes,
      subtaskCount: task.subtasks.length,
      completedSubtaskCount: task.subtasks.filter((subtask) => subtask.completed).length,
      isTopPriority: Boolean(task.isTopPriority),
      recurrence: task.recurrence || 'none',
      createdAt: task.createdAt,
      completedAt: task.completedAt || null,
    }));

  const exportedProjects = projects.map((project) => {
    const relatedTasks = tasks.filter((task) => task.projectId === project.id);
    const done = relatedTasks.filter((task) => task.status === 'done').length;
    return {
      name: project.name,
      category: project.category,
      targetDate: project.targetDate || null,
      totalTasks: relatedTasks.length,
      completedTasks: done,
      completionRate: relatedTasks.length ? round((done / relatedTasks.length) * 100, 0) : 0,
      milestones: {
        total: project.milestones.length,
        completed: project.milestones.filter((milestone) => milestone.completed).length,
      },
    };
  });

  const exportedHabits = habits.map((habit) => ({
    name: habit.name,
    category: habit.category || null,
    targetDaysPerWeek: habit.targetDaysPerWeek || null,
    preferredTime: habit.preferredTime || habit.targetTime || null,
    durationMinutes: habit.durationMinutes,
    streak: habit.streak,
    bestStreak: habit.bestStreak || null,
    completedLast30Days: habit.completedDates.filter((date) => isWithinPastDays(date, 30, now)).length,
  }));

  const exportedGoals = goals.map((goal) => ({
    title: goal.title,
    type: goal.type || goal.category || null,
    targetDate: goal.targetDate,
    progress: goal.progress,
    keyResults: goal.keyResults.map((result) => ({
      title: result.title,
      current: result.current,
      target: result.target,
      unit: result.unit,
    })),
  }));

  const exportedCalendar = [...calendarEvents]
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
    .slice(-120)
    .map((event) => ({
      title: event.title,
      type: event.type,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      project: event.projectId ? projectById.get(event.projectId)?.name || null : null,
      linkedToTask: Boolean(event.taskId),
    }));

  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    purpose: 'Filtered Gnoud snapshot for product/UX analysis in ChatGPT.',
    privacy: {
      mode: 'filtered',
      localTelemetryOnly: true,
      excludedFields: [
        'firebase uid',
        'email',
        'auth tokens',
        'push tokens',
        'task descriptions',
        'task notes',
        'subtask titles',
        'project descriptions',
        'calendar locations',
        'calendar descriptions',
      ],
    },
    summary: {
      totalTasks: tasks.length,
      openTasks: openTasks.length,
      completedTasks: completedTasks.length,
      completionRate: tasks.length ? round((completedTasks.length / tasks.length) * 100, 0) : 0,
      tasksCreated30d,
      tasksCompleted30d,
      overdueOpenTasks,
      topPriorityOpenTasks: openTasks.filter((task) => task.isTopPriority).length,
      averageEstimatedMinutes: round(average(tasks.map((task) => task.estimatedMinutes)), 1),
      averageActualMinutes: round(average(completedTasks.map((task) => task.actualMinutes).filter((value) => value > 0)), 1),
      averageEstimateAccuracyRatio: round(
        average(completedWithTiming.map((task) => task.actualMinutes / task.estimatedMinutes)),
        2,
      ),
      totalProjects: projects.length,
      totalHabits: habits.length,
      totalGoals: goals.length,
      totalCalendarEvents: calendarEvents.length,
    },
    patterns: {
      tasksByStatus: countBy(tasks, (task) => task.status),
      tasksByPriority: countBy(tasks, (task) => task.priority),
      tasksByCategory: countBy(tasks, (task) => task.category),
      calendarByType: countBy(calendarEvents, (event) => event.type),
    },
    usage: {
      counts: usageCounts,
      recentEvents,
    },
    diagnostics: {
      errorCount: telemetry.errors.length,
      recentErrors,
    },
    projects: exportedProjects,
    tasks: exportedTasks,
    calendar: exportedCalendar,
    habits: exportedHabits,
    goals: exportedGoals,
    analysisGuide: [
      'Find features that are rarely used or create repeated friction.',
      'Compare estimated vs actual task duration and identify planning bias.',
      'Look for overloaded days, recurring overdue work, and scheduling gaps.',
      'Suggest UX simplifications based on usage events and error patterns.',
      'Do not infer sensitive personal traits from task titles or schedules.',
    ],
  };
};

export const downloadChatGPTSnapshot = (snapshot: ReturnType<typeof buildChatGPTSnapshot>): string => {
  const date = localDateKey(new Date(snapshot.generatedAt));
  const filename = `gnoud-chatgpt-snapshot-${date}.json`;
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return filename;
};
