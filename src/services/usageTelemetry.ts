export type UsageEventName =
  | 'app_opened'
  | 'navigation_changed'
  | 'task_form_opened'
  | 'task_created'
  | 'task_batch_created'
  | 'task_updated'
  | 'task_completed'
  | 'task_reopened'
  | 'task_deleted'
  | 'task_restored'
  | 'task_permanently_deleted'
  | 'subtask_toggled'
  | 'subtask_added'
  | 'project_created'
  | 'project_updated'
  | 'project_deleted'
  | 'calendar_event_created'
  | 'calendar_event_updated'
  | 'calendar_event_deleted'
  | 'task_scheduled'
  | 'habit_toggled'
  | 'habit_created'
  | 'habit_updated'
  | 'habit_deleted'
  | 'goal_created'
  | 'goal_updated'
  | 'goal_deleted'
  | 'focus_started'
  | 'focus_paused'
  | 'focus_resumed'
  | 'focus_stopped'
  | 'snapshot_exported';

export type TelemetryMetadataValue = string | number | boolean | null;
export type TelemetryMetadata = Record<string, TelemetryMetadataValue>;

export interface UsageEventRecord {
  name: UsageEventName | string;
  timestamp: string;
  metadata?: TelemetryMetadata;
}

export interface DiagnosticErrorRecord {
  timestamp: string;
  message: string;
  source?: string;
}

export interface TelemetrySnapshot {
  events: UsageEventRecord[];
  errors: DiagnosticErrorRecord[];
}

const STORAGE_KEY = 'lich_song_local_telemetry_v1';
const MAX_EVENTS = 400;
const MAX_ERRORS = 50;

const emptySnapshot = (): TelemetrySnapshot => ({ events: [], errors: [] });

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const sanitizeText = (value: unknown, limit: number): string =>
  String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);

const sanitizeMetadata = (metadata?: TelemetryMetadata): TelemetryMetadata | undefined => {
  if (!metadata) return undefined;
  const sanitized: TelemetryMetadata = {};
  Object.entries(metadata).slice(0, 12).forEach(([key, value]) => {
    const safeKey = sanitizeText(key, 40);
    if (!safeKey) return;
    if (typeof value === 'string') {
      sanitized[safeKey] = sanitizeText(value, 120);
      return;
    }
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      sanitized[safeKey] = value;
    }
  });
  return Object.keys(sanitized).length ? sanitized : undefined;
};

const readTelemetry = (): TelemetrySnapshot => {
  if (!canUseStorage()) return emptySnapshot();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as Partial<TelemetrySnapshot>;
    return {
      events: Array.isArray(parsed.events) ? parsed.events.slice(-MAX_EVENTS) : [],
      errors: Array.isArray(parsed.errors) ? parsed.errors.slice(-MAX_ERRORS) : [],
    };
  } catch {
    return emptySnapshot();
  }
};

const writeTelemetry = (value: TelemetrySnapshot): void => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        events: value.events.slice(-MAX_EVENTS),
        errors: value.errors.slice(-MAX_ERRORS),
      }),
    );
  } catch {
    // Telemetry is best-effort and must never interfere with the app.
  }
};

export const recordUsageEvent = (name: UsageEventName | string, metadata?: TelemetryMetadata): void => {
  const telemetry = readTelemetry();
  telemetry.events.push({
    name: sanitizeText(name, 80),
    timestamp: new Date().toISOString(),
    metadata: sanitizeMetadata(metadata),
  });
  writeTelemetry(telemetry);
};

export const recordDiagnosticError = (error: unknown, source?: string): void => {
  const telemetry = readTelemetry();
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? 'Unknown error');
  telemetry.errors.push({
    timestamp: new Date().toISOString(),
    message: sanitizeText(message, 500),
    source: source ? sanitizeText(source.split('/').pop() || source, 120) : undefined,
  });
  writeTelemetry(telemetry);
};

export const getTelemetrySnapshot = (): TelemetrySnapshot => {
  const telemetry = readTelemetry();
  return {
    events: telemetry.events.map((event) => ({
      ...event,
      metadata: event.metadata ? { ...event.metadata } : undefined,
    })),
    errors: telemetry.errors.map((error) => ({ ...error })),
  };
};

export const clearTelemetry = (): void => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
};

export const installGlobalErrorTelemetry = (): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const onError = (event: ErrorEvent) => {
    recordDiagnosticError(event.error || event.message, event.filename || 'window.error');
  };
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    recordDiagnosticError(event.reason, 'unhandledrejection');
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
};
