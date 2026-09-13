import { AiSuggestion, CalendarEvent, Goal, Habit, LifeMetric, Project, Task } from '../types';

export const getFormattedToday = (offsetDays = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// New accounts start empty. Users create and own every record shown in the app.
export const INITIAL_TASKS: Task[] = [];
export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [];
export const INITIAL_HABITS: Habit[] = [];
export const INITIAL_GOALS: Goal[] = [];
export const INITIAL_AI_SUGGESTIONS: AiSuggestion[] = [];
export const INITIAL_LIFE_METRICS: LifeMetric[] = [];
