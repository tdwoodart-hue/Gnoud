
import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { ReadingDailyActivity, ReportRange } from '../../services/reportService';

export const rangeLabels: Record<ReportRange, string> = {
  '7d': '7 ngày',
  '30d': '30 ngày',
  all: 'Toàn bộ',
};

export const whole = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
export const decimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

export const clamp = (value: number) => Math.min(100, Math.max(0, value));

export const formatDuration = (seconds: number) => {
  const minutes = Math.round(Math.max(0, seconds) / 60);
  if (minutes < 60) return minutes + ' phút';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? hours + 'g ' + rest + 'p' : hours + ' giờ';
};

export const formatMinutes = (minutes: number) => {
  const safe = Math.max(0, Math.round(minutes));
  if (safe < 60) return safe + ' phút';
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return rest ? hours + 'g ' + rest + 'p' : hours + ' giờ';
};

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(date + 'T12:00:00'));

export const formatSessionTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export const ProgressBar: React.FC<{ value: number; className?: string }> = ({ value, className = 'bg-indigo-500' }) => (
  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
    <div className={'h-full rounded-full transition-all duration-300 ' + className} style={{ width: clamp(value) + '%' }} />
  </div>
);

export const RangeControl: React.FC<{ value: ReportRange; onChange: (value: ReportRange) => void }> = ({ value, onChange }) => (
  <div className="flex rounded-xl border border-slate-200/70 bg-white p-1 shadow-xs">
    {(Object.keys(rangeLabels) as ReportRange[]).map((range) => (
      <button
        key={range}
        type="button"
        onClick={() => onChange(range)}
        className={'h-8 flex-1 rounded-lg px-3 text-[11px] font-bold transition ' + (
          value === range ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-400 active:bg-slate-50'
        )}
      >
        {rangeLabels[range]}
      </button>
    ))}
  </div>
);

export const MetricCard: React.FC<{
  label: string;
  value: string;
  meta?: string;
  icon: React.FC<{ className?: string }>;
  tone?: string;
}> = ({ label, value, meta, icon: Icon, tone = 'bg-indigo-50 text-indigo-600' }) => (
  <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs">
    <div className="flex items-center justify-between gap-3">
      <p className="text-[11px] font-semibold text-slate-400">{label}</p>
      <span className={'grid h-7 w-7 place-items-center rounded-xl ' + tone}>
        <Icon className="h-3.5 w-3.5" />
      </span>
    </div>
    <p className="mt-2 text-[22px] font-bold tracking-tight tabular-nums text-slate-900">{value}</p>
    {meta ? <p className="mt-1 text-[10px] leading-4 text-slate-400">{meta}</p> : null}
  </div>
);

export const Section: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <section className="space-y-2.5">
    <div>
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-[10px] leading-4 text-slate-400">{subtitle}</p> : null}
    </div>
    {children}
  </section>
);

export const DetailHeader: React.FC<{ title: string; subtitle?: string; onBack: () => void }> = ({ title, subtitle, onBack }) => (
  <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
    <button type="button" onClick={onBack} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-slate-500 shadow-xs active:bg-slate-100" aria-label="Quay lại báo cáo">
      <ArrowLeft className="h-4 w-4" />
    </button>
    <div className="min-w-0 pt-0.5">
      <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">{title}</h1>
      {subtitle ? <p className="mt-0.5 text-[11px] leading-4 text-slate-400">{subtitle}</p> : null}
    </div>
  </div>
);

export const DomainButton: React.FC<{
  title: string;
  value: string;
  meta: string;
  icon: React.FC<{ className?: string }>;
  onClick: () => void;
  tone: string;
}> = ({ title, value, meta, icon: Icon, onClick, tone }) => (
  <button type="button" onClick={onClick} className="flex min-h-[112px] flex-col rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-xs active:bg-slate-50">
    <div className="flex w-full items-center justify-between gap-3">
      <span className={'grid h-9 w-9 place-items-center rounded-xl ' + tone}><Icon className="h-4 w-4" /></span>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </div>
    <p className="mt-3 text-sm font-bold text-slate-900">{title}</p>
    <p className="mt-1 text-lg font-bold tabular-nums text-slate-700">{value}</p>
    <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-slate-400">{meta}</p>
  </button>
);

export const ActivityBars: React.FC<{ rows: Array<{ date: string; planned: number; completed: number }> }> = ({ rows }) => {
  const max = Math.max(1, ...rows.flatMap((row) => [row.planned, row.completed]));
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs">
      <div className="flex min-w-max gap-2">
        {rows.map((row) => (
          <div key={row.date} className="w-10 text-center">
            <div className="mx-auto flex h-24 w-9 items-end justify-center gap-1 rounded-xl bg-slate-50 px-1 pb-2">
              <span className="w-2 rounded-full bg-slate-300" style={{ height: Math.max(4, (row.planned / max) * 72) + '%' }} />
              <span className="w-2 rounded-full bg-indigo-500" style={{ height: Math.max(4, (row.completed / max) * 72) + '%' }} />
            </div>
            <p className="mt-1 text-[9px] font-bold text-slate-500">{formatDate(row.date)}</p>
            <p className="text-[8px] text-slate-400">{row.completed}/{row.planned}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ReadingDailyBars: React.FC<{ rows: ReadingDailyActivity[] }> = ({ rows }) => {
  const visible = rows.slice(-14);
  const max = Math.max(1, ...visible.map((row) => row.totalSeconds));
  return (
    <div className="space-y-2 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs">
      {visible.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">Chưa có hoạt động đọc trong khoảng này</p> : visible.map((row) => (
        <div key={row.date} className="grid grid-cols-[48px_minmax(0,1fr)_54px] items-center gap-2">
          <span className="text-[9px] font-semibold text-slate-500">{formatDate(row.date)}</span>
          <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
            <span className="h-full bg-indigo-500" style={{ width: (row.readingSeconds / max) * 100 + '%' }} />
            <span className="h-full bg-violet-400" style={{ width: (row.listeningSeconds / max) * 100 + '%' }} />
          </div>
          <span className="text-right text-[9px] font-bold tabular-nums text-slate-400">{row.totalSeconds ? Math.round(row.totalSeconds / 60) : 0}p</span>
        </div>
      ))}
      <div className="flex items-center gap-4 border-t border-slate-100 pt-2 text-[9px] font-semibold text-slate-400">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-indigo-500" />Đọc</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-violet-400" />Nghe</span>
      </div>
    </div>
  );
};
