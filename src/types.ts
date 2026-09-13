export type TaskCategory = 'work' | 'personal';

export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'done' | 'deferred';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export type GoalCategory = 'work' | 'personal' | 'long_term';

export type NavTab = 'today' | 'tasks' | 'calendar' | 'goals' | 'habits' | 'life' | 'reports';

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
  deadline?: string; // YYYY-MM-DD
  plannedDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  estimatedMinutes: number;
  actualMinutes: number;
  subtasks: Subtask[];
  notes?: string;
  tags: string[];
  reminder?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'weekdays' | 'monthly';
  isTopPriority?: boolean; // Top 3 tasks for today
  createdAt: string;
  completedAt?: string;
}

export interface Milestone {
  id: string;
  title: string;
  targetDate?: string;
  completed: boolean;
  weight?: number; // 1-5 for weighted progress
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
  aiHealthSummary?: {
    status: 'healthy' | 'at_risk' | 'needs_attention';
    score: number;
    summary: string;
    recommendations: string[];
  };
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'task' | 'meeting' | 'personal' | 'habit';
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
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
  preferredTime?: string; // HH:mm
  durationMinutes: number;
  streak: number;
  bestStreak?: number;
  completedDates: string[]; // YYYY-MM-DD
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
  progress: number; // 0-100
  keyResults: KeyResult[];
  linkedProjectId?: string;
  linkedProjectIds?: string[];
  notes?: string;
}

export interface AiSuggestion {
  id: string;
  title: string;
  reason: string;
  expectedImpact: string;
  actionType: 'reschedule_task' | 'breakdown_task' | 'fill_gap' | 'rebalance_workload' | 'custom';
  payload: any;
  status: 'pending' | 'applied' | 'dismissed';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  proposedAction?: {
    type: 'create_task' | 'reschedule_task' | 'add_event' | 'schedule_all';
    data: any;
    description: string;
    applied?: boolean;
  };
}

export interface ParsedInputResult {
  title: string;
  type: 'task' | 'event' | 'habit';
  date: string;
  startTime: string;
  estimatedMinutes: number;
  priority: TaskPriority;
  relatedProject: string;
  reminder: string;
  actionType?: string;
  rawInput?: string;
}

export interface LifeMetric {
  id: string;
  area: string;
  labelVi: string;
  score: number; // 1-10
  status: 'good' | 'average' | 'attention';
  note: string;
}
