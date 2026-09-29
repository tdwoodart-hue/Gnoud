import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getFormattedToday } from '../../data/mockData';
import {
  applyQuickNutritionAction,
  loadNutritionState,
  removeNutritionBatch,
  saveNutritionState,
  type MealType,
} from '../../services/nutritionService';
import {
  applyWorkoutQuickAction,
  loadExerciseProgress,
  persistExerciseProgress,
} from '../../services/exerciseService';
import { parseManualReferenceList } from '../../services/manualReferenceService';
import {
  parseQuickAction,
  type QuickAction,
  type QuickNutritionAction,
  type QuickNutritionMeal,
  type QuickWorkoutAction,
} from '../../services/quickActionService';

interface AssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const mealLabels: Record<QuickNutritionMeal, string> = {
  breakfast: 'Sáng',
  lunch: 'Trưa',
  dinner: 'Tối',
  snack: 'Ăn nhẹ',
};

const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

const emitNutritionRefresh = () => {
  window.dispatchEvent(
    new CustomEvent('gnoud-account-data-refresh', { detail: { domain: 'nutrition' } }),
  );
};

const withAssistantSource = (action: QuickAction): QuickAction =>
  action.type === 'nutrition'
    ? { ...action, source: 'assistant' }
    : { ...action, source: 'assistant' };

