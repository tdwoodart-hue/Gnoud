export interface ScheduledTask {
  id: string;
  title: string;
  plannedDate: string;
  startTime: string;
  status: string;
  policy: { leadMinutes: number[]; chaseMinutes: number | null; level: 'Nhẹ' | 'Vừa' | 'Mạnh' };
}

export interface PushMessage { key: string; title: string; body: string }

function dueAt(task: ScheduledTask): number {
  return new Date(`${task.plannedDate}T${task.startTime}:00+07:00`).getTime();
}

export function notificationForTask(task: ScheduledTask, now: number, sent = new Set<string>()): PushMessage | null {
  if (task.status === 'done') return null;
  const start = dueAt(task);
  const minute = 60_000;
  for (const lead of task.policy.leadMinutes) {
    const target = start - lead * minute;
    const key = lead === 0 ? `${task.id}:start` : `${task.id}:lead:${lead}`;
    if (now >= target && now < target + 5 * minute && !sent.has(key)) {
      return lead === 0
        ? { key: `${task.id}:start`, title: 'Đến giờ bắt đầu', body: task.title }
        : { key: `${task.id}:lead:${lead}`, title: `Còn ${lead} phút`, body: task.title };
    }
  }
  if (task.policy.chaseMinutes && now > start) {
    const chaseNumber = Math.floor((now - start) / (task.policy.chaseMinutes * minute));
    const key = `${task.id}:chase:${chaseNumber}`;
    if (chaseNumber >= 1 && !sent.has(key)) return {
      key,
      title: task.policy.level === 'Mạnh' ? 'Bắt đầu ngay' : 'Việc đang chờ bạn',
      body: `${task.title} vẫn chưa được hoàn thành.`,
    };
  }
  return null;
}
