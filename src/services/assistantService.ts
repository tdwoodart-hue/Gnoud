export type AssistantReadIntent = 'nutrition_today' | 'today_tasks' | 'workout_today';

export interface AssistantHistoryItem {
  id: string;
  text: string;
  createdAt: string;
}

export interface AssistantWindowPosition {
  x: number;
  y: number;
}

const HISTORY_KEY = 'gnoud-assistant-history-v1';
const POSITION_KEY = 'gnoud-assistant-window-v1';
const DRAFT_KEY = 'gnoud-assistant-draft-v1';

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi')
    .replace(/\s+/g, ' ')
    .trim();

export function parseAssistantReadIntent(input: string): AssistantReadIntent | null {
  const value = normalize(input);
  if (!value) return null;

  const today = /\bhom nay\b/.test(value);
  if (
    /(dinh duong|calo|kcal|protein|carb|fat|macro)/.test(value) &&
    (today || /(con bao nhieu|tong|da an|da nap)/.test(value))
  ) {
    return 'nutrition_today';
  }

  if (
    /(buoi tap|tap luyen|gym|workout)/.test(value) &&
    (today || /(dang co|co bai gi|tap gi)/.test(value))
  ) {
    return 'workout_today';
  }

  if (
    /(viec|cong viec|task|lich hom nay|ke hoach)/.test(value) &&
    (today || /(dang co|con gi|can lam)/.test(value))
  ) {
    return 'today_tasks';
  }

  return null;
}

export function loadAssistantHistory(): AssistantHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.text === 'string')
      .slice(0, 8);
  } catch {
    return [];
  }
}

export function pushAssistantHistory(text: string): AssistantHistoryItem[] {
  const clean = text.trim();
  if (!clean || typeof window === 'undefined') return loadAssistantHistory();

  const previous = loadAssistantHistory().filter((item) => item.text !== clean);
  const next: AssistantHistoryItem[] = [
    {
      id: `assistant-history-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: clean,
      createdAt: new Date().toISOString(),
    },
    ...previous,
  ].slice(0, 8);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function clearAssistantHistory(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(HISTORY_KEY);
}

export function loadAssistantPosition(): AssistantWindowPosition | null {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(POSITION_KEY) || 'null');
    if (
      !parsed ||
      typeof parsed.x !== 'number' ||
      typeof parsed.y !== 'number' ||
      !Number.isFinite(parsed.x) ||
      !Number.isFinite(parsed.y)
    ) {
      return null;
    }
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

export function saveAssistantPosition(position: AssistantWindowPosition): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(POSITION_KEY, JSON.stringify(position));
}

export function clearAssistantPosition(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(POSITION_KEY);
}

export function loadAssistantDraft(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(DRAFT_KEY) || '';
}

export function saveAssistantDraft(value: string): void {
  if (typeof window === 'undefined') return;
  if (value.trim()) window.localStorage.setItem(DRAFT_KEY, value);
  else window.localStorage.removeItem(DRAFT_KEY);
}
