import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Play, Pause, Square, CheckCircle2, Flame } from 'lucide-react';

export const FocusSessionModal: React.FC = () => {
  const {
    focusTask,
    isFocusRunning,
    focusSecondsLeft,
    focusTotalSeconds,
    pauseFocusSession,
    resumeFocusSession,
    stopFocusSession,
  } = useApp();

  if (!focusTask) return null;

  const minutes = Math.floor(focusSecondsLeft / 60);
  const seconds = focusSecondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent = Math.max(0, Math.min(100, ((focusTotalSeconds - focusSecondsLeft) / focusTotalSeconds) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full p-7 text-center relative overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/70 px-3 py-1 rounded-full">
            <Flame className="w-3.5 h-3.5 fill-current text-amber-500" />
            Phiên làm việc sâu
          </div>
          <button
            onClick={() => stopFocusSession(false)}
            className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            title="Đóng phiên (vẫn lưu thời gian đã thực hiện)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task Info */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-900 leading-snug line-clamp-2">
            {focusTask.title}
          </h3>
          {focusTask.notes && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{focusTask.notes}</p>
          )}
        </div>

        {/* Timer Display */}
        <div className="relative w-48 h-48 mx-auto flex flex-col items-center justify-center my-4">
          {/* Circular SVG Ring */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-slate-100 stroke-current"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-indigo-600 stroke-current transition-all duration-1000 ease-linear"
              strokeWidth="6"
              strokeDasharray={276.46}
              strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold tracking-tight text-slate-900 font-mono">
              {timeFormatted}
            </span>
            <span className="text-xs font-semibold text-slate-400 mt-1">
              {isFocusRunning ? 'Đang tập trung' : 'Tạm dừng'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2.5 mt-6">
          {isFocusRunning ? (
            <button
              onClick={pauseFocusSession}
              className="h-11 px-5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold rounded-2xl text-xs flex items-center gap-2 transition active:scale-95"
            >
              <Pause className="w-4 h-4" /> Tạm dừng
            </button>
          ) : (
            <button
              onClick={resumeFocusSession}
              className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs flex items-center gap-2 transition shadow-xs active:scale-95"
            >
              <Play className="w-4 h-4" /> Tiếp tục
            </button>
          )}

          <button
            onClick={() => stopFocusSession(true)}
            className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs flex items-center gap-2 transition shadow-xs active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" /> Hoàn thành việc
          </button>
        </div>

        {/* Abort button */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={() => stopFocusSession(false)}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1.5 mx-auto transition"
          >
            <Square className="w-3.5 h-3.5" /> Dừng phiên làm việc và lưu thời gian
          </button>
        </div>
      </div>
    </div>
  );
};
