import { CalendarEvent, Goal, Habit, LifeMetric, Project, Task } from '../types';

export const getFormattedToday = (offsetDays = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDisplayDate = (value?: string | Date | null): string => {
  if (!value) return '';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${value.getFullYear()}`;
  }

  const input = value.trim();
  if (!input) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) return input;

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return input;
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${parsed.getFullYear()}`;
};

export const INITIAL_TASKS: Task[] = [];
export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [];
export const INITIAL_HABITS: Habit[] = [];
export const INITIAL_GOALS: Goal[] = [];
export const INITIAL_LIFE_METRICS: LifeMetric[] = [];
