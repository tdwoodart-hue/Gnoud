import React, { useEffect, useRef, useState } from 'react';
import { Check, Send, Sparkles, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AiAssistantPanel: React.FC = () => {
  const { isAssistantOpen, setIsAssistantOpen, chatMessages, sendChatMessage, applyAssistantAction } = useApp();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({behavior:'smooth'}), [chatMessages]);
  if (!isAssistantOpen) return null;
  const submit = async (event: React.FormEvent) => { event.preventDefault(); const text = input.trim(); if (!text || sending) return; setInput(''); setSending(true); try { await sendChatMessage(text); } finally { setSending(false); } };
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/30"><section className="flex h-full w-full max-w-md flex-col bg-[#f7f8fa] pt-[env(safe-area-inset-top)] shadow-2xl">
    <header className="flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-600"><Sparkles className="h-5 w-5" /></span><h2 className="flex-1 font-bold">Trợ lý</h2><button onClick={() => setIsAssistantOpen(false)} className="p-2 text-slate-400" aria-label="Đóng"><X /></button></header>
    <div className="flex-1 space-y-3 overflow-y-auto p-4">{chatMessages.map((message) => <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}><p className="whitespace-pre-wrap">{message.text}</p>{message.proposedAction && !message.proposedAction.applied && <button onClick={() => applyAssistantAction(message.id)} className="mt-3 flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"><Check className="h-3 w-3" />Áp dụng</button>}</div></div>)}{sending && <p className="text-xs font-medium text-slate-400">Đang xử lý…</p>}<div ref={end} /></div>
    <form onSubmit={submit} className="flex gap-2 border-t border-slate-200 bg-white p-3 pb-[max(12px,env(safe-area-inset-bottom))]"><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Nhập yêu cầu…" className="min-w-0 flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30" /><button disabled={!input.trim() || sending} className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></form>
  </section></div>;
};
