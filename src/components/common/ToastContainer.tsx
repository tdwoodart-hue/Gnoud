import React from 'react';
import { useApp } from '../../context/AppContext';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();
  const toast = toasts[toasts.length - 1];

  if (!toast) return null;

  let icon = <Info className="h-4 w-4 text-blue-600" />;
  if (toast.type === 'success') icon = <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (toast.type === 'warning') icon = <AlertTriangle className="h-4 w-4 text-amber-600" />;
  if (toast.type === 'error') icon = <AlertCircle className="h-4 w-4 text-rose-600" />;

  return (
    <div className="pointer-events-none fixed left-1/2 top-[max(12px,env(safe-area-inset-top))] z-[140] w-[calc(100%-24px)] max-w-md -translate-x-1/2">
      <div className="pointer-events-auto flex h-11 items-center gap-2 rounded-2xl border border-stone-200 bg-white/95 px-3 shadow-lg shadow-black/10 backdrop-blur">
        <span className="shrink-0">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-800">
          {toast.message}
        </span>
        {toast.actionLabel && toast.onAction ? (
          <button
            type="button"
            onClick={() => {
              toast.onAction?.();
              removeToast(toast.id);
            }}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-blue-600 active:bg-blue-50"
          >
            {toast.actionLabel}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => removeToast(toast.id)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-stone-400 active:bg-stone-100"
          aria-label="Đóng thông báo"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
