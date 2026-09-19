import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Goal, GoalCategory } from '../../types';
import {
  Target,
  Plus,
  TrendingUp,
  CheckCircle2,
  Circle,
  AlertCircle,
  Calendar,
  Layers,
  ArrowRight,
  X,
} from 'lucide-react';
import { getFormattedToday } from '../../data/mockData';

export const GoalsView: React.FC = () => {
  const { goals, addGoal, updateGoal, projects, addToast } = useApp();

  const [activeCategory, setActiveCategory] = useState<'all' | GoalCategory>('all');
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  // New goal state
  const [goalTitle, setGoalTitle] = useState('');
  const [goalCategory, setGoalCategory] = useState<GoalCategory>('work');
  const [goalTargetDate, setGoalTargetDate] = useState(getFormattedToday(60));
  const [goalKr1, setGoalKr1] = useState('');
  const [goalKr2, setGoalKr2] = useState('');

  const filteredGoals = goals.filter((g) => {
    if (activeCategory === 'all') return true;
    return g.category === activeCategory;
  });

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    const keyResults = [];
    if (goalKr1.trim()) {
      keyResults.push({ id: `kr-${Date.now()}-1`, title: goalKr1.trim(), target: 100, current: 0, unit: '%' });
    }
    if (goalKr2.trim()) {
      keyResults.push({ id: `kr-${Date.now()}-2`, title: goalKr2.trim(), target: 100, current: 0, unit: '%' });
    }

    addGoal({
      title: goalTitle.trim(),
      category: goalCategory,
      targetDate: goalTargetDate,
      progress: 0,
      keyResults,
    });

    setGoalTitle('');
    setGoalKr1('');
    setGoalKr2('');
    setIsAddingGoal(false);
  };

  const handleIncrementKr = (goal: Goal, krId: string, current: number, target: number) => {
    const nextCurrent = Math.min(target, current + 20);
    const updatedKrs = goal.keyResults.map((kr) =>
      kr.id === krId ? { ...kr, current: nextCurrent } : kr
    );
    // calculate average
    const avgProgress = Math.round(
      updatedKrs.reduce((acc, k) => acc + (k.current / k.target) * 100, 0) / updatedKrs.length
    );

    updateGoal(goal.id, {
      keyResults: updatedKrs,
      progress: avgProgress,
    });
    addToast('Đã cập nhật tiến độ kết quả then chốt', 'success');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Mục tiêu & OKR</h1>
          <p className="text-xs text-slate-400 mt-1">
            Định hình hướng đi, theo dõi kết quả then chốt (Key Results) và không để mục tiêu bị lãng quên
          </p>
        </div>

        <button
          onClick={() => setIsAddingGoal(true)}
          className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs self-start active:scale-95"
        >
          <Plus className="w-4 h-4" /> Mục tiêu mới
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/70 self-start">
        {(
          [
            { id: 'all', label: 'Tất cả mục tiêu' },
            { id: 'work', label: 'Công việc' },
            { id: 'personal', label: 'Cá nhân' },
            { id: 'long_term', label: 'Dài hạn' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeCategory === tab.id
                ? 'border border-indigo-100/70 bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {filteredGoals.map((g) => {
          const linkedProject = projects.find((p) => p.id === g.linkedProjectId);
          const isNeglected = g.progress < 30;

          return (
            <div
              key={g.id}
              className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/70 shadow-xs space-y-4 flex flex-col justify-between transition hover:border-slate-300/80 hover:shadow-sm"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                      g.category === 'work'
                        ? 'border-indigo-100 bg-indigo-50/80 text-indigo-700'
                        : g.category === 'personal'
                        ? 'border-emerald-100 bg-emerald-50/80 text-emerald-700'
                        : 'border-purple-100 bg-purple-50/80 text-purple-700'
                    }`}
                  >
                    {g.category === 'work'
                      ? 'Công việc'
                      : g.category === 'personal'
                      ? 'Cá nhân'
                      : 'Dài hạn'}
                  </span>

                  {isNeglected && (
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full flex items-center gap-1 border border-amber-200/70">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Cần chú ý tiến độ
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-base leading-snug">{g.title}</h3>

                {linkedProject && (
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    Dự án: <strong className="text-slate-700 font-semibold">{linkedProject.name}</strong>
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Tiến độ hoàn thành</span>
                  <span className="tabular-nums text-indigo-600 font-bold">{g.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${g.progress}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-400 text-right">
                  Thời hạn: {g.targetDate}
                </div>
              </div>

              {/* Key Results */}
              {g.keyResults.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Kết quả then chốt (Key Results)
                  </span>
                  <div className="space-y-2">
                    {g.keyResults.map((kr) => {
                      const krProgress = Math.round((kr.current / kr.target) * 100);
                      return (
                        <div
                          key={kr.id}
                          className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/60 text-xs flex items-center justify-between gap-2.5"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-slate-800 block truncate">
                              {kr.title}
                            </span>
                            <span className="text-[11px] text-slate-400 mt-0.5 block">
                              {kr.current}/{kr.target} {kr.unit} ({krProgress}%)
                            </span>
                          </div>

                          <button
                            onClick={() => handleIncrementKr(g, kr.id, kr.current, kr.target)}
                            className="h-8 px-2.5 bg-white hover:bg-indigo-50/80 text-indigo-700 border border-indigo-100 text-xs font-bold rounded-xl transition-all shadow-2xs active:scale-95"
                          >
                            +20%
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Goal Modal */}
      {isAddingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Tạo mục tiêu mới</h3>
              <button
                onClick={() => setIsAddingGoal(false)}
                className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mục tiêu chính</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đạt doanh thu 500tr từ dòng sản phẩm..."
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-slate-200/80 rounded-2xl text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Loại hình</label>
                  <select
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value as any)}
                    className="h-11 w-full px-3 text-xs font-semibold bg-white border border-slate-200/80 rounded-2xl text-slate-800 outline-none"
                  >
                    <option value="work">Công việc</option>
                    <option value="personal">Cá nhân</option>
                    <option value="long_term">Dài hạn</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hạn hoàn thành</label>
                  <input
                    type="date"
                    value={goalTargetDate}
                    onChange={(e) => setGoalTargetDate(e.target.value)}
                    className="h-11 w-full px-3 text-xs font-semibold bg-white border border-slate-200/80 rounded-2xl text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700">
                  Kết quả then chốt (Key Results)
                </label>
                <input
                  type="text"
                  placeholder="Kết quả 1: Sản xuất đủ 100 bộ sản phẩm..."
                  value={goalKr1}
                  onChange={(e) => setGoalKr1(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-slate-200/80 rounded-2xl text-slate-800 outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Kết quả 2: Chạy chiến dịch đạt 10.000 tương tác..."
                  value={goalKr2}
                  onChange={(e) => setGoalKr2(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-slate-200/80 rounded-2xl text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddingGoal(false)}
                  className="h-10 px-4 rounded-xl border border-slate-200/70 bg-slate-100/80 text-xs font-bold text-slate-600 transition hover:bg-slate-200/70"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
                >
                  Lưu mục tiêu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
