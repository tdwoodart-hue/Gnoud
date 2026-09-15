import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  CalendarEvent,
  Goal,
  Habit,
  LifeMetric,
  NavTab,
  Project,
  Task,
} from '../types';
import {
  INITIAL_CALENDAR_EVENTS,
  INITIAL_GOALS,
  INITIAL_HABITS,
  INITIAL_LIFE_METRICS,
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  getFormattedToday,
} from '../data/mockData';
import { auth, googleProvider } from '../lib/firebase';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { authErrorMessage, shouldUseRedirect } from '../services/authFlow';
import { firestoreService, type DeletedTask } from '../services/firestoreService';
import { syncNotificationTasks } from '../services/notificationService';
import { createTaskDraft } from '../services/taskDraft';
import { installGlobalErrorTelemetry, recordUsageEvent } from '../services/usageTelemetry';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  actionLabel?: string;
  onAction?: () => void;
}

interface AppContextType {
  user: FirebaseUser | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  currentView: string;
  setCurrentView: (view: string) => void;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isCommandMenuOpen: boolean;
  setIsCommandMenuOpen: (open: boolean) => void;
  isMorningPlanningOpen: boolean;
  setIsMorningPlanningOpen: (open: boolean) => void;
  isEveningReviewOpen: boolean;
  setIsEveningReviewOpen: (open: boolean) => void;
  openTaskModal: (task?: Task) => void;
  openFocusSession: (task: Task) => void;
  tasks: Task[];
  trashTasks: DeletedTask[];
  projects: Project[];
  calendarEvents: CalendarEvent[];
  habits: Habit[];
  goals: Goal[];
  lifeMetrics: LifeMetric[];
  addTask: (taskData: Partial<Task>) => Task;
  addTasks: (taskDataList: Partial<Task>[]) => Task[];
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  restoreTask: (id: string) => void;
  permanentlyDeleteTask: (id: string) => void;
  toggleTaskComplete: (id: string) => void;
  toggleTopPriority: (id: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string, estimatedMinutes?: number) => void;
  addProject: (proj: Partial<Project>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  toggleMilestone: (projectId: string, milestoneId: string) => void;
  calculateProjectProgress: (projectId: string) => number;
  addCalendarEvent: (event: Partial<CalendarEvent>) => CalendarEvent;
  updateCalendarEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;
  scheduleTaskIntoCalendar: (taskId: string, date: string, startTime: string, durationMinutes?: number) => void;
  toggleHabitForDate: (habitId: string, date: string) => void;
  addHabit: (habit: Partial<Habit>) => Habit;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  addGoal: (goal: Partial<Goal>) => Goal;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  focusTask: Task | null;
  isFocusRunning: boolean;
  focusSecondsLeft: number;
  focusTotalSeconds: number;
  startFocusSession: (task: Task, minutes?: number) => void;
  pauseFocusSession: () => void;
  resumeFocusSession: () => void;
  stopFocusSession: (markComplete?: boolean) => void;
  editingTask: Task | null;
  setEditingTask: (task: Task | null) => void;
  toasts: ToastMessage[];
  addToast: (
    message: string,
    type?: 'info' | 'success' | 'warning' | 'error',
    action?: { label: string; onClick: () => void },
  ) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY_PREFIX = 'lich_song_';
const DEMO_DATA_REMOVED_KEY = 'lich_song_demo_data_removed_v1';
const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const cascadeProjectDeletion = (
  projectId: string,
  projects: Project[],
  tasks: Task[],
  trashTasks: DeletedTask[],
  calendarEvents: CalendarEvent[],
  deletedAt: string,
) => {
  const projectTasks = tasks.filter((task) => task.projectId === projectId);
  const projectTaskIds = new Set(projectTasks.map((task) => task.id));
  const deletedRecords: DeletedTask[] = projectTasks.map((task) => ({ ...task, deletedAt }));

  return {
    projects: projects.filter((project) => project.id !== projectId),
    tasks: tasks.filter((task) => task.projectId !== projectId),
    trashTasks: [
      ...deletedRecords,
      ...trashTasks.filter((task) => !projectTaskIds.has(task.id)),
    ],
    calendarEvents: calendarEvents.filter(
      (event) => event.projectId !== projectId && !(event.taskId && projectTaskIds.has(event.taskId)),
    ),
    affectedTaskCount: projectTasks.length,
  };
};

function removeCachedDemoData(): void {
  try {
    if (localStorage.getItem(DEMO_DATA_REMOVED_KEY)) return;
    ['tasks', 'projects', 'events', 'habits', 'goals', 'life_metrics'].forEach((key) => {
      localStorage.removeItem(STORAGE_KEY_PREFIX + key);
    });
    localStorage.setItem(DEMO_DATA_REMOVED_KEY, 'true');
  } catch (error) {
    console.warn('Could not clear cached demo data:', error);
  }
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (error) {
    console.error(`Error loading ${key} from storage:`, error);
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
}

type SyncEntity = { id: string };

function sameEntities<T extends SyncEntity>(left: T[], right: T[]): boolean {
  if (left.length !== right.length) return false;
  const normalize = (items: T[]) => [...items].sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

function withoutSeed<T extends SyncEntity>(items: T[], seed: T[]): T[] {
  const seedIds = new Set(seed.map((item) => item.id));
  return items.filter((item) => !seedIds.has(item.id));
}

async function syncEntityDiff<T extends SyncEntity>(
  userId: string,
  previous: T[],
  next: T[],
  save: (userId: string, item: T) => Promise<void>,
  remove: (userId: string, id: string) => Promise<void>,
): Promise<void> {
  const previousById = new Map(previous.map((item) => [item.id, item]));
  const nextById = new Map(next.map((item) => [item.id, item]));
  const writes: Promise<void>[] = [];

  next.forEach((item) => {
    const before = previousById.get(item.id);
    if (!before || JSON.stringify(before) !== JSON.stringify(item)) {
      writes.push(save(userId, item));
    }
  });
  previous.forEach((item) => {
    if (!nextById.has(item.id)) writes.push(remove(userId, item.id));
  });

  await Promise.all(writes);
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  removeCachedDemoData();

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [currentView, setCurrentView] = useState<string>('today');
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const [isMorningPlanningOpen, setIsMorningPlanningOpen] = useState(false);
  const [isEveningReviewOpen, setIsEveningReviewOpen] = useState(false);

  const [tasks, setTasks] = useState<Task[]>(() => loadFromStorage('tasks', INITIAL_TASKS));
  const [trashTasks, setTrashTasks] = useState<DeletedTask[]>(() => loadFromStorage('deleted_tasks', []));
  const [projects, setProjects] = useState<Project[]>(() => loadFromStorage('projects', INITIAL_PROJECTS));
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() =>
    loadFromStorage('events', INITIAL_CALENDAR_EVENTS),
  );
  const [habits, setHabits] = useState<Habit[]>(() => loadFromStorage('habits', INITIAL_HABITS));
  const [goals, setGoals] = useState<Goal[]>(() => loadFromStorage('goals', INITIAL_GOALS));
  const [lifeMetrics] = useState<LifeMetric[]>(() => loadFromStorage('life_metrics', INITIAL_LIFE_METRICS));

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [isFocusRunning, setIsFocusRunning] = useState(false);
  const [focusSecondsLeft, setFocusSecondsLeft] = useState(25 * 60);
  const [focusTotalSeconds, setFocusTotalSeconds] = useState(25 * 60);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const cloudReadyRef = useRef(false);
  const tasksSyncRef = useRef<Task[]>(tasks);
  const trashTasksSyncRef = useRef<DeletedTask[]>(trashTasks);
  const projectsSyncRef = useRef<Project[]>(projects);
  const eventsSyncRef = useRef<CalendarEvent[]>(calendarEvents);
  const habitsSyncRef = useRef<Habit[]>(habits);
  const goalsSyncRef = useRef<Goal[]>(goals);

  useEffect(() => {
    recordUsageEvent('app_opened');
    return installGlobalErrorTelemetry();
  }, []);

  const changeCurrentView = useCallback((view: string) => {
    setCurrentView(view);
    recordUsageEvent('navigation_changed', { view });
  }, []);

  const openTaskModal = useCallback((task?: Task) => {
    recordUsageEvent('task_form_opened', { mode: task ? 'edit' : 'create' });
    setEditingTask(task || createTaskDraft(getFormattedToday(0)));
  }, []);

  const addToast = useCallback((
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    action?: { label: string; onClick: () => void },
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts([{
      id,
      message,
      type,
      actionLabel: action?.label,
      onAction: action?.onClick,
    }]);
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, action ? 6000 : 3200);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => { saveToStorage('tasks', tasks); }, [tasks]);
  useEffect(() => { saveToStorage('deleted_tasks', trashTasks); }, [trashTasks]);
  useEffect(() => { saveToStorage('projects', projects); }, [projects]);
  useEffect(() => { saveToStorage('events', calendarEvents); }, [calendarEvents]);
  useEffect(() => { saveToStorage('habits', habits); }, [habits]);
  useEffect(() => { saveToStorage('goals', goals); }, [goals]);

  useEffect(() => {
    const sync = () => void syncNotificationTasks(tasks).catch((error) => {
      console.warn('Could not sync notification schedule:', error);
    });
    sync();
    window.addEventListener('lich-song-notifications-enabled', sync);
    return () => window.removeEventListener('lich-song-notifications-enabled', sync);
  }, [tasks]);

  useEffect(() => {
    void getRedirectResult(auth)
      .then((result) => {
        if (result?.user) addToast('Đăng nhập Google thành công', 'success');
      })
      .catch((error) => {
        console.warn('Redirect sign-in error:', error);
        addToast(authErrorMessage(error), 'error');
      });
  }, [addToast]);

  useEffect(() => {
    let unsubscribeCloud: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      unsubscribeCloud?.();
      unsubscribeCloud = null;
      cloudReadyRef.current = false;
      setUser(currentUser);

      if (!currentUser) return;

      try {
        await firestoreService.removeDemoData(currentUser.uid);
        const cloud = await firestoreService.fetchUserData(currentUser.uid);

        if (cloud) {
          const cloudHasData =
            cloud.tasks.length + cloud.deletedTasks.length + cloud.projects.length + cloud.events.length +
            cloud.goals.length + cloud.habits.length > 0;

          if (!cloudHasData) {
            const localSnapshot = {
              tasks: withoutSeed(tasks, INITIAL_TASKS),
              deletedTasks: trashTasks,
              projects: withoutSeed(projects, INITIAL_PROJECTS),
              events: withoutSeed(calendarEvents, INITIAL_CALENDAR_EVENTS),
              goals: withoutSeed(goals, INITIAL_GOALS),
              habits: withoutSeed(habits, INITIAL_HABITS),
            };
            const localHasData = Object.values(localSnapshot).some((items) => items.length > 0);
            if (localHasData) await firestoreService.mergeUserData(currentUser.uid, localSnapshot);
          }
        }

        unsubscribeCloud = firestoreService.subscribeUserData(
          currentUser.uid,
          (data) => {
            if (!sameEntities(tasksSyncRef.current, data.tasks)) {
              tasksSyncRef.current = data.tasks;
              setTasks(data.tasks);
            }
            if (!sameEntities(trashTasksSyncRef.current, data.deletedTasks)) {
              trashTasksSyncRef.current = data.deletedTasks;
              setTrashTasks(data.deletedTasks);
            }
            if (!sameEntities(projectsSyncRef.current, data.projects)) {
              projectsSyncRef.current = data.projects;
              setProjects(data.projects);
            }
            if (!sameEntities(eventsSyncRef.current, data.events)) {
              eventsSyncRef.current = data.events;
              setCalendarEvents(data.events);
            }
            if (!sameEntities(goalsSyncRef.current, data.goals)) {
              goalsSyncRef.current = data.goals;
              setGoals(data.goals);
            }
            if (!sameEntities(habitsSyncRef.current, data.habits)) {
              habitsSyncRef.current = data.habits;
              setHabits(data.habits);
            }
            cloudReadyRef.current = true;
          },
          () => addToast('Mất kết nối đồng bộ. Dữ liệu vẫn được giữ trên thiết bị.', 'warning'),
        );
      } catch (error) {
        console.warn('Could not start Firestore sync:', error);
        addToast('Không thể đồng bộ tài khoản lúc này.', 'error');
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeCloud?.();
    };
  }, []);

  useEffect(() => {
    if (!user || !cloudReadyRef.current || sameEntities(tasksSyncRef.current, tasks)) return;
    void firestoreService.syncTasks(user.uid, tasksSyncRef.current, tasks);
  }, [tasks, user]);

  useEffect(() => {
    if (!user || !cloudReadyRef.current || sameEntities(trashTasksSyncRef.current, trashTasks)) return;
    void syncEntityDiff(
      user.uid,
      trashTasksSyncRef.current,
      trashTasks,
      firestoreService.saveDeletedTask,
      firestoreService.deleteDeletedTask,
    );
  }, [trashTasks, user]);

  useEffect(() => {
    if (!user || !cloudReadyRef.current || sameEntities(projectsSyncRef.current, projects)) return;
    void syncEntityDiff(user.uid, projectsSyncRef.current, projects, firestoreService.saveProject, firestoreService.deleteProject);
  }, [projects, user]);

  useEffect(() => {
    if (!user || !cloudReadyRef.current || sameEntities(eventsSyncRef.current, calendarEvents)) return;
    void syncEntityDiff(
      user.uid,
      eventsSyncRef.current,
      calendarEvents,
      firestoreService.saveCalendarEvent,
      firestoreService.deleteCalendarEvent,
    );
  }, [calendarEvents, user]);

  useEffect(() => {
    if (!user || !cloudReadyRef.current || sameEntities(habitsSyncRef.current, habits)) return;
    void syncEntityDiff(user.uid, habitsSyncRef.current, habits, firestoreService.saveHabit, firestoreService.deleteHabit);
  }, [habits, user]);

  useEffect(() => {
    if (!user || !cloudReadyRef.current || sameEntities(goalsSyncRef.current, goals)) return;
    void syncEntityDiff(user.uid, goalsSyncRef.current, goals, firestoreService.saveGoal, firestoreService.deleteGoal);
  }, [goals, user]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandMenuOpen((previous) => !previous);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      if (shouldUseRedirect(navigator.userAgent, standalone)) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      await signInWithPopup(auth, googleProvider);
      addToast('Đăng nhập Google thành công', 'success');
    } catch (error) {
      console.warn('Sign-in error:', error);
      addToast(authErrorMessage(error), 'error');
    }
  }, [addToast]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      addToast('Đã đăng xuất tài khoản', 'info');
    } catch (error) {
      console.warn('Logout error:', error);
    }
  }, [addToast]);

  const createTaskRecord = useCallback((taskData: Partial<Task>, id: string): Task => ({
    id,
    title: taskData.title?.trim() || 'Nhiệm vụ mới',
    description: taskData.description || '',
    category: taskData.category || 'work',
    projectId: taskData.projectId || undefined,
    status: taskData.status || 'todo',
    priority: taskData.priority || 'medium',
    deadline: taskData.deadline || undefined,
    plannedDate: taskData.plannedDate || getFormattedToday(0),
    startTime: taskData.startTime || undefined,
    estimatedMinutes: taskData.estimatedMinutes || 60,
    actualMinutes: taskData.actualMinutes || 0,
    subtasks: taskData.subtasks || [],
    notes: taskData.notes || '',
    tags: taskData.tags || [],
    reminder: taskData.reminder || undefined,
    recurrence: taskData.recurrence || 'none',
    isTopPriority: Boolean(taskData.isTopPriority),
    createdAt: taskData.createdAt || getFormattedToday(0),
    completedAt: taskData.completedAt,
  }), []);

  const addTask = useCallback((taskData: Partial<Task>): Task => {
    const newTask = createTaskRecord(taskData, `task-${Date.now()}`);
    setTasks((previous) => [newTask, ...previous]);
    recordUsageEvent('task_created', { category: newTask.category, priority: newTask.priority });
    addToast(`Đã thêm việc: "${newTask.title}"`, 'success');
    return newTask;
  }, [addToast, createTaskRecord]);

  const addTasks = useCallback((taskDataList: Partial<Task>[]): Task[] => {
    if (taskDataList.length === 0) return [];
    const stamp = Date.now();
    const newTasks = taskDataList.map((taskData, index) =>
      createTaskRecord(taskData, `task-${stamp}-${index}-${Math.random().toString(36).slice(2, 8)}`),
    );
    setTasks((previous) => [...newTasks, ...previous]);
    recordUsageEvent('task_batch_created', { count: newTasks.length });
    return newTasks;
  }, [createTaskRecord]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    recordUsageEvent('task_updated', { fieldCount: Object.keys(updates).length, statusChanged: Boolean(updates.status) });
    setTasks((previous) =>
      previous.map((task) => {
        if (task.id !== id) return task;
        const updated = { ...task, ...updates };
        if (updates.status === 'done' && task.status !== 'done') {
          updated.completedAt = getFormattedToday(0);
        }
        return updated;
      }),
    );
  }, []);

  const restoreTaskRecord = useCallback((record: DeletedTask, notify = true) => {
    const { deletedAt: _deletedAt, ...restored } = record;
    setTrashTasks((previous) => previous.filter((task) => task.id !== record.id));
    setTasks((previous) => [restored, ...previous.filter((task) => task.id !== record.id)]);
    recordUsageEvent('task_restored');
    if (notify) addToast(`Đã khôi phục “${record.title}”`, 'success');
  }, [addToast]);

  const restoreTask = useCallback((id: string) => {
    const record = trashTasks.find((task) => task.id === id);
    if (record) restoreTaskRecord(record);
  }, [trashTasks, restoreTaskRecord]);

  const permanentlyDeleteTask = useCallback((id: string) => {
    const record = trashTasks.find((task) => task.id === id);
    if (!record) return;
    setTrashTasks((previous) => previous.filter((task) => task.id !== id));
    recordUsageEvent('task_permanently_deleted');
    addToast(`Đã xóa vĩnh viễn “${record.title}”`, 'info');
  }, [trashTasks, addToast]);

  const deleteTask = useCallback((id: string) => {
    const target = tasks.find((task) => task.id === id);
    if (!target) return;

    const deletedRecord: DeletedTask = {
      ...target,
      deletedAt: new Date().toISOString(),
    };

    setTasks((previous) => previous.filter((task) => task.id !== id));
    setTrashTasks((previous) => [deletedRecord, ...previous.filter((task) => task.id !== id)]);
    recordUsageEvent('task_deleted', { category: target.category });
    addToast(`Đã xóa “${target.title}”`, 'info', {
      label: 'Hoàn tác',
      onClick: () => restoreTaskRecord(deletedRecord, false),
    });
  }, [tasks, addToast, restoreTaskRecord]);

  useEffect(() => {
    const cutoff = Date.now() - TRASH_RETENTION_MS;
    const expiredIds = new Set(
      trashTasks
        .filter((task) => new Date(task.deletedAt).getTime() < cutoff)
        .map((task) => task.id),
    );
    if (expiredIds.size === 0) return;
    setTrashTasks((previous) => previous.filter((task) => !expiredIds.has(task.id)));
  }, [trashTasks]);

  const toggleTaskComplete = useCallback((id: string) => {
    const target = tasks.find((task) => task.id === id);
    if (target) recordUsageEvent(target.status === 'done' ? 'task_reopened' : 'task_completed');
    setTasks((previous) =>
      previous.map((task) => {
        if (task.id !== id) return task;
        const isDone = task.status === 'done';
        return {
          ...task,
          status: isDone ? 'todo' : 'done',
          completedAt: isDone ? undefined : getFormattedToday(0),
        };
      }),
    );
  }, [tasks]);

  const toggleTopPriority = useCallback((id: string) => {
    setTasks((previous) => {
      const target = previous.find((task) => task.id === id);
      if (!target) return previous;
      if (!target.isTopPriority) {
        const count = previous.filter((task) => task.isTopPriority && task.status !== 'done').length;
        if (count >= 3) {
          addToast('Chỉ nên chọn tối đa 3 việc quan trọng nhất cho một ngày để duy trì sự tập trung.', 'warning');
          return previous;
        }
      }
      return previous.map((task) =>
        task.id === id ? { ...task, isTopPriority: !task.isTopPriority } : task,
      );
    });
  }, [addToast]);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    recordUsageEvent('subtask_toggled');
    setTasks((previous) =>
      previous.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((subtask) =>
                subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask,
              ),
            }
          : task,
      ),
    );
  }, []);

  const addSubtask = useCallback((taskId: string, title: string, estimatedMinutes = 20) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const newSubtask = {
      id: `sub-${Date.now()}`,
      title: trimmed,
      completed: false,
      estimatedMinutes,
    };
    setTasks((previous) =>
      previous.map((task) =>
        task.id === taskId ? { ...task, subtasks: [...task.subtasks, newSubtask] } : task,
      ),
    );
    recordUsageEvent('subtask_added', { estimatedMinutes });
    addToast('Đã thêm bước thực hiện mới', 'success');
  }, [addToast]);

  const calculateProjectProgress = useCallback((projectId: string): number => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return 0;
    const projectTasks = tasks.filter((task) => task.projectId === projectId);
    const milestones = project.milestones || [];
    if (projectTasks.length === 0 && milestones.length === 0) return 0;

    const milestoneScore = milestones.length
      ? milestones.filter((milestone) => milestone.completed).reduce((sum, milestone) => sum + (milestone.weight || 1), 0) /
        (milestones.reduce((sum, milestone) => sum + (milestone.weight || 1), 0) || 1)
      : 0;

    const taskScore = projectTasks.length
      ? projectTasks.filter((task) => task.status === 'done').reduce(
          (sum, task) => sum + (task.priority === 'urgent' || task.priority === 'high' ? 2 : 1),
          0,
        ) /
        (projectTasks.reduce(
          (sum, task) => sum + (task.priority === 'urgent' || task.priority === 'high' ? 2 : 1),
          0,
        ) || 1)
      : 0;

    if (milestones.length && projectTasks.length) return Math.round((milestoneScore * 0.5 + taskScore * 0.5) * 100);
    if (milestones.length) return Math.round(milestoneScore * 100);
    return Math.round(taskScore * 100);
  }, [projects, tasks]);

  const addProject = useCallback((projectData: Partial<Project>): Project => {
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: projectData.name?.trim() || 'Dự án mới',
      description: projectData.description || '',
      category: projectData.category || 'work',
      color: projectData.color || '#3b82f6',
      targetDate: projectData.targetDate || getFormattedToday(30),
      milestones: projectData.milestones || [],
      recentActivity: [
        {
          id: `act-${Date.now()}`,
          timestamp: 'Vừa xong',
          action: `Đã tạo dự án "${projectData.name?.trim() || 'Dự án mới'}"`,
        },
      ],
    };
    setProjects((previous) => [newProject, ...previous]);
    recordUsageEvent('project_created', { category: newProject.category });
    addToast(`Đã tạo dự án mới: "${newProject.name}"`, 'success');
    return newProject;
  }, [addToast]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    recordUsageEvent('project_updated', { fieldCount: Object.keys(updates).length });
    setProjects((previous) => previous.map((project) => (project.id === id ? { ...project, ...updates } : project)));
  }, []);

  const deleteProject = useCallback((id: string) => {
    const project = projects.find((item) => item.id === id);
    if (!project) return;

    const next = cascadeProjectDeletion(
      id,
      projects,
      tasks,
      trashTasks,
      calendarEvents,
      new Date().toISOString(),
    );

    setProjects(next.projects);
    setTasks(next.tasks);
    setTrashTasks(next.trashTasks);
    setCalendarEvents(next.calendarEvents);
    recordUsageEvent('project_deleted', { affectedTaskCount: next.affectedTaskCount });
    addToast(
      next.affectedTaskCount > 0
        ? `Đã xóa “${project.name}” và ${next.affectedTaskCount} công việc`
        : `Đã xóa dự án “${project.name}”`,
      'info',
    );
  }, [projects, tasks, trashTasks, calendarEvents, addToast]);

  const toggleMilestone = useCallback((projectId: string, milestoneId: string) => {
    setProjects((previous) =>
      previous.map((project) => {
        if (project.id !== projectId) return project;
        return {
          ...project,
          milestones: project.milestones.map((milestone) =>
            milestone.id === milestoneId ? { ...milestone, completed: !milestone.completed } : milestone,
          ),
          recentActivity: [
            {
              id: `act-${Date.now()}`,
              timestamp: 'Vừa xong',
              action: 'Đã cập nhật trạng thái cột mốc dự án',
            },
            ...project.recentActivity.slice(0, 4),
          ],
        };
      }),
    );
  }, []);

  const addCalendarEvent = useCallback((eventData: Partial<CalendarEvent>): CalendarEvent => {
    const newEvent: CalendarEvent = {
      id: `ev-${Date.now()}`,
      title: eventData.title?.trim() || 'Sự kiện mới',
      type: eventData.type || 'meeting',
      date: eventData.date || getFormattedToday(0),
      startTime: eventData.startTime || '09:00',
      endTime: eventData.endTime || '10:00',
      taskId: eventData.taskId,
      projectId: eventData.projectId,
      description: eventData.description,
      location: eventData.location,
      color: eventData.color || '#3b82f6',
    };
    setCalendarEvents((previous) => [...previous, newEvent]);
    recordUsageEvent('calendar_event_created', { type: newEvent.type });
    addToast(`Đã thêm vào lịch: "${newEvent.title}" lúc ${newEvent.startTime}`, 'success');
    return newEvent;
  }, [addToast]);

  const updateCalendarEvent = useCallback((id: string, updates: Partial<CalendarEvent>) => {
    recordUsageEvent('calendar_event_updated', { fieldCount: Object.keys(updates).length });
    setCalendarEvents((previous) => previous.map((event) => (event.id === id ? { ...event, ...updates } : event)));
  }, []);

  const deleteCalendarEvent = useCallback((id: string) => {
    recordUsageEvent('calendar_event_deleted');
    setCalendarEvents((previous) => previous.filter((event) => event.id !== id));
    addToast('Đã xóa sự kiện khỏi lịch', 'info');
  }, [addToast]);

  const scheduleTaskIntoCalendar = useCallback((
    taskId: string,
    date: string,
    startTime: string,
    durationMinutes = 60,
  ) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    recordUsageEvent('task_scheduled', { durationMinutes });

    const [hour, minute] = startTime.split(':').map(Number);
    const totalMinutes = hour * 60 + minute + durationMinutes;
    const endHour = Math.min(23, Math.floor(totalMinutes / 60));
    const endMinute = totalMinutes % 60;
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

    updateTask(taskId, { plannedDate: date, startTime, estimatedMinutes: durationMinutes });

    const existing = calendarEvents.find((event) => event.taskId === taskId && event.date === date);
    if (existing) {
      updateCalendarEvent(existing.id, { startTime, endTime });
    } else {
      addCalendarEvent({
        title: task.title,
        type: 'task',
        date,
        startTime,
        endTime,
        taskId: task.id,
        projectId: task.projectId,
        description: task.description,
        color: task.category === 'work' ? '#3b82f6' : '#10b981',
      });
    }
  }, [tasks, calendarEvents, updateTask, updateCalendarEvent, addCalendarEvent]);

  const toggleHabitForDate = useCallback((habitId: string, date: string) => {
    recordUsageEvent('habit_toggled');
    setHabits((previous) =>
      previous.map((habit) => {
        if (habit.id !== habitId) return habit;
        const exists = habit.completedDates.includes(date);
        return {
          ...habit,
          completedDates: exists
            ? habit.completedDates.filter((item) => item !== date)
            : [...habit.completedDates, date],
          streak: exists ? Math.max(0, habit.streak - 1) : habit.streak + 1,
        };
      }),
    );
  }, []);

  const addHabit = useCallback((habitData: Partial<Habit>): Habit => {
    const newHabit: Habit = {
      id: `hab-${Date.now()}`,
      name: habitData.name?.trim() || 'Thói quen mới',
      category: habitData.category || 'health',
      frequency: habitData.frequency,
      targetTime: habitData.targetTime,
      targetDaysPerWeek: habitData.targetDaysPerWeek || 7,
      preferredTime: habitData.preferredTime,
      durationMinutes: habitData.durationMinutes || 15,
      streak: 0,
      bestStreak: habitData.bestStreak,
      completedDates: [],
      description: habitData.description,
    };
    setHabits((previous) => [...previous, newHabit]);
    recordUsageEvent('habit_created', { category: newHabit.category || 'unknown' });
    addToast(`Đã thêm thói quen: "${newHabit.name}"`, 'success');
    return newHabit;
  }, [addToast]);

  const updateHabit = useCallback((id: string, updates: Partial<Habit>) => {
    recordUsageEvent('habit_updated', { fieldCount: Object.keys(updates).length });
    setHabits((previous) => previous.map((habit) => (habit.id === id ? { ...habit, ...updates } : habit)));
  }, []);

  const deleteHabit = useCallback((id: string) => {
    recordUsageEvent('habit_deleted');
    setHabits((previous) => previous.filter((habit) => habit.id !== id));
    addToast('Đã xóa thói quen', 'info');
  }, [addToast]);

  const addGoal = useCallback((goalData: Partial<Goal>): Goal => {
    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      title: goalData.title?.trim() || 'Mục tiêu mới',
      type: goalData.type || 'work',
      category: goalData.category,
      targetDate: goalData.targetDate || getFormattedToday(90),
      progress: goalData.progress || 0,
      keyResults: goalData.keyResults || [],
      linkedProjectId: goalData.linkedProjectId,
      linkedProjectIds: goalData.linkedProjectIds || [],
      notes: goalData.notes || '',
    };
    setGoals((previous) => [...previous, newGoal]);
    recordUsageEvent('goal_created', { type: newGoal.type || newGoal.category || 'unknown' });
    addToast(`Đã thêm mục tiêu: "${newGoal.title}"`, 'success');
    return newGoal;
  }, [addToast]);

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    recordUsageEvent('goal_updated', { fieldCount: Object.keys(updates).length });
    setGoals((previous) => previous.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal)));
  }, []);

  const deleteGoal = useCallback((id: string) => {
    recordUsageEvent('goal_deleted');
    setGoals((previous) => previous.filter((goal) => goal.id !== id));
    addToast('Đã xóa mục tiêu', 'info');
  }, [addToast]);

  const startFocusSession = useCallback((task: Task, minutes = 25) => {
    setFocusTask(task);
    setFocusTotalSeconds(minutes * 60);
    setFocusSecondsLeft(minutes * 60);
    setIsFocusRunning(true);
    recordUsageEvent('focus_started', { minutes });
    addToast(`Bắt đầu phiên tập trung: "${task.title}" (${minutes} phút)`, 'info');
  }, [addToast]);

  const pauseFocusSession = useCallback(() => {
    recordUsageEvent('focus_paused');
    setIsFocusRunning(false);
  }, []);
  const resumeFocusSession = useCallback(() => {
    recordUsageEvent('focus_resumed');
    setIsFocusRunning(true);
  }, []);

  const stopFocusSession = useCallback((markComplete = false) => {
    recordUsageEvent('focus_stopped', { markComplete });
    setIsFocusRunning(false);
    if (focusTask) {
      const elapsedMinutes = Math.max(1, Math.round((focusTotalSeconds - focusSecondsLeft) / 60));
      updateTask(focusTask.id, {
        actualMinutes: (focusTask.actualMinutes || 0) + elapsedMinutes,
        status: markComplete ? 'done' : focusTask.status,
      });
      if (markComplete) addToast(`Đã hoàn thành nhiệm vụ "${focusTask.title}"!`, 'success');
    }
    setFocusTask(null);
  }, [focusTask, focusTotalSeconds, focusSecondsLeft, updateTask, addToast]);

  useEffect(() => {
    if (!isFocusRunning) return;
    if (focusSecondsLeft <= 0) {
      setIsFocusRunning(false);
      if (focusTask) {
        const addedMinutes = Math.round(focusTotalSeconds / 60);
        updateTask(focusTask.id, {
          actualMinutes: (focusTask.actualMinutes || 0) + addedMinutes,
        });
      }
      addToast(`Đã hoàn thành phiên tập trung cho "${focusTask?.title || 'nhiệm vụ'}"!`, 'success');
      return;
    }

    const timer = window.setInterval(() => {
      setFocusSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isFocusRunning, focusSecondsLeft, focusTask, focusTotalSeconds, updateTask, addToast]);

  return (
    <AppContext.Provider
      value={{
        user,
        signInWithGoogle,
        logout,
        currentView,
        setCurrentView: changeCurrentView,
        activeTab: currentView as NavTab,
        setActiveTab: changeCurrentView as (tab: NavTab) => void,
        isCommandMenuOpen,
        setIsCommandMenuOpen,
        isMorningPlanningOpen,
        setIsMorningPlanningOpen,
        isEveningReviewOpen,
        setIsEveningReviewOpen,
        openTaskModal,
        openFocusSession: (task: Task) => startFocusSession(task),
        tasks,
        trashTasks,
        projects,
        calendarEvents,
        habits,
        goals,
        lifeMetrics,
        addTask,
        addTasks,
        updateTask,
        deleteTask,
        restoreTask,
        permanentlyDeleteTask,
        toggleTaskComplete,
        toggleTopPriority,
        toggleSubtask,
        addSubtask,
        addProject,
        updateProject,
        deleteProject,
        toggleMilestone,
        calculateProjectProgress,
        addCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
        scheduleTaskIntoCalendar,
        toggleHabitForDate,
        addHabit,
        updateHabit,
        deleteHabit,
        addGoal,
        updateGoal,
        deleteGoal,
        focusTask,
        isFocusRunning,
        focusSecondsLeft,
        focusTotalSeconds,
        startFocusSession,
        pauseFocusSession,
        resumeFocusSession,
        stopFocusSession,
        editingTask,
        setEditingTask,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
