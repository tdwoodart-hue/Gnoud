import React from 'react';
import { Lock } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const PageHeader: React.FC<{
  title: string;
  meta?: string;
  action?: React.ReactNode;
}> = ({ title, meta, action }) => {
  const { pinEnabled, lockApp } = useSecurity();

  return (
    <header className="mb-6 flex min-h-14 items-center justify-between gap-3 border-b border-slate-100/90 pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {meta ? (
          <span className="inline-flex items-center rounded-full border border-slate-200/60 bg-slate-100/80 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
            {meta}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {pinEnabled && (
          <button
            type="button"
            onClick={lockApp}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white text-slate-500 shadow-xs transition hover:bg-slate-900 hover:text-white"
            title="Khóa ứng dụng ngay"
            aria-label="Khóa ứng dụng"
          >
            <Lock className="h-4 w-4" />
          </button>
        )}
        {action}
      </div>
    </header>
  );
};
