import React from 'react';
import { Sparkles } from 'lucide-react';

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200/90 bg-white/60 p-8 text-center backdrop-blur-xs">
    <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl border border-indigo-100/80 bg-indigo-50/60 text-indigo-500">
      <Sparkles className="h-5 w-5" />
    </div>
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    {description ? (
      <p className="mt-1 max-w-xs text-xs text-slate-400">{description}</p>
    ) : null}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

