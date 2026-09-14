import { Task } from '../types';

const DRAFT_PREFIX = 'draft-';

export function createTaskDraft(today: string, id = `${DRAFT_PREFIX}${Date.now()}`): Task {
  return {
    id, title: '', description: '', category: 'work', status: 'todo', priority: 'medium',
    plannedDate: today, estimatedMinutes: 60, actualMinutes: 0, subtasks: [], notes: '',
    tags: [], recurrence: 'none', isTopPriority: false, createdAt: today,
  };
}

export function isTaskDraft(task: Task): boolean {
  return task.id.startsWith(DRAFT_PREFIX);
}
