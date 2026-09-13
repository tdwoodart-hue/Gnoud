import React from 'react';
export const EmptyState: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center"><p className="text-sm font-semibold text-slate-500">{title}</p>{action && <div className="mt-4">{action}</div>}</div>;
