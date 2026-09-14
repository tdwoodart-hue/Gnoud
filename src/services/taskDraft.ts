import type { Task, TaskPriority } from '../types';

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

export type ImportedProjectTask = Pick<Task, 'title' | 'plannedDate'> & Partial<Pick<
  Task,
  'startTime' | 'estimatedMinutes' | 'description' | 'notes' | 'deadline' | 'priority'
>>;

const normalizeDate = (value: unknown): string => {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  return compact ? `${compact[1]}-${compact[2]}-${compact[3]}` : '';
};

const normalizeTime = (value: unknown): string => {
  const raw = String(value || '').trim();
  const colon = raw.match(/^(\d{1,2}):(\d{2})/);
  if (colon) return `${colon[1].padStart(2, '0')}:${colon[2]}`;
  const dateTime = raw.match(/T(\d{2})(\d{2})/);
  if (dateTime) return `${dateTime[1]}:${dateTime[2]}`;
  const compact = raw.match(/^(\d{2})(\d{2})$/);
  return compact ? `${compact[1]}:${compact[2]}` : '';
};

const durationBetween = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 60;
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;
  if (end < start) end += 24 * 60;
  const duration = end - start;
  return duration > 0 ? duration : 60;
};

const priorityOf = (value: unknown): TaskPriority | undefined => {
  const priority = String(value || '').toLowerCase();
  return ['urgent', 'high', 'medium', 'low'].includes(priority)
    ? priority as TaskPriority
    : undefined;
};

const unescapeIcs = (value: string) =>
  value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();

const parseJsonPlan = (content: string): ImportedProjectTask[] => {
  const parsed = JSON.parse(content);
  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.tasks)
      ? parsed.tasks
      : Array.isArray(parsed?.events)
        ? parsed.events
        : Array.isArray(parsed?.schedule)
          ? parsed.schedule
          : Array.isArray(parsed?.plan)
            ? parsed.plan
            : [];

  return rows.flatMap((row: any) => {
    const title = String(row?.title || row?.summary || row?.name || '').trim();
    const plannedDate = normalizeDate(row?.plannedDate || row?.date || row?.startDate || row?.start);
    if (!title || !plannedDate) return [];

    const startTime = normalizeTime(row?.startTime || row?.time || row?.start);
    const endTime = normalizeTime(row?.endTime || row?.end);
    const rawDuration = Number(row?.estimatedMinutes ?? row?.durationMinutes ?? row?.duration);
    const estimatedMinutes = Number.isFinite(rawDuration) && rawDuration > 0
      ? Math.round(rawDuration)
      : durationBetween(startTime, endTime);
    const priority = priorityOf(row?.priority);
    const deadline = normalizeDate(row?.deadline);
    const description = String(row?.description || '').trim();
    const notes = String(row?.notes || '').trim();

    return [{
      title,
      plannedDate,
      ...(startTime ? { startTime } : {}),
      estimatedMinutes,
      ...(description ? { description } : {}),
      ...(notes ? { notes } : {}),
      ...(deadline ? { deadline } : {}),
      ...(priority ? { priority } : {}),
    }];
  });
};

const parseIcsPlan = (content: string): ImportedProjectTask[] => {
  const unfolded = content.replace(/\r?\n[ \t]/g, '');
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
  const read = (block: string, key: string) => {
    const match = block.match(new RegExp(`^${key}(?:;[^:]*)?:(.*)$`, 'mi'));
    return match ? unescapeIcs(match[1]) : '';
  };

  return blocks.flatMap((block) => {
    const title = read(block, 'SUMMARY');
    const startRaw = read(block, 'DTSTART');
    const endRaw = read(block, 'DTEND');
    const plannedDate = normalizeDate(startRaw);
    if (!title || !plannedDate) return [];

    const startTime = normalizeTime(startRaw);
    const endTime = normalizeTime(endRaw);
    const description = read(block, 'DESCRIPTION');

    return [{
      title,
      plannedDate,
      ...(startTime ? { startTime } : {}),
      estimatedMinutes: durationBetween(startTime, endTime),
      ...(description ? { description } : {}),
    }];
  });
};

export function parseProjectPlanFile(fileName: string, content: string): ImportedProjectTask[] {
  const lowerName = fileName.toLowerCase();
  const trimmed = content.trim();
  const tasks = lowerName.endsWith('.ics') || trimmed.includes('BEGIN:VCALENDAR')
    ? parseIcsPlan(content)
    : parseJsonPlan(content);

  if (!tasks.length) {
    throw new Error('Không tìm thấy công việc hợp lệ. Mỗi mục cần có tên và ngày.');
  }
  return tasks;
}
