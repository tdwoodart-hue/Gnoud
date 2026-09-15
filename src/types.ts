export type TaskCategory = 'work' | 'personal';

export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'done' | 'deferred';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export type GoalCategory = 'work' | 'personal' | 'long_term';

export type NavTab = 'today' | 'tasks' | 'calendar' | 'personal' | 'reports';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  estimatedMinutes?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  projectId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string;
  plannedDate?: string;
  startTime?: string;
  estimatedMinutes: number;
  actualMinutes: number;
  subtasks: Subtask[];
  notes?: string;
  tags: string[];
  reminder?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'weekdays' | 'monthly';
  isTopPriority?: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface Milestone {
  id: string;
  title: string;
  targetDate?: string;
  completed: boolean;
  weight?: number;
}

export interface ProjectActivity {
  id: string;
  timestamp: string;
  action: string;
  userName?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  category: TaskCategory;
  color: string;
  targetDate?: string;
  milestones: Milestone[];
  recentActivity: ProjectActivity[];
  progress?: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'task' | 'meeting' | 'personal' | 'habit';
  date: string;
  startTime: string;
  endTime: string;
  taskId?: string;
  projectId?: string;
  description?: string;
  location?: string;
  color?: string;
}

export interface Habit {
  id: string;
  name: string;
  category?: 'health' | 'mindfulness' | 'learning' | 'work' | 'personal';
  frequency?: string;
  targetTime?: string;
  targetDaysPerWeek?: number;
  preferredTime?: string;
  durationMinutes: number;
  streak: number;
  bestStreak?: number;
  completedDates: string[];
  description?: string;
}

export interface KeyResult {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
}

export interface Goal {
  id: string;
  title: string;
  type?: GoalCategory;
  category?: GoalCategory;
  targetDate: string;
  progress: number;
  keyResults: KeyResult[];
  linkedProjectId?: string;
  linkedProjectIds?: string[];
  notes?: string;
}

export interface LifeMetric {
  id: string;
  area: string;
  labelVi: string;
  score: number;
  status: 'good' | 'average' | 'attention';
  note: string;
}
