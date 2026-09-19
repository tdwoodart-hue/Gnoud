import type { Task } from '../types';

export type ActivityCorrectionMode = 'gentle' | 'direct';

export interface LanguageChatActivityConfig {
  type: 'language_chat';
  language: string;
  languageName: string;
  level: string;
  durationMinutes: number;
  autoSpeak: boolean;
  topic: string;
  goal: string;
  correctionMode: ActivityCorrectionMode;
  personaName: string;
  inferred?: boolean;
}

export type TaskActivityConfig = LanguageChatActivityConfig;

export interface ActivitySessionResult {
  type: 'language_chat';
  completedAt: string;
  durationMinutes: number;
  turns: number;
  corrections: number;
  newWords: string[];
}

const ACTIVITY_MARKER = '@activity ';
const RESULT_MARKER = '@activity_result ';

const clampDuration = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 15;
  return Math.max(5, Math.min(60, Math.round(parsed)));
};

const asText = (value: unknown, fallback: string): string => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
};

function normalizeLanguageActivity(raw: unknown): LanguageChatActivityConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (data.type !== 'language_chat') return null;

  return {
    type: 'language_chat',
    language: asText(data.language, 'de-DE'),
    languageName: asText(data.languageName, 'Tiếng Đức'),
    level: asText(data.level, 'A1').toUpperCase(),
    durationMinutes: clampDuration(data.durationMinutes),
    autoSpeak: data.autoSpeak !== false,
    topic: asText(data.topic, 'Hội thoại đời thường'),
    goal: asText(data.goal, 'Duy trì một cuộc hội thoại ngắn và tự nhiên.'),
    correctionMode: data.correctionMode === 'direct' ? 'direct' : 'gentle',
    personaName: asText(data.personaName, 'Mia'),
  };
}

function explicitActivityFromNotes(notes?: string): TaskActivityConfig | null {
  if (!notes) return null;
  const line = notes
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.startsWith(ACTIVITY_MARKER));

  if (!line) return null;
  try {
    return normalizeLanguageActivity(JSON.parse(line.slice(ACTIVITY_MARKER.length)));
  } catch {
    return null;
  }
}

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function inferredLegacyGermanActivity(task: Task): LanguageChatActivityConfig | null {
  const haystack = normalizeForMatch(`${task.title} ${task.description || ''}`);
  const isGerman =
    /\bduc\b/.test(haystack) ||
    haystack.includes('tieng duc') ||
    haystack.includes('deutsch') ||
    haystack.includes('german');

  if (!isGerman) return null;

  const level = task.title.match(/\b(A1|A2|B1|B2|C1|C2)\b/i)?.[1]?.toUpperCase() || 'A1';

  return {
    type: 'language_chat',
    language: 'de-DE',
    languageName: 'Tiếng Đức',
    level,
    durationMinutes: 15,
    autoSpeak: true,
    topic: task.title,
    goal: 'Luyện nói theo nội dung của nhiệm vụ hôm nay và duy trì hội thoại trong 15 phút.',
    correctionMode: 'gentle',
    personaName: 'Mia',
    inferred: true,
  };
}

export function resolveTaskActivity(task: Task): TaskActivityConfig | null {
  return explicitActivityFromNotes(task.notes) || inferredLegacyGermanActivity(task);
}

export function activityNoteLine(activity: TaskActivityConfig): string {
  const { inferred: _inferred, ...serializable } = activity;
  return `${ACTIVITY_MARKER}${JSON.stringify(serializable)}`;
}

export function appendActivityResult(notes: string | undefined, result: ActivitySessionResult): string {
  const base = (notes || '').trimEnd();
  const line = `${RESULT_MARKER}${JSON.stringify(result)}`;
  return base ? `${base}\n${line}` : line;
}

export function getLatestActivityResult(notes?: string): ActivitySessionResult | null {
  if (!notes) return null;
  const rows = notes
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item.startsWith(RESULT_MARKER));

  for (let index = rows.length - 1; index >= 0; index -= 1) {
    try {
      const parsed = JSON.parse(rows[index].slice(RESULT_MARKER.length)) as Partial<ActivitySessionResult>;
      if (
        parsed.type === 'language_chat' &&
        typeof parsed.completedAt === 'string' &&
        typeof parsed.durationMinutes === 'number' &&
        typeof parsed.turns === 'number' &&
        typeof parsed.corrections === 'number'
      ) {
        return {
          type: 'language_chat',
          completedAt: parsed.completedAt,
          durationMinutes: parsed.durationMinutes,
          turns: parsed.turns,
          corrections: parsed.corrections,
          newWords: Array.isArray(parsed.newWords)
            ? parsed.newWords.filter((item): item is string => typeof item === 'string').slice(0, 20)
            : [],
        };
      }
    } catch {
      // Ignore malformed legacy result rows.
    }
  }
  return null;
}
