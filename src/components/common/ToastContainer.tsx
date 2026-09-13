import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => {
        let icon = <Info className="w-4 h-4 text-blue-600" />;
        let borderClass = 'border-stone-200 bg-white text-stone-900';

        if (toast.type === 'success') {
          icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
          borderClass = 'border-emerald-200 bg-white text-stone-900';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle className="w-4 h-4 text-amber-600" />;
          borderClass = 'border-amber-200 bg-white text-stone-900';
        } else if (toast.type === 'error') {
          icon = <AlertCircle className="w-4 h-4 text-red-600" />;
          borderClass = 'border-red-200 bg-white text-stone-900';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-xl border shadow-lg transition-all duration-200 text-xs font-medium ${borderClass}`}
          >
            <span className="shrink-0 mt-0.5">{icon}</span>
            <span className="flex-1 leading-relaxed">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-stone-400 hover:text-stone-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
