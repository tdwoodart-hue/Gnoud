import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

interface TutorActivity {
  type: 'language_chat';
  language: string;
  languageName: string;
  level: string;
  topic: string;
  goal: string;
  correctionMode: 'gentle' | 'direct';
  personaName: string;
}

interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
}

const text = (value: unknown, fallback = '', max = 600) => {
  const result = typeof value === 'string' ? value.trim() : '';
  return (result || fallback).slice(0, max);
};

function adminApp(): App {
  if (getApps().length) return getApps()[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return initializeApp({ credential: applicationDefault() });

  let account: any = JSON.parse(raw);
  if (typeof account === 'string') account = JSON.parse(account);
  if (account.private_key) {
    account.private_key = account.private_key.replace(/\\\\n/g, '\n');
  }
  return initializeApp({ credential: cert(account) });
}

async function requireSignedInUser(req: any): Promise<void> {
  const authHeader = String(req.headers?.authorization || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  // Local development can run without Admin credentials.
  const localWithoutAdmin =
    !process.env.VERCEL &&
    process.env.NODE_ENV !== 'production' &&
    !process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (localWithoutAdmin) return;
  if (!token) throw Object.assign(new Error('Đăng nhập Google để dùng chatbot.'), { status: 401 });

  try {
    await getAuth(adminApp()).verifyIdToken(token);
  } catch {
    throw Object.assign(new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'), { status: 401 });
  }
}

function normalizeActivity(value: unknown): TutorActivity {
  if (!value || typeof value !== 'object') {
    throw Object.assign(new Error('Thiếu cấu hình hoạt động.'), { status: 400 });
  }

  const raw = value as Record<string, unknown>;
  if (raw.type !== 'language_chat') {
    throw Object.assign(new Error('Loại hoạt động chưa được hỗ trợ.'), { status: 400 });
  }

  return {
    type: 'language_chat',
    language: text(raw.language, 'de-DE', 20),
    languageName: text(raw.languageName, 'Tiếng Đức', 60),
    level: text(raw.level, 'A1', 10).toUpperCase(),
    topic: text(raw.topic, 'Hội thoại đời thường', 180),
    goal: text(raw.goal, 'Duy trì một cuộc hội thoại ngắn.', 240),
    correctionMode: raw.correctionMode === 'direct' ? 'direct' : 'gentle',
    personaName: text(raw.personaName, 'Mia', 40),
  };
}

function normalizeMessages(value: unknown): TutorMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-12)
    .flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const row = item as Record<string, unknown>;
      const role = row.role === 'assistant' ? 'assistant' : row.role === 'user' ? 'user' : null;
      const content = text(row.content, '', 700);
      return role && content ? [{ role, content }] : [];
    });
}

function outputText(response: any): string {
  if (typeof response?.output_text === 'string') return response.output_text;
  const chunks: string[] = [];
  for (const item of Array.isArray(response?.output) ? response.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (typeof content?.text === 'string') chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}

function parseTutorReply(raw: string) {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  try {
    const parsed = JSON.parse(cleaned);
    const newWords = Array.isArray(parsed?.newWords)
      ? parsed.newWords.filter((item: unknown): item is string => typeof item === 'string').slice(0, 4)
      : [];
    return {
      reply: text(parsed?.reply, cleaned, 1000),
      correction: text(parsed?.correction, '', 300),
      hint: text(parsed?.hint, '', 300),
      newWords,
    };
  } catch {
    return {
      reply: cleaned.slice(0, 1000),
      correction: '',
      hint: '',
      newWords: [],
    };
  }
}

async function generateTutorReply(body: any) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw Object.assign(
      new Error('Chưa cấu hình OPENAI_API_KEY trên server/Vercel.'),
      { status: 503 },
    );
  }

  const activity = normalizeActivity(body?.activity);
  const history = normalizeMessages(body?.messages);
  const mode = body?.mode === 'start' ? 'start' : 'reply';
  const message = text(body?.message, '', 700);

  if (mode === 'reply' && !message) {
    throw Object.assign(new Error('Câu trả lời đang trống.'), { status: 400 });
  }

  const instructions = `
Bạn là ${activity.personaName}, một người bạn hội thoại ${activity.languageName} cho người Việt.
Trình độ người học: CEFR ${activity.level}.
Chủ đề hôm nay: ${activity.topic}.
Mục tiêu: ${activity.goal}.

Cách nói:
- Trò chuyện tự nhiên, không giảng bài dài.
- Mỗi lượt chỉ 1-3 câu ngắn, phù hợp trình độ ${activity.level}.
- Khoảng 80-90% nội dung "reply" phải bằng ${activity.languageName}; chỉ dùng tiếng Việt ở trường correction/hint.
- Mỗi lượt nên kết thúc bằng đúng 1 câu hỏi tự nhiên để người học tiếp tục nói.
- Không tăng độ khó quá nhanh.
- Nếu người học sai, vẫn hiểu ý trước rồi mới sửa.
- correctionMode=${activity.correctionMode}: ${
    activity.correctionMode === 'direct'
      ? 'nêu lỗi rõ nhưng ngắn gọn.'
      : 'chỉ sửa lỗi ảnh hưởng giao tiếp hoặc lỗi quan trọng; giọng điệu nhẹ.'
  }
- "correction" bằng tiếng Việt, tối đa 1 câu. Nếu không cần sửa thì để chuỗi rỗng.
- "hint" bằng tiếng Việt, tối đa 1 câu, gợi ý cách trả lời câu hỏi hiện tại.
- "newWords" gồm 0-3 mục dạng "từ/cụm từ — nghĩa tiếng Việt".
- Không dùng markdown trong reply.
- Trả về DUY NHẤT JSON hợp lệ, không code fence:
{"reply":"...","correction":"","hint":"...","newWords":[]}
`.trim();

  const input = history.map((item) => ({
    role: item.role,
    content: item.content,
  }));

  input.push({
    role: 'user',
    content:
      mode === 'start'
        ? `Hãy bắt đầu phiên ${activity.languageName} ${activity.level}. Chào ngắn gọn theo chủ đề và hỏi câu đầu tiên.`
        : message,
  });

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_ACTIVITY_MODEL || 'gpt-5.6-luna',
      instructions,
      input,
      store: false,
      max_output_tokens: 300,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error?.message;
    console.error('OpenAI activity API error:', response.status, detail || data);
    throw Object.assign(
      new Error(
        response.status === 429
          ? 'Chatbot đang quá tải hoặc API đã chạm giới hạn.'
          : 'Không thể lấy phản hồi từ chatbot lúc này.',
      ),
      { status: response.status >= 400 && response.status < 500 ? response.status : 502 },
    );
  }

  const raw = outputText(data);
  if (!raw) throw Object.assign(new Error('Chatbot trả về phản hồi rỗng.'), { status: 502 });
  return parseTutorReply(raw);
}

export async function activityChatHandler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await requireSignedInUser(req);
    const reply = await generateTutorReply(req.body || {});
    return res.status(200).json(reply);
  } catch (error: any) {
    const status = Number(error?.status) || 500;
    if (status >= 500) console.error('Activity chat error:', error);
    return res.status(status).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
