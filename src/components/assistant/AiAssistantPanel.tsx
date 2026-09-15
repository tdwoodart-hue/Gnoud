import React, { useEffect, useRef, useState } from 'react';
import { Check, Send, Sparkles, X, Bot } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AiAssistantPanel: React.FC = () => {
  const {
    isAssistantOpen,
    setIsAssistantOpen,
    chatMessages,
    sendChatMessage,
    applyAssistantAction,
  } = useApp();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (!isAssistantOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    try {
      await sendChatMessage(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-xs animate-in fade-in">
      <section className="flex h-full w-full max-w-md flex-col bg-[#fafafc] pt-[env(safe-area-inset-top)] shadow-2xl border-l border-slate-200/60">
        <header className="flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white px-5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-50 text-violet-600 border border-violet-100">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate">Trợ lý Mentor</h2>
            <p className="text-[11px] text-slate-400 truncate">Quản gia & Cố vấn kế hoạch cá nhân</p>
          </div>
          <button
            onClick={() => setIsAssistantOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100/80 text-slate-400 hover:text-slate-600 transition"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-3.5 overflow-y-auto p-4.5">
          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-3xl px-4.5 py-3 text-sm leading-relaxed ${
                  message.sender === 'user'
                    ? 'rounded-tr-xs bg-indigo-600 text-white shadow-xs'
                    : 'rounded-tl-xs bg-white text-slate-800 border border-slate-200/70 shadow-xs'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                {message.proposedAction && !message.proposedAction.applied && (
                  <button
                    onClick={() => applyAssistantAction(message.id)}
                    className="mt-3 flex items-center gap-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-200/70 px-3.5 py-2 text-xs font-bold transition shadow-2xs active:scale-95"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Áp dụng vào lịch
                  </button>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-3xl rounded-tl-xs bg-white text-slate-400 border border-slate-200/70 px-4 py-2.5 text-xs font-medium shadow-xs flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                Trợ lý đang suy nghĩ…
              </div>
            </div>
          )}
          <div ref={end} />
        </div>

        <form
          onSubmit={submit}
          className="flex gap-2 border-t border-slate-200/70 bg-white p-3.5 pb-[max(14px,env(safe-area-inset-bottom))]"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nói chuyện hoặc giao việc cho trợ lý…"
            className="min-w-0 flex-1 rounded-2xl border border-slate-200/80 bg-slate-50/50 px-4 py-2.5 text-xs font-medium text-slate-800 outline-none transition focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
          />
          <button
            disabled={!input.trim() || sending}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-600 text-white shadow-xs transition hover:bg-indigo-700 active:scale-95 disabled:opacity-40"
            aria-label="Gửi"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </section>
    </div>
  );
};

