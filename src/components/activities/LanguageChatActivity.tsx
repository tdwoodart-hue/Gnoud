import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Gauge,
  Lightbulb,
  Mic,
  Send,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  requestLanguageTutor,
  type LanguageTutorMessage,
} from '../../services/activityChatService';
import type {
  ActivitySessionResult,
  LanguageChatActivityConfig,
} from '../../services/taskActivityService';

interface Props {
  user: User | null;
  taskTitle: string;
  activity: LanguageChatActivityConfig;
  onClose: () => void;
  onFinish: (result: ActivitySessionResult) => void;
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const formatTimer = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const unique = (values: string[]) => [...new Set(values.map((item) => item.trim()).filter(Boolean))];

export const LanguageChatActivity: React.FC<Props> = ({
  user,
  taskTitle,
  activity,
  onClose,
  onFinish,
}) => {
  const totalSeconds = activity.durationMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [messages, setMessages] = useState<LanguageTutorMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [hintMessageId, setHintMessageId] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const speechRecognitionCtor = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const browser = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    return browser.SpeechRecognition || browser.webkitSpeechRecognition || null;
  }, []);

  const userTurns = messages.filter((message) => message.role === 'user').length;
  const corrections = messages.filter(
    (message) => message.role === 'assistant' && Boolean(message.correction),
  ).length;
  const learnedWords = unique(messages.flatMap((message) => message.newWords || [])).slice(0, 12);
  const latestAssistant = [...messages].reverse().find((message) => message.role === 'assistant');

  useEffect(() => {
    if (!started || ended) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          setEnded(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [started, ended]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }, []);

  const speak = (text: string, rate = 0.92) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = activity.language;
    utterance.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    const prefix = activity.language.split('-')[0].toLowerCase();
    const matchingVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix));
    if (matchingVoice) utterance.voice = matchingVoice;
    window.speechSynthesis.speak(utterance);
  };

  const addAssistantReply = (reply: {
    reply: string;
    correction?: string;
    hint?: string;
    newWords: string[];
  }) => {
    const next: LanguageTutorMessage = {
      id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'assistant',
      content: reply.reply,
      correction: reply.correction,
      hint: reply.hint,
      newWords: reply.newWords,
    };
    setMessages((current) => [...current, next]);
    if (activity.autoSpeak) speak(reply.reply);
  };

  const start = async () => {
    if (loading) return;
    setStarted(true);
    setLoading(true);
    setError('');
    try {
      const reply = await requestLanguageTutor(user, activity, [], { mode: 'start' });
      addAssistantReply(reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể bắt đầu phiên hội thoại.');
    } finally {
      setLoading(false);
    }
  };

  const send = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || loading || ended) return;

    const userMessage: LanguageTutorMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: text,
    };

    setMessages((current) => [...current, userMessage]);
    setDraft('');
    setLoading(true);
    setError('');
    setHintMessageId(null);

    try {
      const reply = await requestLanguageTutor(user, activity, messages, {
        mode: 'reply',
        message: text,
      });
      addAssistantReply(reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi câu trả lời.');
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    if (!speechRecognitionCtor || listening || ended) return;
    const recognition = new speechRecognitionCtor();
    recognition.lang = activity.language;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript;
      if (typeof transcript === 'string') setDraft(transcript);
    };
    recognition.onerror = () => {
      setListening(false);
      setError('Không nhận được giọng nói. Mày có thể gõ câu trả lời thay thế.');
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    setError('');
    recognition.start();
  };

  const finish = () => {
    const elapsed = Math.max(1, Math.round((totalSeconds - secondsLeft) / 60));
    onFinish({
      type: 'language_chat',
      completedAt: new Date().toISOString(),
      durationMinutes: elapsed,
      turns: userTurns,
      corrections,
      newWords: learnedWords,
    });
  };

  return (
    <div className="fixed inset-0 z-[170] overflow-y-auto bg-[#f7f8fa] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-2xl items-center gap-3 px-4 sm:px-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">
              {activity.languageName} · {activity.level}
            </p>
            <p className="truncate text-xs text-slate-400">{activity.topic || taskTitle}</p>
          </div>
          <span className={`rounded-xl px-3 py-1.5 text-sm font-extrabold tabular-nums ${
            ended ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
          }`}>
            {formatTimer(secondsLeft)}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-500"
            aria-label="Đóng phiên luyện"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-[max(28px,env(safe-area-inset-bottom))] pt-4 sm:px-5">
        {!started ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-7">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">{activity.level}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">{activity.durationMinutes} phút</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">Hội thoại</span>
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
              Nói thật, sửa nhẹ, không học kiểu đọc bài
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {activity.goal}
            </p>

            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                <Volume2 className="mb-2 h-4 w-4 text-indigo-500" />
                Bot tự đọc câu {activity.languageName}
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                <Mic className="mb-2 h-4 w-4 text-indigo-500" />
                Nói hoặc gõ câu trả lời
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                <Lightbulb className="mb-2 h-4 w-4 text-indigo-500" />
                Có gợi ý tiếng Việt khi bí
              </div>
            </div>

            {!user ? (
              <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
                Đăng nhập Google trước để dùng chatbot.
              </p>
            ) : null}

            {error ? <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p> : null}

            <button
              type="button"
              onClick={() => void start()}
              disabled={!user || loading}
              className="mt-6 h-12 w-full rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-xs transition hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400"
            >
              {loading ? 'Đang mở cuộc trò chuyện…' : `Bắt đầu ${activity.durationMinutes} phút`}
            </button>
          </section>
        ) : (
          <>
            <div
              ref={scrollerRef}
              className="max-h-[58dvh] min-h-[360px] space-y-3 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[88%] ${
                    message.role === 'user'
                      ? 'rounded-[20px] rounded-br-md bg-indigo-600 px-4 py-3 text-white'
                      : 'space-y-2'
                  }`}>
                    {message.role === 'assistant' ? (
                      <>
                        <div className="rounded-[20px] rounded-bl-md bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-800">
                          {message.content}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => speak(message.content)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
                          >
                            <Volume2 className="h-3.5 w-3.5" /> Nghe
                          </button>
                          <button
                            type="button"
                            onClick={() => speak(message.content, 0.7)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
                          >
                            <Gauge className="h-3.5 w-3.5" /> Nói chậm
                          </button>
                          {message.hint ? (
                            <button
                              type="button"
                              onClick={() => setHintMessageId(
                                hintMessageId === message.id ? null : message.id,
                              )}
                              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-semibold text-amber-700"
                            >
                              <Lightbulb className="h-3.5 w-3.5" /> Gợi ý
                            </button>
                          ) : null}
                        </div>
                        {message.correction ? (
                          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] leading-5 text-emerald-700">
                            <strong>Sửa nhẹ:</strong> {message.correction}
                          </p>
                        ) : null}
                        {hintMessageId === message.id && message.hint ? (
                          <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-700">
                            {message.hint}
                          </p>
                        ) : null}
                        {message.newWords?.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {message.newWords.map((word) => (
                              <span
                                key={word}
                                className="rounded-lg bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700"
                              >
                                {word}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-sm leading-6">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {loading ? (
                <div className="flex justify-start">
                  <div className="rounded-[20px] rounded-bl-md bg-slate-100 px-4 py-3 text-sm font-medium text-slate-400">
                    {activity.personaName} đang trả lời…
                  </div>
                </div>
              ) : null}

              {error ? (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                  {error}
                </p>
              ) : null}
            </div>

            {ended ? (
              <section className="mt-3 rounded-3xl border border-emerald-200 bg-white p-5 shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-base font-bold text-slate-900">Xong phiên hôm nay</h2>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xl font-extrabold text-slate-900">{userTurns}</p>
                    <p className="text-[10px] font-semibold text-slate-400">lượt nói</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xl font-extrabold text-slate-900">{learnedWords.length}</p>
                    <p className="text-[10px] font-semibold text-slate-400">từ mới</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xl font-extrabold text-slate-900">{corrections}</p>
                    <p className="text-[10px] font-semibold text-slate-400">lần sửa</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={finish}
                  className="mt-4 h-12 w-full rounded-2xl bg-emerald-600 text-sm font-bold text-white"
                >
                  Lưu kết quả & hoàn thành task
                </button>
              </section>
            ) : (
              <form onSubmit={(event) => void send(event)} className="mt-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-xs">
                <div className="flex items-end gap-2">
                  <textarea
                    rows={1}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void send();
                      }
                    }}
                    placeholder={`Trả lời bằng ${activity.languageName}…`}
                    className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-2xl bg-slate-50 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:ring-indigo-300"
                  />
                  <button
                    type="button"
                    onClick={startListening}
                    disabled={!speechRecognitionCtor || listening || loading}
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                      listening
                        ? 'bg-rose-100 text-rose-600'
                        : 'bg-slate-100 text-slate-600 disabled:text-slate-300'
                    }`}
                    aria-label="Nói câu trả lời"
                    title={speechRecognitionCtor ? 'Nói câu trả lời' : 'Trình duyệt chưa hỗ trợ nhập giọng nói'}
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={!draft.trim() || loading}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white disabled:bg-slate-200 disabled:text-slate-400"
                    aria-label="Gửi"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[10px] font-medium text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3" /> {userTurns} lượt hội thoại
                  </span>
                  {latestAssistant ? <span>Bot tự sửa nhẹ khi cần</span> : null}
                </div>
              </form>
            )}

            {!ended ? (
              <button
                type="button"
                onClick={() => setEnded(true)}
                className="mt-3 h-10 w-full text-xs font-semibold text-slate-400 hover:text-slate-700"
              >
                Kết thúc sớm
              </button>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
};
