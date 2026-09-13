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
  Sparkles,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Mục tiêu trung hạn & Dài hạn</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Định hình hướng đi, theo dõi kết quả then chốt (Key Results) và ngăn ngừa mục tiêu bị lãng quên
          </p>
        </div>

        <button
          onClick={() => setIsAddingGoal(true)}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs self-start"
        >
          <Plus className="w-3.5 h-3.5" /> Tạo mục tiêu mới
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200/60 self-start">
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeCategory === tab.id
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredGoals.map((g) => {
          const linkedProject = projects.find((p) => p.id === g.linkedProjectId);
          const isNeglected = g.progress < 30; // Flag for neglected goal detection

          return (
            <div
              key={g.id}
              className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                    {g.category === 'work'
                      ? 'Công việc'
                      : g.category === 'personal'
                      ? 'Cá nhân'
                      : 'Dài hạn'}
                  </span>

                  {isNeglected && (
                    <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-200/60">
                      <AlertCircle className="w-3 h-3" /> Cần chú ý tiến độ
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-stone-900 text-base leading-snug">{g.title}</h3>

                {linkedProject && (
                  <span className="text-[11px] text-stone-500 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-stone-400" />
                    Thuộc dự án: <strong className="text-stone-700">{linkedProject.name}</strong>
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-2 border-t border-stone-100">
                <div className="flex justify-between text-xs font-semibold text-stone-800">
                  <span>Tiến độ hoàn thành</span>
                  <span>{g.progress}%</span>
                </div>
                <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${g.progress}%` }}
                  />
                </div>
                <div className="text-[10px] text-stone-400 text-right">
                  Thời hạn: {g.targetDate}
                </div>
              </div>

              {/* Key Results */}
              {g.keyResults.length > 0 && (
                <div className="pt-2 border-t border-stone-100 space-y-2">
                  <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
                    Kết quả then chốt (Key Results)
                  </span>
                  <div className="space-y-1.5">
                    {g.keyResults.map((kr) => {
                      const krProgress = Math.round((kr.current / kr.target) * 100);
                      return (
                        <div
                          key={kr.id}
                          className="p-2 bg-stone-50 rounded-xl border border-stone-200/60 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-stone-800 block truncate">
                              {kr.title}
                            </span>
                            <span className="text-[10px] text-stone-500">
                              {kr.current}/{kr.target} {kr.unit} ({krProgress}%)
                            </span>
                          </div>

                          <button
                            onClick={() => handleIncrementKr(g, kr.id, kr.current, kr.target)}
                            className="px-2 py-0.5 bg-white hover:bg-stone-200 text-stone-700 border border-stone-200 text-[10px] font-medium rounded-md transition-colors"
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
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Tạo mục tiêu mới</h3>
              <button
                onClick={() => setIsAddingGoal(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Mục tiêu chính</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đạt doanh thu 500tr từ dòng sản phẩm Senko..."
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Loại hình</label>
                  <select
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg"
                  >
                    <option value="work">Công việc</option>
                    <option value="personal">Cá nhân</option>
                    <option value="long_term">Dài hạn</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Hạn hoàn thành</label>
                  <input
                    type="date"
                    value={goalTargetDate}
                    onChange={(e) => setGoalTargetDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-stone-100">
                <label className="block text-xs font-semibold text-stone-700">
                  Kết quả then chốt (Key Results)
                </label>
                <input
                  type="text"
                  placeholder="Kết quả 1: Sản xuất đủ 100 bộ sản phẩm..."
                  value={goalKr1}
                  onChange={(e) => setGoalKr1(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-800"
                />
                <input
                  type="text"
                  placeholder="Kết quả 2: Chạy chiến dịch truyền thông đạt 10.000 tương tác..."
                  value={goalKr2}
                  onChange={(e) => setGoalKr2(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-800"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingGoal(false)}
                  className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
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
