import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Habit } from '../../types';
import {
  Flame,
  Plus,
  Check,
  Calendar,
  Clock,
  RotateCcw,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { getFormattedToday } from '../../data/mockData';

export const HabitsView: React.FC = () => {
  const { habits, addHabit, toggleHabitDate, addToast } = useApp();
  const [isAddingHabit, setIsAddingHabit] = useState(false);

  // New habit form state
  const [habitName, setHabitName] = useState('');
  const [habitTargetTime, setHabitTargetTime] = useState('06:30');
  const [habitDuration, setHabitDuration] = useState(30);

  // 7 days of the current week (T2 -> CN)
  const daysOfWeek = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const weekDates = [-1, 0, 1, 2, 3, 4, 5].map((offset) => getFormattedToday(offset));

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) return;

    addHabit({
      name: habitName.trim(),
      frequency: 'daily',
      targetTime: habitTargetTime,
      durationMinutes: habitDuration,
      streak: 1,
      bestStreak: 1,
      completedDates: [getFormattedToday(0)],
    });

    setHabitName('');
    setIsAddingHabit(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Thói quen & Kỷ luật bản thân</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Duy trì chuỗi ngày liên tiếp (streak) và xây dựng lối sống cân bằng, bền vững
          </p>
        </div>

        <button
          onClick={() => setIsAddingHabit(true)}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs self-start"
        >
          <Plus className="w-3.5 h-3.5" /> Tạo thói quen mới
        </button>
      </div>

      {/* Habits Card List */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="p-4 border-b border-stone-100 grid grid-cols-12 gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
          <div className="col-span-5 sm:col-span-4">Thói quen</div>
          <div className="col-span-2 hidden sm:block text-center">Chuỗi ngày (Streak)</div>
          <div className="col-span-7 sm:col-span-6 grid grid-cols-7 gap-1 text-center">
            {daysOfWeek.map((d, i) => (
              <span key={d} className={i === 1 ? 'text-blue-600 font-extrabold' : ''}>
                {d}
              </span>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-stone-100">
          {habits.map((h) => {
            // Calculate completed count in the 7-day window
            const completedInWeek = weekDates.filter((d) => h.completedDates.includes(d)).length;
            const weekPercentage = Math.round((completedInWeek / 7) * 100);

            return (
              <div
                key={h.id}
                className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-stone-50/60 transition-colors"
              >
                {/* Name & Target Info */}
                <div className="col-span-5 sm:col-span-4 space-y-0.5">
                  <span className="text-sm font-semibold text-stone-900 block leading-snug">
                    {h.name}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" />
                      {h.targetTime} ({h.durationMinutes}p)
                    </span>
                    <span>• {weekPercentage}% tuần này</span>
                  </div>
                </div>

                {/* Streak */}
                <div className="col-span-2 hidden sm:flex items-center justify-center gap-1.5 text-xs">
                  <span className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    {h.streak} ngày
                  </span>
                  <span className="text-[10px] text-stone-400" title="Kỷ lục cao nhất">
                    (Max: {h.bestStreak})
                  </span>
                </div>

                {/* 7-day check grid */}
                <div className="col-span-7 sm:col-span-6 grid grid-cols-7 gap-1">
                  {weekDates.map((dateStr, idx) => {
                    const isDone = h.completedDates.includes(dateStr);
                    const isToday = dateStr === getFormattedToday(0);

                    return (
                      <div key={dateStr} className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => toggleHabitDate(h.id, dateStr)}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                            isDone
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : isToday
                              ? 'border-2 border-dashed border-blue-400 hover:bg-blue-50 text-stone-300'
                              : 'bg-stone-100 hover:bg-stone-200 text-transparent hover:text-stone-400'
                          }`}
                          title={`${dateStr}: ${isDone ? 'Đã hoàn thành' : 'Chưa đánh dấu'}`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Motivational insight banner */}
      <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs text-stone-700 leading-relaxed space-y-1">
          <span className="font-bold text-emerald-900 block">Lời khuyên duy trì phong độ:</span>
          Duy trì thói quen đi bộ và học tiếng Anh liên tiếp 14 ngày đã giúp bạn tăng khả năng tập trung buổi sáng thêm 25%. Trợ lý đã tự động chừa 30 phút buổi tối để bạn không bị các việc đột xuất chiếm mất.
        </div>
      </div>

      {/* New Habit Modal */}
      {isAddingHabit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Tạo thói quen mới</h3>
              <button
                onClick={() => setIsAddingHabit(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateHabit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Tên thói quen</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Thiền định buổi sáng, Đọc sách 20 trang..."
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Khung giờ thực hiện</label>
                  <input
                    type="time"
                    value={habitTargetTime}
                    onChange={(e) => setHabitTargetTime(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Thời lượng (phút)</label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={habitDuration}
                    onChange={(e) => setHabitDuration(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingHabit(false)}
                  className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
                >
                  Bắt đầu thói quen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
