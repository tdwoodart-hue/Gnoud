import React, { useState } from 'react';
import {
  Bell,
  ChevronRight,
  Flame,
  Settings,
  Sparkles,
  Target,
  Clock,
  Heart,
  Briefcase,
  Layers,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../common/PageHeader';
import { EmptyState } from '../common/EmptyState';

type Mode = 'goals' | 'habits' | 'life';

export const PersonalView: React.FC = () => {
  const { goals, habits, lifeMetrics, toggleHabitForDate, setIsAssistantOpen } = useApp();
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
            className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-500 shadow-xs border border-slate-200/70 transition hover:bg-slate-50 hover:text-slate-800"
          >
            <Settings className="h-4 w-4" />
          </button>
        }
      />

      {/* Segmented Switcher */}
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
                ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100/70'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mode Content */}
      <div className="space-y-3">
        {mode === 'goals' && (
          goals.length ? (
            goals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs transition hover:border-slate-300/80 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100/60">
                      <Target className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{goal.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Hạn: {goal.targetDate || 'Chưa định'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50/80 px-2.5 py-1 rounded-full border border-indigo-100/70 tabular-nums">
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
              description="Đặt các mục tiêu quý và năm để trợ lý giúp bạn theo dõi tiến độ."
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
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl transition-all ${
                        done
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-amber-50 text-amber-600 border border-amber-200/70'
                      }`}
                    >
                      <Flame className="h-5 w-5 fill-current" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{habit.name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {habit.targetTime}
                        </span>
                        <span>·</span>
                        <span>{habit.durationMinutes} phút</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {done ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-3 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đã xong
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/70 px-3 py-1 rounded-full">
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
                <div className="flex items-center gap-3 min-w-0">
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
                  <span className="text-xs text-slate-400 font-medium">Điểm số</span>
                  <span className="text-sm font-bold text-slate-800 bg-slate-100/80 px-2.5 py-0.5 rounded-xl border border-slate-200/60 tabular-nums">
                    {metric.score}/10
                  </span>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="Chưa có dữ liệu" description="Đang khởi tạo các chỉ số cân bằng cuộc sống." />
          )
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-xs divide-y divide-slate-100">
        <button
          onClick={() => setIsAssistantOpen(true)}
          className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition hover:bg-slate-50/60"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600 border border-violet-100">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">Trợ lý Cố vấn & Quản gia (Chief of Staff)</p>
            <p className="text-xs text-slate-400">Trò chuyện, nhận tư vấn và điều chỉnh lịch trình</p>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </button>

        <button
          onClick={() => window.dispatchEvent(new Event('lich-song-open-settings'))}
          className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition hover:bg-slate-50/60"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Bell className="h-4.5 w-4.5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">Thông báo & Tuỳ chỉnh cá nhân</p>
            <p className="text-xs text-slate-400">Âm thanh, nhắc nhở và sở thích hiển thị</p>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </button>
      </div>
    </div>
  );
};

