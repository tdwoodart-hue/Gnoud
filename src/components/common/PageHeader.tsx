import React from 'react';

export const PageHeader: React.FC<{
  title: string;
  meta?: string;
  action?: React.ReactNode;
}> = ({ title, meta, action }) => (
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
    {action ? <div className="flex shrink-0 items-center justify-end">{action}</div> : null}
  </header>
);

