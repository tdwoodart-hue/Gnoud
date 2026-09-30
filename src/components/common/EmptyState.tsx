import React from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, description, action, icon }) => (
  <div className="flex min-h-44 flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200/80 bg-white/45 p-6 text-center backdrop-blur-sm">
    <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200/70">
      {icon || <Inbox className="h-5 w-5" />}
    </div>
    <p className="text-sm font-bold text-slate-800">{title}</p>
    {description ? (
      <p className="mt-1.5 max-w-xs text-[12px] leading-5 text-slate-400">{description}</p>
    ) : null}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