export const AssistantModal: React.FC<AssistantModalProps> = ({ isOpen, onClose }) => {
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    addToast,
    setActiveTab,
  } = useApp();

  const today = getFormattedToday(0);
  const [input, setInput] = useState('');
  const [meal, setMeal] = useState<MealType>('dinner');
  const [targetTaskId, setTargetTaskId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const parsed = useMemo(
    () => input.trim() ? parseQuickAction(input, undefined, today, meal) : null,
    [input, today, meal],
  );

  const action = useMemo(() => {
    if (!parsed?.action) return null;
    const sourced = withAssistantSource(parsed.action);
    if (sourced.type === 'nutrition') return { ...sourced, meal };
    return sourced;
  }, [parsed?.action, meal]);

  const workoutCandidates = useMemo(
    () => tasks
      .filter((task) => task.plannedDate === today && parseManualReferenceList(task.description).length > 0)
      .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99')),
    [tasks, today],
  );

  useEffect(() => {
    if (!isOpen) {
      setInput('');
      setBusy(false);
      setTargetTaskId('');
      return;
    }
    if (workoutCandidates.length === 1) setTargetTaskId(workoutCandidates[0].id);
  }, [isOpen, workoutCandidates.length]);

  useEffect(() => {
    if (parsed?.action?.type === 'nutrition') {
      setMeal(parsed.action.meal);
    }
  }, [input]);

  if (!isOpen) return null;

  const nutritionTotals = action?.type === 'nutrition'
    ? action.items.reduce(
        (sum, item) => ({
          calories: sum.calories + item.calories,
          protein: sum.protein + item.protein,
          carbs: sum.carbs + item.carbs,
          fat: sum.fat + item.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      )
    : null;

  const saveNutrition = (nutritionAction: QuickNutritionAction) => {
    const before = loadNutritionState();
    const batchId = `assistant-nutrition-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = applyQuickNutritionAction(before, nutritionAction, today, batchId);
    saveNutritionState(result.state);
    emitNutritionRefresh();

    addToast(
      `Đã lưu ${nutritionAction.items.length} món vào bữa ${mealLabels[nutritionAction.meal].toLowerCase()}`,
      'success',
      {
        label: 'Hoàn tác',
        onClick: () => {
          const current = loadNutritionState();
          saveNutritionState(removeNutritionBatch(current, batchId));
          emitNutritionRefresh();
          addToast('Đã hoàn tác lần lưu của Trợ lý', 'info');
        },
      },
    );
  };

  const saveWorkout = (workoutAction: QuickWorkoutAction) => {
    const previousProgress = loadExerciseProgress();
    const targetTask = tasks.find((task) => task.id === targetTaskId);

    if (targetTask) {
      const previousDescription = targetTask.description;
      const result = applyWorkoutQuickAction(
        previousDescription,
        previousProgress,
        workoutAction,
        today,
      );
      updateTask(targetTask.id, { description: result.description });
      persistExerciseProgress(result.progress);

      addToast(
        `Đã cập nhật ${workoutAction.exercises.length} bài vào “${targetTask.title}”`,
        'success',
        {
          label: 'Hoàn tác',
          onClick: () => {
            updateTask(targetTask.id, { description: previousDescription });
            persistExerciseProgress(previousProgress);
            addToast('Đã hoàn tác lần lưu của Trợ lý', 'info');
          },
        },
      );
      return;
    }

    const result = applyWorkoutQuickAction('', previousProgress, workoutAction, today);
    const created = addTask({
      title: workoutAction.title?.trim() || 'Buổi tập',
      description: result.description,
      category: 'personal',
      status: 'todo',
      priority: 'medium',
      plannedDate: workoutAction.date || today,
      estimatedMinutes: 60,
    });
    persistExerciseProgress(result.progress);

    addToast(
      `Đã tạo “${created.title}” với ${workoutAction.exercises.length} bài`,
      'success',
      {
        label: 'Hoàn tác',
        onClick: () => {
          deleteTask(created.id);
          persistExerciseProgress(previousProgress);
        },
      },
    );
  };

  const confirm = async () => {
    if (!action || parsed?.errors.length) return;
    setBusy(true);
    try {
      if (action.type === 'nutrition') saveNutrition(action);
      else saveWorkout(action);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const goToDomain = () => {
    if (!action) return;
    setActiveTab(action.type === 'nutrition' ? 'nutrition' : 'today');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center bg-slate-950/35 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <section
        className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">Trợ lý</h2>
            <p className="mt-1 text-[10px] leading-4 text-slate-400">
              Nhập một lệnh. Trợ lý chỉ ghi dữ liệu sau khi mày xác nhận.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 shrink-0 rounded-xl bg-slate-100 px-3 text-[11px] font-bold text-slate-500"
          >
            Đóng
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <textarea
            autoFocus
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={5}
            placeholder="Nhập lệnh hoặc dán nội dung cần xử lý…"
            className="w-full resize-y rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
          />


          {parsed?.errors.length ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3">
              {parsed.errors.map((error) => (
                <p key={error} className="text-[11px] font-semibold leading-5 text-rose-700">• {error}</p>
              ))}
            </div>
          ) : null}

          {parsed?.warnings.length ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
              {parsed.warnings.map((warning) => (
                <p key={warning} className="text-[10px] font-medium leading-5 text-amber-700">• {warning}</p>
              ))}
            </div>
          ) : null}

          {action?.type === 'nutrition' ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Bữa ăn sẽ lưu</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{action.date || today} · {action.items.length} món</p>
                  </div>
                  {nutritionTotals ? (
                    <p className="text-xs font-extrabold tabular-nums text-slate-800">{number.format(nutritionTotals.calories)} kcal</p>
                  ) : null}
                </div>

                <div className="mt-3 grid grid-cols-4 gap-1.5 rounded-xl bg-white p-1 ring-1 ring-slate-200">
                  {(Object.keys(mealLabels) as QuickNutritionMeal[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setMeal(item)}
                      className={`h-9 rounded-lg text-[10px] font-bold transition ${
                        meal === item ? 'bg-indigo-600 text-white' : 'text-slate-500'
                      }`}
                    >
                      {mealLabels[item]}
                    </button>
                  ))}
                </div>

                <div className="mt-3 space-y-2">
                  {action.items.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200/70">
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">{item.name}</p>
                        <span className="shrink-0 text-[10px] font-bold text-slate-600">{number.format(item.calories)} kcal</span>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">
                        P {number.format(item.protein)}g · C {number.format(item.carbs)}g · F {number.format(item.fat)}g
                      </p>
                    </div>
                  ))}
                </div>

                {nutritionTotals ? (
                  <p className="mt-3 text-[10px] font-semibold text-slate-500">
                    Tổng · P {number.format(nutritionTotals.protein)}g · C {number.format(nutritionTotals.carbs)}g · F {number.format(nutritionTotals.fat)}g
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {action?.type === 'workout' ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs font-bold text-slate-800">Buổi tập sẽ cập nhật</p>
              {workoutCandidates.length > 0 ? (
                <select
                  value={targetTaskId}
                  onChange={(event) => setTargetTaskId(event.target.value)}
                  className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
                >
                  <option value="">Tạo buổi tập mới</option>
                  {workoutCandidates.map((task) => (
                    <option key={task.id} value={task.id}>{task.title}</option>
                  ))}
                </select>
              ) : (
                <p className="mt-2 text-[10px] text-slate-400">Chưa có buổi tập hôm nay. Trợ lý sẽ tạo một buổi mới.</p>
              )}

              <div className="mt-3 space-y-2">
                {action.exercises.map((exercise, index) => (
                  <div key={`${exercise.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200/70">
                    <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">{exercise.name}</p>
                    <p className="shrink-0 text-[10px] font-semibold text-slate-500">
                      {exercise.weightKg !== undefined ? `${number.format(exercise.weightKg)}kg` : '—'}
                      {' × '}
                      {exercise.reps !== undefined ? exercise.reps : '—'}
                      {exercise.sets !== undefined ? ` · ${exercise.sets} sets` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <footer className="grid grid-cols-2 gap-2.5 border-t border-slate-100 bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 sm:px-5">
          <button
            type="button"
            onClick={action ? goToDomain : onClose}
            className="h-12 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600"
          >
            {action ? 'Mở dữ liệu' : 'Hủy'}
          </button>
          <button
            type="button"
            disabled={busy || !action || Boolean(parsed?.errors.length)}
            onClick={() => void confirm()}
            className="h-12 rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-xs disabled:bg-slate-200 disabled:text-slate-400"
          >
            {busy ? 'Đang lưu…' : action?.type === 'workout' ? 'Xác nhận buổi tập' : 'Lưu bữa này'}
          </button>
        </footer>
      </section>
    </div>
  );
};
