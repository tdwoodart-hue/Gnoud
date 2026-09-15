import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../common/PageHeader';
import { EmptyState } from '../common/EmptyState';
import { formatDisplayDate } from '../../data/mockData';

const iso = (date: Date) => date.toISOString().slice(0, 10);
const dateLabel = (date: Date) => {
  const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(date);
  return `${weekday} · ${formatDisplayDate(iso(date))}`;
};

export const CalendarView: React.FC = () => {
  const { calendarEvents, tasks, openTaskModal } = useApp();
  const [date, setDate] = useState(() => new Date());
  const key = iso(date);

  const items = useMemo(
    () => [
      ...calendarEvents
        .filter((event) => event.date === key)
        .map((event) => ({
          id: `e-${event.id}`,
          title: event.title,
          time: event.startTime,
          end: event.endTime,
          color: event.color || '#2563eb',
        })),
      ...tasks
        .filter(
          (task) =>
            task.plannedDate === key &&
            task.status !== 'done' &&
            !calendarEvents.some((event) => event.taskId === task.id),
        )
        .map((task) => ({
          id: `t-${task.id}`,
          title: task.title,
          time: task.startTime || '--:--',
          end: '',
          color: task.priority === 'urgent' ? '#f43f5e' : '#2563eb',
        })),
    ].sort((a, b) => a.time.localeCompare(b.time)),
    [calendarEvents, tasks, key],
  );

  const move = (days: number) =>
    setDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + days);
      return next;
    });

  return (
    <div className="mx-auto min-w-0 w-full max-w-2xl overflow-x-hidden">
      <PageHeader
        title="Lịch biểu"
        action={
          <button
            type="button"
            onClick={() => openTaskModal()}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-600 text-white shadow-xs transition hover:bg-indigo-700 active:scale-95"
            aria-label="Thêm việc"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      <div className="mb-5 flex min-w-0 items-center justify-between rounded-2xl border border-slate-200/70 bg-white p-2 shadow-xs">
        <button
          type="button"
          onClick={() => move(-1)}
          className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Ngày trước"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setDate(new Date())}
          className="min-w-0 px-3 py-1 text-center transition hover:bg-slate-50 rounded-xl"
        >
          <p className="truncate text-sm font-bold text-slate-900 capitalize">{dateLabel(date)}</p>
          {key !== iso(new Date()) && <span className="text-[11px] font-semibold text-indigo-600">Về hôm nay</span>}
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Ngày sau"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Ngày này đang trống"
          description="Chưa có sự kiện hoặc công việc nào được lên lịch cho ngày này."
          action={
            <button
              type="button"
              onClick={() => openTaskModal()}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
            >
              Lên lịch công việc
            </button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex min-h-[70px] min-w-0 items-center gap-3.5 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-xs transition hover:border-slate-300/80 hover:shadow-sm"
            >
              <div className="w-12 shrink-0 text-xs font-bold text-slate-600 tabular-nums">{item.time}</div>
              <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
                {item.end && <p className="mt-0.5 text-xs text-slate-400">đến {item.end}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
