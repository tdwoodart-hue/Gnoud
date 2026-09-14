import React from 'react';

export const PageHeader: React.FC<{
  title: string;
  meta?: string;
  action?: React.ReactNode;
}> = ({ title, meta, action }) => (
  <header className="mb-5 flex h-14 items-center justify-between gap-3 border-b border-slate-200">
    <div className="flex min-w-0 items-baseline gap-2.5">
      <h1 className="truncate text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
      {meta ? <p className="shrink-0 text-xs font-medium tabular-nums text-slate-400">{meta}</p> : null}
    </div>
    <div className="flex h-10 w-10 shrink-0 items-center justify-center">{action}</div>
  </header>
);
