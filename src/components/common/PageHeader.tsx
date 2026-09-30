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
    <header className="mb-5 flex min-h-11 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate text-[25px] font-extrabold tracking-[-0.025em] text-slate-950 sm:text-[28px]">
          {title}
        </h1>
        {meta ? (
          <span className="inline-flex items-center rounded-full bg-slate-200/65 px-2.5 py-1 text-[11px] font-bold tabular-nums text-slate-600">
            {meta}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {pinEnabled && (
          <button
            type="button"
            onClick={lockApp}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/80 text-slate-400 shadow-sm ring-1 ring-slate-200/70 transition hover:bg-slate-950 hover:text-white"
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
