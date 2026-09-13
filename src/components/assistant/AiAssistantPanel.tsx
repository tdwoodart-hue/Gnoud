import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  X,
  Send,
  Check,
  Calendar,
  Clock,
  ArrowRight,
  Bot,
  User,
  Lightbulb,
} from 'lucide-react';

export const AiAssistantPanel: React.FC = () => {
  const {
    isAssistantOpen,
    setIsAssistantOpen,
    chatMessages,
    sendChatMessage,
    applyAssistantAction,
    tasks,
    projects,
  } = useApp();

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || isSending) return;
    setInput('');
    setIsSending(true);
    await sendChatMessage(text.trim());
    setIsSending(false);
  };

  const quickPrompts = [
    'Phân tích ngày hôm nay',
    'Gợi ý tối ưu lịch trình',
    'Đánh giá tiến độ dự án',
    'Lên kế hoạch tuần mới',
  ];

  if (!isAssistantOpen) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white border-l border-stone-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-stone-900 text-sm">Trợ lý Lịch Sống</h3>
            <p className="text-[11px] text-stone-500">Đồng hành & tối ưu hóa thời gian</p>
          </div>
        </div>
        <button
          onClick={() => setIsAssistantOpen(false)}
          className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          title="Đóng trợ lý"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-4 py-2.5 bg-stone-50/50 border-b border-stone-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSend(prompt)}
            disabled={isSending}
            className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-white border border-stone-200/80 text-stone-600 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-2xs"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {chatMessages.map((msg) => {
          const isAssistant = msg.sender === 'assistant';
          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isAssistant ? 'items-start' : 'items-end flex-row-reverse'}`}
            >
              {isAssistant ? (
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 border border-blue-100">
                  <Bot className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-stone-800 text-white flex items-center justify-center shrink-0 mb-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[82%] space-y-2`}>
                <div
                  className={`p-3 rounded-2xl leading-relaxed text-xs ${
                    isAssistant
                      ? 'bg-stone-100/80 text-stone-800 rounded-tl-xs'
                      : 'bg-blue-600 text-white rounded-tr-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                {/* Proposed Action Card */}
                {isAssistant && msg.proposedAction && (
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/70 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-800">
                      <Lightbulb className="w-3.5 h-3.5 text-blue-600" />
                      Đề xuất hành động
                    </div>
                    <p className="text-[11px] text-stone-700">
                      {msg.proposedAction.description}
                    </p>

                    <div className="pt-1 flex items-center gap-2">
                      {msg.proposedAction.applied ? (
                        <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                          <Check className="w-3.5 h-3.5" /> Đã áp dụng
                        </span>
                      ) : (
                        <button
                          onClick={() => applyAssistantAction(msg.id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-[11px] rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
                        >
                          <Check className="w-3 h-3" /> Áp dụng ngay
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <span
                  className={`block text-[10px] text-stone-400 px-1 ${
                    !isAssistant ? 'text-right' : ''
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}
        {isSending && (
          <div className="flex items-center gap-2 text-xs text-stone-400 italic">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Trợ lý đang suy nghĩ...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-stone-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Hỏi trợ lý hoặc yêu cầu sắp xếp..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isSending}
            className="flex-1 px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-stone-900"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
