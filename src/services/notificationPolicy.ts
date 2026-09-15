export interface NotificationPreferences {
  previousDayEnabled: boolean;
  previousDayTime: string;
  beforeStartMinutes: 0 | 15 | 30 | 60 | 120;
  atStartEnabled: boolean;
}

export interface ReminderPolicy {
  leadMinutes: number[];
  chaseMinutes: null;
  level: 'Nhẹ';
  previousDayLeadMinutes: number | null;
  beforeStartMinutes: number | null;
  atStartEnabled: boolean;
}

export interface TaskReminderSchedule {
  startTime: string;
  actualStartTime: string | null;
  policy: ReminderPolicy;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  previousDayEnabled: true,
  previousDayTime: '20:00',
  beforeStartMinutes: 60,
  atStartEnabled: false,
};

const STORAGE_KEY = 'lich_song_notification_preferences_v1';
const VALID_BEFORE_MINUTES = new Set([0, 15, 30, 60, 120]);

function normalizeTime(value: unknown): string {
  const raw = String(value || '').trim();
  const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? `${match[1]}:${match[2]}` : DEFAULT_NOTIFICATION_PREFERENCES.previousDayTime;
}

function normalizeBeforeMinutes(value: unknown): NotificationPreferences['beforeStartMinutes'] {
  const minutes = Number(value);
  return VALID_BEFORE_MINUTES.has(minutes)
    ? minutes as NotificationPreferences['beforeStartMinutes']
    : DEFAULT_NOTIFICATION_PREFERENCES.beforeStartMinutes;
}

export function normalizeNotificationPreferences(value?: Partial<NotificationPreferences> | null): NotificationPreferences {
  return {
    previousDayEnabled: value?.previousDayEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.previousDayEnabled,
    previousDayTime: normalizeTime(value?.previousDayTime),
    beforeStartMinutes: normalizeBeforeMinutes(value?.beforeStartMinutes),
    atStartEnabled: value?.atStartEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.atStartEnabled,
  };
}

export function getNotificationPreferences(): NotificationPreferences {
  if (typeof localStorage === 'undefined') return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeNotificationPreferences(raw ? JSON.parse(raw) : null);
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function saveNotificationPreferences(value: Partial<NotificationPreferences>): NotificationPreferences {
  const next = normalizeNotificationPreferences({ ...getNotificationPreferences(), ...value });
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

const minutesOfDay = (time: string): number => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

export function buildTaskReminderSchedule(
  _plannedDate: string,
  startTime: string | undefined,
  rawPreferences: NotificationPreferences,
): TaskReminderSchedule {
  const preferences = normalizeNotificationPreferences(rawPreferences);
  const actualStartTime = startTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ? startTime : null;
  const effectiveStartTime = actualStartTime || preferences.previousDayTime;
  const leadMinutes: number[] = [];

  let previousDayLeadMinutes: number | null = null;
  if (preferences.previousDayEnabled) {
    previousDayLeadMinutes = actualStartTime
      ? 1440 + minutesOfDay(actualStartTime) - minutesOfDay(preferences.previousDayTime)
      : 1440;
    if (previousDayLeadMinutes > 0) leadMinutes.push(previousDayLeadMinutes);
  }

  const beforeStartMinutes = actualStartTime && preferences.beforeStartMinutes > 0
    ? preferences.beforeStartMinutes
    : null;
  if (beforeStartMinutes) leadMinutes.push(beforeStartMinutes);
  if (actualStartTime && preferences.atStartEnabled) leadMinutes.push(0);

  return {
    startTime: effectiveStartTime,
    actualStartTime,
    policy: {
      leadMinutes: [...new Set(leadMinutes)].sort((a, b) => b - a),
      chaseMinutes: null,
      level: 'Nhẹ',
      previousDayLeadMinutes,
      beforeStartMinutes,
      atStartEnabled: Boolean(actualStartTime && preferences.atStartEnabled),
    },
  };
}
