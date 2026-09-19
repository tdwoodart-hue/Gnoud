import type { User } from 'firebase/auth';
import type { LanguageChatActivityConfig } from './taskActivityService';

export interface LanguageTutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  correction?: string;
  hint?: string;
  newWords?: string[];
}

export interface LanguageTutorReply {
  reply: string;
  correction?: string;
  hint?: string;
  newWords: string[];
}

const compactMessages = (messages: LanguageTutorMessage[]) =>
  messages.slice(-12).map((message) => ({
    role: message.role,
    content: message.content,
  }));

export async function requestLanguageTutor(
  user: User | null,
  activity: LanguageChatActivityConfig,
  messages: LanguageTutorMessage[],
  options: { mode: 'start' | 'reply'; message?: string },
): Promise<LanguageTutorReply> {
  if (!user) throw new Error('Đăng nhập Google để dùng chatbot hội thoại.');

  const token = await user.getIdToken();
  const response = await fetch('/api/activity/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      activity: {
        type: activity.type,
        language: activity.language,
        languageName: activity.languageName,
        level: activity.level,
        topic: activity.topic,
        goal: activity.goal,
        correctionMode: activity.correctionMode,
        personaName: activity.personaName,
      },
      messages: compactMessages(messages),
      mode: options.mode,
      message: options.message || '',
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof body?.error === 'string'
        ? body.error
        : 'Không thể kết nối chatbot lúc này.',
    );
  }

  return {
    reply: typeof body.reply === 'string' ? body.reply : '',
    correction: typeof body.correction === 'string' && body.correction.trim()
      ? body.correction.trim()
      : undefined,
    hint: typeof body.hint === 'string' && body.hint.trim()
      ? body.hint.trim()
      : undefined,
    newWords: Array.isArray(body.newWords)
      ? body.newWords.filter((item: unknown): item is string => typeof item === 'string').slice(0, 4)
      : [],
  };
}
