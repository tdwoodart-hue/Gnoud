import React, { useState } from 'react';
import {
  Bell,
  ChevronRight,
  Flame,
  Settings,
  Target,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../common/PageHeader';
import { EmptyState } from '../common/EmptyState';

type Mode = 'goals' | 'habits' | 'life';

export const PersonalView: React.FC = () => {
  const { goals, habits, lifeMetrics, toggleHabitForDate } = useApp();
  const [mode, setMode] = useState<Mode>('goals');
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Cá nhân & Đời sống"
        action={
          <button
            onClick={() => window.dispatchEvent(new Event('lich-song-open-settings'))}
            aria-label="Cài đặt"
            className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white text-slate-500 shadow-xs transition hover:bg-slate-50 hover:text-slate-800"
          >
            <Settings className="h-4 w-4" />
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200/70 bg-slate-100/80 p-1.5 text-xs font-semibold">
        {(
          [
            ['goals', 'Mục tiêu'],
            ['habits', 'Thói quen'],
            ['life', 'Cân bằng'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`h-9 rounded-xl font-bold transition-all ${
              mode === id
                ? 'border border-indigo-100/70 bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {mode === 'goals' && (
          goals.length ? (
            goals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs transition hover:border-slate-300/80 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-indigo-100/60 bg-indigo-50 text-indigo-600">
                      <Target className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{goal.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">Hạn: {goal.targetDate || 'Chưa định'}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-indigo-100/70 bg-indigo-50/80 px-2.5 py-1 text-xs font-bold tabular-nums text-indigo-600">
                    {goal.progress}%
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="Chưa có mục tiêu"
              description="Đặt các mục tiêu quý và năm để theo dõi tiến độ rõ ràng hơn."
            />
          )
        )}

        {mode === 'habits' && (
          habits.length ? (
            habits.map((habit) => {
              const done = habit.completedDates.includes(today);
              return (
                <button
                  key={habit.id}
                  onClick={() => toggleHabitForDate(habit.id, today)}
                  className="flex w-full items-center justify-between gap-3.5 rounded-3xl border border-slate-200/70 bg-white p-4.5 text-left shadow-xs transition hover:border-slate-300/80 hover:shadow-sm active:scale-[0.99]"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl transition-all ${
                        done
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'border border-amber-200/70 bg-amber-50 text-amber-600'
                      }`}
                    >
                      <Flame className="h-5 w-5 fill-current" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{habit.name}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {habit.targetTime || habit.preferredTime || 'Chưa đặt giờ'}
                        </span>
                        <span>·</span>
                        <span>{habit.durationMinutes} phút</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {done ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Đã xong
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                        {habit.streak} ngày streak
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <EmptyState
              title="Chưa có thói quen"
              description="Xây dựng các thói quen hàng ngày để duy trì nhịp sống kỷ luật."
            />
          )
        )}

        {mode === 'life' && (
          lifeMetrics.length ? (
            lifeMetrics.map((metric) => (
              <div
                key={metric.id}
                className="flex items-center justify-between gap-3.5 rounded-3xl border border-slate-200/70 bg-white p-4.5 shadow-xs transition hover:border-slate-300/80 hover:shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full ${
                      metric.status === 'good'
                        ? 'bg-emerald-500 ring-4 ring-emerald-50'
                        : metric.status === 'attention'
                          ? 'bg-rose-500 ring-4 ring-rose-50'
                          : 'bg-amber-400 ring-4 ring-amber-50'
                    }`}
                  />
                  <span className="truncate text-sm font-bold text-slate-900">{metric.labelVi}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400">Điểm số</span>
                  <span className="rounded-xl border border-slate-200/60 bg-slate-100/80 px-2.5 py-0.5 text-sm font-bold tabular-nums text-slate-800">
                    {metric.score}/10
                  </span>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="Chưa có dữ liệu" description="Chưa có chỉ số cân bằng cuộc sống để hiển thị." />
          )
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-xs">
        <button
          onClick={() => window.dispatchEvent(new Event('lich-song-open-settings'))}
          className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition hover:bg-slate-50/60"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
            <Bell className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">Thông báo & Tuỳ chỉnh cá nhân</p>
            <p className="text-xs text-slate-400">Nhắc nhở, tài khoản và dữ liệu ứng dụng</p>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </button>
      </div>
    </div>
  );
};
