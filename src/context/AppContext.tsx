import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Task,
  Project,
  CalendarEvent,
  Habit,
  Goal,
  AiSuggestion,
  LifeMetric,
  ChatMessage,
  ParsedInputResult,
  NavTab,
} from '../types';
import {
  INITIAL_TASKS,
  INITIAL_PROJECTS,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_HABITS,
  INITIAL_GOALS,
  INITIAL_AI_SUGGESTIONS,
  INITIAL_LIFE_METRICS,
  getFormattedToday,
} from '../data/mockData';
import { auth, googleProvider } from '../lib/firebase';
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, User as FirebaseUser } from 'firebase/auth';
import { authErrorMessage, shouldUseRedirect } from '../services/authFlow';
import { firestoreService, type DeletedTask } from '../services/firestoreService';
import { syncNotificationTasks } from '../services/notificationService';
import { createTaskDraft } from '../services/taskDraft';

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
  isAssistantOpen: boolean;
  setIsAssistantOpen: (open: boolean) => void;
  toggleAssistant: () => void;
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
  aiSuggestions: AiSuggestion[];
  lifeMetrics: LifeMetric[];
  chatMessages: ChatMessage[];
  addTask: (taskData: Partial<Task>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  restoreTask: (id: string) => void;
  permanentlyDeleteTask: (id: string) => void;
  toggleTaskComplete: (id: string) => void;
  toggleTopPriority: (id: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string, estimatedMinutes?: number) => void;
  breakdownTaskWithAi: (taskId: string) => Promise<void>;
  addProject: (proj: Partial<Project>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  toggleMilestone: (projectId: string, milestoneId: string) => void;
  calculateProjectProgress: (projectId: string) => number;
  addCalendarEvent: (event: Partial<CalendarEvent>) => CalendarEvent;
  updateCalendarEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;
  scheduleTaskIntoCalendar: (taskId: string, date: string, startTime: string, durationMinutes?: number) => void;
  autoScheduleWithAi: (date: string) => Promise<{ proposedSchedule: any[]; summary: string }>;
  toggleHabitForDate: (habitId: string, date: string) => void;
  addHabit: (habit: Partial<Habit>) => Habit;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  addGoal: (goal: Partial<Goal>) => Goal;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  applyAiSuggestion: (suggestionId: string) => void;
  dismissAiSuggestion: (suggestionId: string) => void;
  sendChatMessage: (text: string) => Promise<void>;
  applyAssistantAction: (messageId: string) => void;
  parseAndConfirmInput: (prompt: string) => Promise<ParsedInputResult>;
  confirmParsedInput: (parsed: ParsedInputResult) => void;
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

function removeCachedDemoData(): void {
  try {
    if (localStorage.getItem(DEMO_DATA_REMOVED_KEY)) return;
    ['tasks', 'projects', 'events', 'habits', 'goals', 'suggestions', 'life_metrics'].forEach((key) => {
      localStorage.removeItem(STORAGE_KEY_PREFIX + key);
    });
    localStorage.setItem(DEMO_DATA_REMOVED_KEY, 'true');
  } catch (e) {
    console.warn('Could not clear cached demo data:', e);
  }
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) {
    console.error(`Error loading ${key} from storage:`, e);
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
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
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState<boolean>(false);
  const [isMorningPlanningOpen, setIsMorningPlanningOpen] = useState<boolean>(false);
  const [isEveningReviewOpen, setIsEveningReviewOpen] = useState<boolean>(false);

  const [tasks, setTasks] = useState<Task[]>(() => loadFromStorage('tasks', INITIAL_TASKS));
  const [trashTasks, setTrashTasks] = useState<DeletedTask[]>(() => loadFromStorage('deleted_tasks', []));
  const [projects, setProjects] = useState<Project[]>(() => loadFromStorage('projects', INITIAL_PROJECTS));
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => loadFromStorage('events', INITIAL_CALENDAR_EVENTS));
  const [habits, setHabits] = useState<Habit[]>(() => loadFromStorage('habits', INITIAL_HABITS));
  const [goals, setGoals] = useState<Goal[]>(() => loadFromStorage('goals', INITIAL_GOALS));
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>(() => loadFromStorage('suggestions', INITIAL_AI_SUGGESTIONS));
  const [lifeMetrics] = useState<LifeMetric[]>(() => loadFromStorage('life_metrics', INITIAL_LIFE_METRICS));

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: 'Chào bạn! Tôi là trợ lý Lịch Sống. Hãy thêm việc đầu tiên, tôi sẽ giúp bạn sắp xếp và theo dõi tiến độ.',
      timestamp: '08:00',
    },
  ]);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [isFocusRunning, setIsFocusRunning] = useState<boolean>(false);
  const [focusSecondsLeft, setFocusSecondsLeft] = useState<number>(25 * 60);
  const [focusTotalSeconds, setFocusTotalSeconds] = useState<number>(25 * 60);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const cloudReadyRef = useRef(false);
  const tasksSyncRef = useRef<Task[]>(tasks);
  const trashTasksSyncRef = useRef<DeletedTask[]>(trashTasks);
  const projectsSyncRef = useRef<Project[]>(projects);
  const eventsSyncRef = useRef<CalendarEvent[]>(calendarEvents);
  const habitsSyncRef = useRef<Habit[]>(habits);
  const goalsSyncRef = useRef<Goal[]>(goals);
  const suggestionsSyncRef = useRef<AiSuggestion[]>(aiSuggestions);

  const addToast = useCallback((
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    action?: { label: string; onClick: () => void },
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts([{
      id,
      message,
      type,
      actionLabel: action?.label,
      onAction: action?.onClick,
    }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, action ? 6000 : 3200);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => { saveToStorage('tasks', tasks); }, [tasks]);
  useEffect(() => { saveToStorage('deleted_tasks', trashTasks); }, [trashTasks]);
  useEffect(() => { saveToStorage('projects', projects); }, [projects]);
  useEffect(() => { saveToStorage('events', calendarEvents); }, [calendarEvents]);
  useEffect(() => { saveToStorage('habits', habits); }, [habits]);
  useEffect(() => { saveToStorage('goals', goals); }, [goals]);
  useEffect(() => { saveToStorage('suggestions', aiSuggestions); }, [aiSuggestions]);
  useEffect(() => {
    const sync = () => void syncNotificationTasks(tasks).catch((error) => {
        console.warn('Could not sync notification schedule:', error);
      });
    sync();
    window.addEventListener('lich-song-notifications-enabled', sync);
    return () => window.removeEventListener('lich-song-notifications-enabled', sync);
  }, [tasks]);

  useEffect(() => {
    void getRedirectResult(auth).then((result) => {
      if (result?.user) addToast('Đăng nhập Google thành công', 'success');
    }).catch((error) => {
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
            cloud.goals.length + cloud.habits.length + cloud.suggestions.length > 0;

          if (!cloudHasData) {
            const localSnapshot = {
              tasks: withoutSeed(tasks, INITIAL_TASKS),
              deletedTasks: trashTasks,
              projects: withoutSeed(projects, INITIAL_PROJECTS),
              events: withoutSeed(calendarEvents, INITIAL_CALENDAR_EVENTS),
              goals: withoutSeed(goals, INITIAL_GOALS),
              habits: withoutSeed(habits, INITIAL_HABITS),
              suggestions: withoutSeed(aiSuggestions, INITIAL_AI_SUGGESTIONS),
            };
            const localHasData = Object.values(localSnapshot).some((items) => items.length > 0);
            if (localHasData) await firestoreService.mergeUserData(currentUser.uid, localSnapshot);
          }
        }

        unsubscribeCloud = firestoreService.subscribeUserData(
          currentUser.uid,
          (data) => {
            // Each collection has its own Firestore listener. A snapshot from projects/goals/etc.
            // must not re-apply an older task snapshot and undo an optimistic local edit/delete.
            // Sync refs represent the last cloud state we accepted, not the latest local state.
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
            if (!sameEntities(suggestionsSyncRef.current, data.suggestions)) {
              suggestionsSyncRef.current = data.suggestions;
              setAiSuggestions(data.suggestions);
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
    const previous = tasksSyncRef.current;
    void syncEntityDiff(user.uid, previous, tasks, firestoreService.saveTask, firestoreService.deleteTask);
  }, [tasks, user]);

  useEffect(() => {
    if (!user || !cloudReadyRef.current || sameEntities(trashTasksSyncRef.current, trashTasks)) return;
    const previous = trashTasksSyncRef.current;
    void syncEntityDiff(
      user.uid,
      previous,
      trashTasks,
      firestoreService.saveDeletedTask,
      firestoreService.deleteDeletedTask,
    );
  }, [trashTasks, user]);

  useEffect(() => {
    if (!user || !cloudReadyRef.current || sameEntities(projectsSyncRef.current, projects)) return;
    const previous = projectsSyncRef.current;
    void syncEntityDiff(user.uid, previous, projects, firestoreService.saveProject, firestoreService.deleteProject);
  }, [projects, user]);

  useEffect(() => {
    if (!user || !cloudReadyRef.current || sameEntities(eventsSyncRef.current, calendarEvents)) return;
    const previous = eventsSyncRef.current;
    void syncEntityDiff(user.uid, previous, calendarEvents, firestoreService.saveCalendarEvent, firestoreService.deleteCalendarEvent);
  }, [calendarEvents, user]);

  useEffect(() => {
    if (!user || !cloudReadyRef.current || sameEntities(habitsSyncRef.current, habits)) return;
    const previous = habitsSyncRef.current;
    void syncEntityDiff(user.uid, previous, habits, firestoreService.saveHabit, firestoreService.deleteHabit);
  }, [habits, user]);

  useEffect(() => {
    if (!user || !cloudReadyRef.current || sameEntities(goalsSyncRef.current, goals)) return;
    const previous = goalsSyncRef.current;
    void syncEntityDiff(user.uid, previous, goals, firestoreService.saveGoal, firestoreService.deleteGoal);
  }, [goals, user]);

  useEffect(() => {
    if (!user || !cloudReadyRef.current || sameEntities(suggestionsSyncRef.current, aiSuggestions)) return;
    const previous = suggestionsSyncRef.current;
    void syncEntityDiff(user.uid, previous, aiSuggestions, firestoreService.saveAiSuggestion, firestoreService.deleteAiSuggestion);
  }, [aiSuggestions, user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandMenuOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const signInWithGoogle = async () => {
    try {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
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
  };

  const logout = async () => {
    try {
      await signOut(auth);
      addToast('Đã đăng xuất tài khoản', 'info');
    } catch (err: any) {
      console.warn('Logout error:', err);
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (isFocusRunning && focusSecondsLeft > 0) {
      interval = setInterval(() => {
        setFocusSecondsLeft((sec) => sec - 1);
      }, 1000);
    } else if (focusSecondsLeft === 0 && isFocusRunning) {
      setIsFocusRunning(false);
      addToast(`Đã hoàn thành phiên tập trung cho "${focusTask?.title || 'nhiệm vụ'}"!`, 'success');
      if (focusTask) {
        const addedMinutes = Math.round(focusTotalSeconds / 60);
        updateTask(focusTask.id, {
          actualMinutes: (focusTask.actualMinutes || 0) + addedMinutes,
        });
      }
    }
    return () => clearInterval(interval);
  }, [isFocusRunning, focusSecondsLeft, focusTask, focusTotalSeconds, addToast]);

  const toggleAssistant = () => setIsAssistantOpen((prev) => !prev);

  const addTask = useCallback((taskData: Partial<Task>): Task => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
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
      actualMinutes: 0,
      subtasks: taskData.subtasks || [],
      notes: taskData.notes || '',
      tags: taskData.tags || [],
      reminder: taskData.reminder || undefined,
      recurrence: taskData.recurrence || 'none',
      isTopPriority: !!taskData.isTopPriority,
      createdAt: getFormattedToday(0),
    };

    setTasks((prev) => [newTask, ...prev]);
    addToast(`Đã thêm việc: "${newTask.title}"`, 'success');
    return newTask;
  }, [addToast]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, ...updates };
          if (updates.status === 'done' && t.status !== 'done') {
            updated.completedAt = getFormattedToday(0);
          }
          return updated;
        }
        return t;
      })
    );
  }, []);

  const restoreTaskRecord = useCallback((record: DeletedTask, notify = true) => {
    const { deletedAt: _deletedAt, ...restored } = record;
    setTrashTasks((prev) => prev.filter((task) => task.id !== record.id));
    setTasks((prev) => [restored, ...prev.filter((task) => task.id !== record.id)]);
    if (notify) addToast(`Đã khôi phục “${record.title}”`, 'success');
  }, [addToast]);

  const restoreTask = useCallback((id: string) => {
    const record = trashTasks.find((task) => task.id === id);
    if (record) restoreTaskRecord(record);
  }, [trashTasks, restoreTaskRecord]);

  const permanentlyDeleteTask = useCallback((id: string) => {
    const record = trashTasks.find((task) => task.id === id);
    if (!record) return;
    setTrashTasks((prev) => prev.filter((task) => task.id !== id));
    addToast(`Đã xóa vĩnh viễn “${record.title}”`, 'info');
  }, [trashTasks, addToast]);

  const deleteTask = useCallback((id: string) => {
    const target = tasks.find((task) => task.id === id);
    if (!target) return;

    const deletedRecord: DeletedTask = {
      ...target,
      deletedAt: new Date().toISOString(),
    };

    setTasks((prev) => prev.filter((task) => task.id !== id));
    setTrashTasks((prev) => [deletedRecord, ...prev.filter((task) => task.id !== id)]);
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
    setTrashTasks((prev) => prev.filter((task) => !expiredIds.has(task.id)));
  }, [trashTasks]);

  const toggleTaskComplete = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const isDone = t.status === 'done';
          const newStatus = isDone ? 'todo' : 'done';
          return {
            ...t,
            status: newStatus,
            completedAt: !isDone ? getFormattedToday(0) : undefined,
          };
        }
        return t;
      })
    );
  }, []);

  const toggleTopPriority = useCallback((id: string) => {
    setTasks((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target) return prev;
      if (!target.isTopPriority) {
        const currentTopCount = prev.filter((t) => t.isTopPriority && t.status !== 'done').length;
        if (currentTopCount >= 3) {
          addToast('Chỉ nên chọn tối đa 3 việc quan trọng nhất cho một ngày để duy trì sự tập trung.', 'warning');
          return prev;
        }
      }
      return prev.map((t) => (t.id === id ? { ...t, isTopPriority: !t.isTopPriority } : t));
    });
  }, [addToast]);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updatedSubtasks = t.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          );
          return { ...t, subtasks: updatedSubtasks };
        }
        return t;
      })
    );
  }, []);

  const addSubtask = useCallback((taskId: string, title: string, estimatedMinutes = 20) => {
    const newSubtask = {
      id: `sub-${Date.now()}`,
      title: title.trim(),
      completed: false,
      estimatedMinutes,
    };
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, subtasks: [...t.subtasks, newSubtask] } : t))
    );
    addToast('Đã thêm bước thực hiện mới', 'success');
  }, [addToast]);

  const breakdownTaskWithAi = useCallback(async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    addToast(`Đang phân tích và chia nhỏ: "${task.title}"...`, 'info');
    try {
      const res = await fetch('/api/gemini/breakdown-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: task.title,
          taskDescription: task.description,
          estimatedMinutes: task.estimatedMinutes,
        }),
      });
      const data = await res.json();
      if (data.subtasks && data.subtasks.length > 0) {
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id === taskId) {
              return { ...t, subtasks: [...t.subtasks, ...data.subtasks] };
            }
            return t;
          })
        );
        addToast(`Trợ lý đã chia "${task.title}" thành ${data.subtasks.length} bước nhỏ`, 'success');
      }
    } catch (e) {
      console.error('AI breakdown error:', e);
      addToast('Không thể chia nhỏ lúc này, vui lòng thử lại.', 'error');
    }
  }, [tasks, addToast]);

  const calculateProjectProgress = useCallback((projectId: string): number => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return 0;
    const projectTasks = tasks.filter((t) => t.projectId === projectId);
    const milestones = project.milestones || [];

    if (projectTasks.length === 0 && milestones.length === 0) return 0;

    let milestoneScore = 0;
    if (milestones.length > 0) {
      const totalWeight = milestones.reduce((sum, m) => sum + (m.weight || 1), 0);
      const doneWeight = milestones
        .filter((m) => m.completed)
        .reduce((sum, m) => sum + (m.weight || 1), 0);
      milestoneScore = doneWeight / (totalWeight || 1);
    }

    let taskScore = 0;
    if (projectTasks.length > 0) {
      const totalTaskWeight = projectTasks.reduce(
        (sum, t) => sum + (t.priority === 'urgent' || t.priority === 'high' ? 2 : 1),
        0
      );
      const doneTaskWeight = projectTasks
        .filter((t) => t.status === 'done')
        .reduce((sum, t) => sum + (t.priority === 'urgent' || t.priority === 'high' ? 2 : 1), 0);
      taskScore = doneTaskWeight / (totalTaskWeight || 1);
    }

    if (milestones.length > 0 && projectTasks.length > 0) {
      return Math.round((milestoneScore * 0.5 + taskScore * 0.5) * 100);
    } else if (milestones.length > 0) {
      return Math.round(milestoneScore * 100);
    } else {
      return Math.round(taskScore * 100);
    }
  }, [projects, tasks]);

  const addProject = useCallback((projData: Partial<Project>): Project => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: projData.name?.trim() || 'Dự án mới',
      description: projData.description || '',
      category: projData.category || 'work',
      color: projData.color || '#3b82f6',
      targetDate: projData.targetDate || getFormattedToday(30),
      milestones: projData.milestones || [],
      recentActivity: [
        {
          id: `act-${Date.now()}`,
          timestamp: 'Vừa xong',
          action: `Đã tạo dự án "${projData.name}"`,
        },
      ],
      aiHealthSummary: {
        status: 'healthy',
        score: 100,
        summary: 'Dự án mới được khởi tạo với các mục tiêu ban đầu.',
        recommendations: ['Lên danh sách các việc cần làm đầu tiên và gán cột mốc.'],
      },
    };
    setProjects((prev) => [newProj, ...prev]);
    addToast(`Đã tạo dự án mới: "${newProj.name}"`, 'success');
    return newProj;
  }, [addToast]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    addToast('Đã xóa dự án', 'info');
  }, [addToast]);

  const toggleMilestone = useCallback((projectId: string, milestoneId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const updatedMilestones = p.milestones.map((m) =>
            m.id === milestoneId ? { ...m, completed: !m.completed } : m
          );
          return {
            ...p,
            milestones: updatedMilestones,
            recentActivity: [
              {
                id: `act-${Date.now()}`,
                timestamp: 'Vừa xong',
                action: 'Đã cập nhật trạng thái cột mốc dự án',
              },
              ...p.recentActivity.slice(0, 4),
            ],
          };
        }
        return p;
      })
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
    setCalendarEvents((prev) => [...prev, newEvent]);
    addToast(`Đã thêm vào lịch: "${newEvent.title}" lúc ${newEvent.startTime}`, 'success');
    return newEvent;
  }, [addToast]);

  const updateCalendarEvent = useCallback((id: string, updates: Partial<CalendarEvent>) => {
    setCalendarEvents((prev) => prev.map((ev) => (ev.id === id ? { ...ev, ...updates } : ev)));
  }, []);

  const deleteCalendarEvent = useCallback((id: string) => {
    setCalendarEvents((prev) => prev.filter((ev) => ev.id !== id));
    addToast('Đã xóa sự kiện khỏi lịch', 'info');
  }, [addToast]);

  const scheduleTaskIntoCalendar = useCallback((taskId: string, date: string, startTime: string, durationMinutes = 60) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const [h, m] = startTime.split(':').map(Number);
    const totalMinutes = h * 60 + m + durationMinutes;
    const endH = Math.min(23, Math.floor(totalMinutes / 60));
    const endM = totalMinutes % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    updateTask(taskId, {
      plannedDate: date,
      startTime,
      estimatedMinutes: durationMinutes,
    });

    const existingEv = calendarEvents.find((ev) => ev.taskId === taskId && ev.date === date);
    if (existingEv) {
      updateCalendarEvent(existingEv.id, { startTime, endTime });
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

  const autoScheduleWithAi = useCallback(async (date: string) => {
    const unscheduled = tasks.filter(
      (t) => t.status !== 'done' && (!t.plannedDate || !t.startTime)
    );
    const existingForDay = calendarEvents.filter((ev) => ev.date === date);

    try {
      const res = await fetch('/api/gemini/smart-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          unscheduledTasks: unscheduled.map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            estimatedMinutes: t.estimatedMinutes,
            deadline: t.deadline,
          })),
          existingEvents: existingForDay.map((e) => ({
            title: e.title,
            startTime: e.startTime,
            endTime: e.endTime,
          })),
        }),
      });
      const data = await res.json();
      return data;
    } catch (e) {
      console.error('Smart schedule error:', e);
      return {
        proposedSchedule: [],
        summary: 'Không thể kết nối dịch vụ xếp lịch AI lúc này.',
      };
    }
  }, [tasks, calendarEvents]);

  const toggleHabitForDate = useCallback((habitId: string, date: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id === habitId) {
          const exists = h.completedDates.includes(date);
          const newDates = exists
            ? h.completedDates.filter((d) => d !== date)
            : [...h.completedDates, date];
          const newStreak = exists ? Math.max(0, h.streak - 1) : h.streak + 1;
          return { ...h, completedDates: newDates, streak: newStreak };
        }
        return h;
      })
    );
  }, []);

  const addHabit = useCallback((habitData: Partial<Habit>): Habit => {
    const newHabit: Habit = {
      id: `hab-${Date.now()}`,
      name: habitData.name?.trim() || 'Thói quen mới',
      category: habitData.category || 'health',
      targetDaysPerWeek: habitData.targetDaysPerWeek || 7,
      preferredTime: habitData.preferredTime,
      durationMinutes: habitData.durationMinutes || 15,
      streak: 0,
      completedDates: [],
      description: habitData.description,
    };
    setHabits((prev) => [...prev, newHabit]);
    addToast(`Đã thêm thói quen: "${newHabit.name}"`, 'success');
    return newHabit;
  }, [addToast]);

  const updateHabit = useCallback((id: string, updates: Partial<Habit>) => {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));
  }, []);

  const deleteHabit = useCallback((id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    addToast('Đã xóa thói quen', 'info');
  }, [addToast]);

  const addGoal = useCallback((goalData: Partial<Goal>): Goal => {
    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      title: goalData.title?.trim() || 'Mục tiêu mới',
      type: goalData.type || 'work',
      targetDate: goalData.targetDate || getFormattedToday(90),
      progress: goalData.progress || 0,
      keyResults: goalData.keyResults || [],
      linkedProjectIds: goalData.linkedProjectIds || [],
      notes: goalData.notes || '',
    };
    setGoals((prev) => [...prev, newGoal]);
    addToast(`Đã thêm mục tiêu: "${newGoal.title}"`, 'success');
    return newGoal;
  }, [addToast]);

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    addToast('Đã xóa mục tiêu', 'info');
  }, [addToast]);

  const applyAiSuggestion = useCallback((suggestionId: string) => {
    const sug = aiSuggestions.find((s) => s.id === suggestionId);
    if (!sug) return;

    if (sug.actionType === 'reschedule_task') {
      const { taskId, newDate, newTime } = sug.payload;
      updateTask(taskId, { plannedDate: newDate, startTime: newTime });
      addToast('Đã dời lịch công việc theo đề xuất của trợ lý', 'success');
    } else if (sug.actionType === 'fill_gap') {
      const { taskId, date, startTime, endTime } = sug.payload;
      updateTask(taskId, { plannedDate: date, startTime });
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        addCalendarEvent({
          title: task.title,
          type: 'task',
          date,
          startTime,
          endTime,
          taskId,
          color: '#3b82f6',
        });
      }
      addToast('Đã lấp khoảng trống bằng công việc phù hợp', 'success');
    } else if (sug.actionType === 'breakdown_task') {
      breakdownTaskWithAi(sug.payload.taskId);
    }

    setAiSuggestions((prev) =>
      prev.map((s) => (s.id === suggestionId ? { ...s, status: 'applied' } : s))
    );
  }, [aiSuggestions, tasks, updateTask, addCalendarEvent, breakdownTaskWithAi, addToast]);

  const dismissAiSuggestion = useCallback((suggestionId: string) => {
    setAiSuggestions((prev) =>
      prev.map((s) => (s.id === suggestionId ? { ...s, status: 'dismissed' } : s))
    );
    addToast('Đã bỏ qua đề xuất', 'info');
  }, [addToast]);

  const parseAndConfirmInput = useCallback(async (prompt: string): Promise<ParsedInputResult> => {
    try {
      const res = await fetch('/api/gemini/parse-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          baseDate: getFormattedToday(0),
        }),
      });
      const data: ParsedInputResult = await res.json();
      return data;
    } catch (e) {
      console.error('Parse input error:', e);
      return {
        title: prompt,
        type: 'task',
        date: getFormattedToday(0),
        startTime: '09:00',
        estimatedMinutes: 60,
        priority: 'medium',
        relatedProject: 'Công việc chung',
        reminder: '15 phút trước',
        rawInput: prompt,
      };
    }
  }, []);

  const confirmParsedInput = useCallback((parsed: ParsedInputResult) => {
    const matchProj = projects.find(
      (p) => p.name.toLowerCase() === parsed.relatedProject.toLowerCase()
    );

    if (parsed.type === 'habit') {
      addHabit({
        name: parsed.title,
        category: 'health',
        preferredTime: parsed.startTime,
        durationMinutes: parsed.estimatedMinutes || 30,
      });
    } else if (parsed.type === 'event') {
      const [h, m] = (parsed.startTime || '09:00').split(':').map(Number);
      const totalMinutes = h * 60 + m + (parsed.estimatedMinutes || 60);
      const endH = Math.floor(totalMinutes / 60);
      const endM = totalMinutes % 60;
      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      addCalendarEvent({
        title: parsed.title,
        type: 'meeting',
        date: parsed.date,
        startTime: parsed.startTime || '09:00',
        endTime,
        projectId: matchProj?.id,
      });
    } else {
      addTask({
        title: parsed.title,
        category: matchProj?.category || 'work',
        projectId: matchProj?.id,
        priority: parsed.priority,
        plannedDate: parsed.date,
        startTime: parsed.startTime,
        estimatedMinutes: parsed.estimatedMinutes,
        reminder: parsed.reminder,
        isTopPriority: parsed.priority === 'urgent',
      });
    }
  }, [projects, addHabit, addCalendarEvent, addTask]);

  const sendChatMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    const context = {
      todayDate: getFormattedToday(0),
      topTasks: tasks.filter((t) => t.isTopPriority && t.status !== 'done'),
      totalTasksToday: tasks.filter((t) => t.plannedDate === getFormattedToday(0)),
      calendarEventsToday: calendarEvents.filter((e) => e.date === getFormattedToday(0)),
      projects: projects.map((p) => ({ name: p.name, targetDate: p.targetDate })),
    };

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg],
          context,
        }),
      });
      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: data.reply || 'Tôi có thể hỗ trợ bạn điều chỉnh kế hoạch.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        proposedAction: data.proposedAction,
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      console.error('Chat error:', e);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: 'assistant',
          text: 'Tôi đã ghi nhận. Hãy cho tôi biết bạn muốn điều chỉnh gì thêm cho hôm nay nhé.',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [chatMessages, tasks, calendarEvents, projects]);

  const applyAssistantAction = useCallback((messageId: string) => {
    const msg = chatMessages.find((m) => m.id === messageId);
    if (!msg || !msg.proposedAction) return;

    const { type, data } = msg.proposedAction;
    if (type === 'create_task') {
      addTask(data);
    } else if (type === 'reschedule_task') {
      updateTask(data.taskId, { plannedDate: data.date, startTime: data.startTime });
      addToast('Đã dời lịch theo đề xuất của trợ lý', 'success');
    } else if (type === 'add_event') {
      addCalendarEvent(data);
    }

    setChatMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.proposedAction
          ? { ...m, proposedAction: { ...m.proposedAction, applied: true } }
          : m
      )
    );
  }, [chatMessages, addTask, updateTask, addCalendarEvent, addToast]);

  const startFocusSession = useCallback((task: Task, minutes = 25) => {
    setFocusTask(task);
    setFocusTotalSeconds(minutes * 60);
    setFocusSecondsLeft(minutes * 60);
    setIsFocusRunning(true);
    addToast(`Bắt đầu phiên tập trung: "${task.title}" (${minutes} phút)`, 'info');
  }, [addToast]);

  const pauseFocusSession = useCallback(() => {
    setIsFocusRunning(false);
  }, []);

  const resumeFocusSession = useCallback(() => {
    setIsFocusRunning(true);
  }, []);

  const stopFocusSession = useCallback((markComplete = false) => {
    setIsFocusRunning(false);
    if (focusTask) {
      const elapsedMinutes = Math.max(1, Math.round((focusTotalSeconds - focusSecondsLeft) / 60));
      updateTask(focusTask.id, {
        actualMinutes: (focusTask.actualMinutes || 0) + elapsedMinutes,
        status: markComplete ? 'done' : focusTask.status,
      });
      if (markComplete) {
        addToast(`Đã hoàn thành xuất sắc nhiệm vụ "${focusTask.title}"!`, 'success');
      }
    }
    setFocusTask(null);
  }, [focusTask, focusTotalSeconds, focusSecondsLeft, updateTask, addToast]);

  return (
    <AppContext.Provider
      value={{
        user,
        signInWithGoogle,
        logout,
        currentView,
        setCurrentView,
        activeTab: currentView as NavTab,
        setActiveTab: setCurrentView as (tab: NavTab) => void,
        isAssistantOpen,
        setIsAssistantOpen,
        toggleAssistant,
        isCommandMenuOpen,
        setIsCommandMenuOpen,
        isMorningPlanningOpen,
        setIsMorningPlanningOpen,
        isEveningReviewOpen,
        setIsEveningReviewOpen,
        openTaskModal: (task?: Task) => setEditingTask(task || createTaskDraft(getFormattedToday(0))),
        openFocusSession: (task: Task) => startFocusSession(task),
        tasks,
        trashTasks,
        projects,
        calendarEvents,
        habits,
        goals,
        aiSuggestions,
        lifeMetrics,
        chatMessages,
        addTask,
        updateTask,
        deleteTask,
        restoreTask,
        permanentlyDeleteTask,
        toggleTaskComplete,
        toggleTopPriority,
        toggleSubtask,
        addSubtask,
        breakdownTaskWithAi,
        addProject,
        updateProject,
        deleteProject,
        toggleMilestone,
        calculateProjectProgress,
        addCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
        scheduleTaskIntoCalendar,
        autoScheduleWithAi,
        toggleHabitForDate,
        addHabit,
        updateHabit,
        deleteHabit,
        addGoal,
        updateGoal,
        deleteGoal,
        applyAiSuggestion,
        dismissAiSuggestion,
        sendChatMessage,
        applyAssistantAction,
        parseAndConfirmInput,
        confirmParsedInput,
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
