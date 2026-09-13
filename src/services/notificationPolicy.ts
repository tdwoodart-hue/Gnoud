import type { TaskPriority } from '../types';

export interface ReminderPolicy {
  leadMinutes: number[];
  chaseMinutes: number | null;
  level: 'Nhẹ' | 'Vừa' | 'Mạnh';
}

export function getReminderPolicy(priority: TaskPriority, isTopPriority: boolean): ReminderPolicy {
  if (priority === 'urgent' || isTopPriority) {
    return { leadMinutes: [30, 15, 0], chaseMinutes: 15, level: 'Mạnh' };
  }
  if (priority === 'high') {
    return { leadMinutes: [15, 0], chaseMinutes: 30, level: 'Mạnh' };
  }
  if (priority === 'low') {
    return { leadMinutes: [0], chaseMinutes: null, level: 'Nhẹ' };
  }
  return { leadMinutes: [15, 0], chaseMinutes: 60, level: 'Vừa' };
}
