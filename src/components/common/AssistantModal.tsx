import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getFormattedToday } from '../../data/mockData';
import {
  applyQuickNutritionAction,
  getEntriesForDate,
  getTotals,
  loadNutritionState,
  removeNutritionBatch,
  saveNutritionState,
  type MealType,
} from '../../services/nutritionService';
import {
  applyWorkoutQuickAction,
  exerciseKey,
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
import {
  clearAssistantHistory,
  clearAssistantPosition,
  loadAssistantDraft,
  loadAssistantHistory,
  loadAssistantPosition,
  parseAssistantReadIntent,
  pushAssistantHistory,
  saveAssistantDraft,
  saveAssistantPosition,
  type AssistantHistoryItem,
  type AssistantReadIntent,
  type AssistantWindowPosition,
} from '../../services/assistantService';

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

const withAssistantSource = (action: QuickAction): QuickAction => ({
  ...action,
  source: 'assistant',
});

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type DragState = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
};

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
  const panelRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const [input, setInput] = useState(() => loadAssistantDraft());
  const [meal, setMeal] = useState<MealType>('dinner');
  const [targetTaskId, setTargetTaskId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 640);
  const [position, setPosition] = useState<AssistantWindowPosition | null>(() => loadAssistantPosition());
  const [history, setHistory] = useState<AssistantHistoryItem[]>(() => loadAssistantHistory());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const readIntent = useMemo(
    () => input.trim() ? parseAssistantReadIntent(input) : null,
    [input],
  );

  const parsed = useMemo(
    () => !readIntent && input.trim() ? parseQuickAction(input, undefined, today, meal) : null,
    [input, today, meal, readIntent],
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

  const readResult = useMemo(() => {
    if (!readIntent) return null;

    if (readIntent === 'nutrition_today') {
      const state = loadNutritionState();
      const entries = getEntriesForDate(state.entries, today);
      const totals = getTotals(entries);
      return {
        type: 'nutrition_today' as const,
        entries: entries.length,
        totals,
        profile: state.profile,
      };
    }

    if (readIntent === 'today_tasks') {
      const remaining = tasks
        .filter((task) => task.plannedDate === today && task.status !== 'done')
        .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));
      return {
        type: 'today_tasks' as const,
        tasks: remaining,
      };
    }

    const progress = loadExerciseProgress();
    const sessions = workoutCandidates.map((task) => ({
      task,
      exercises: parseManualReferenceList(task.description).map((reference) => ({
        label: reference.label,
        latest: progress[exerciseKey(reference.label)]?.latest,
      })),
    }));
    return {
      type: 'workout_today' as const,
      sessions,
    };
  }, [readIntent, tasks, today, workoutCandidates]);

  useEffect(() => {
    const onResize = () => {
      const nextDesktop = window.innerWidth >= 640;
      setDesktop(nextDesktop);
      window.requestAnimationFrame(() => {
        const panel = panelRef.current;
        if (!panel || !position) return;
        const x = clamp(position.x, 12, Math.max(12, window.innerWidth - panel.offsetWidth - 12));
        const y = clamp(position.y, 12, Math.max(12, window.innerHeight - panel.offsetHeight - 12));
        if (x !== position.x || y !== position.y) {
          const next = { x, y };
          setPosition(next);
          saveAssistantPosition(next);
        }
      });
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [position]);

  useEffect(() => {
    saveAssistantDraft(input);
  }, [input]);

  useEffect(() => {
    if (!isOpen) {
      setBusy(false);
      setTargetTaskId('');
      setMinimized(false);
      setHistoryOpen(false);
      return;
    }
    if (workoutCandidates.length === 1) setTargetTaskId(workoutCandidates[0].id);
  }, [isOpen, workoutCandidates.length]);

  useEffect(() => {
    if (parsed?.action?.type === 'nutrition') {
      setMeal(parsed.action.meal);
    }
  }, [input]);

  useEffect(() => {
    if (!isOpen || !desktop || position) return;
    window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const next = {
        x: Math.max(12, window.innerWidth - panel.offsetWidth - 24),
        y: Math.min(96, Math.max(12, window.innerHeight - panel.offsetHeight - 12)),
      };
      setPosition(next);
      saveAssistantPosition(next);
    });
  }, [isOpen, desktop, minimized, position]);

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

  const rememberCurrentCommand = () => {
    if (!input.trim()) return;
    setHistory(pushAssistantHistory(input));
  };

  const clearInput = () => {
    setInput('');
    saveAssistantDraft('');
    setHistoryOpen(false);
  };

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
      rememberCurrentCommand();
      if (action.type === 'nutrition') saveNutrition(action);
      else saveWorkout(action);
      clearInput();
      setMinimized(true);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (historyOpen) setHistoryOpen(false);
        else if (!minimized) setMinimized(true);
        else onClose();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && action && !parsed?.errors.length) {
        event.preventDefault();
        void confirm();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, minimized, historyOpen, action, parsed?.errors.length]);

  const goToDomain = () => {
    if (action) setActiveTab(action.type === 'nutrition' ? 'nutrition' : 'today');
    else if (readIntent === 'nutrition_today') setActiveTab('nutrition');
    else setActiveTab('today');
    if (readIntent) rememberCurrentCommand();
    setMinimized(true);
  };

  const closeAssistant = () => {
    setMinimized(false);
    setHistoryOpen(false);
    onClose();
  };

  const startDrag = (event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button, input, textarea, select, a')) return;
    const panel = panelRef.current;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    const currentPosition = {
      x: clamp(rect.left, 12, Math.max(12, window.innerWidth - rect.width - 12)),
      y: clamp(rect.top, 12, Math.max(12, window.innerHeight - rect.height - 12)),
    };

    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    setPosition(currentPosition);
    saveAssistantPosition(currentPosition);
    setDragging(true);
    event.preventDefault();
  };

  const resetPosition = () => {
    clearAssistantPosition();
    setPosition(null);
  };

  useEffect(() => {
    if (!dragging) return undefined;

    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      const panel = panelRef.current;
      if (!drag || drag.pointerId !== event.pointerId || !panel) return;

      const x = clamp(
        event.clientX - drag.offsetX,
        12,
        Math.max(12, window.innerWidth - panel.offsetWidth - 12),
      );
      const y = clamp(
        event.clientY - drag.offsetY,
        12,
        Math.max(12, window.innerHeight - panel.offsetHeight - 12),
      );
      const next = { x, y };
      setPosition(next);
      saveAssistantPosition(next);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragging]);

  if (!isOpen) return null;

  const windowStyle: React.CSSProperties | undefined =
    position ? { left: position.x, top: position.y } : undefined;
  const floating = Boolean(position);

  if (minimized) {
    return (
      <div className="pointer-events-none fixed inset-0 z-[220]">
        <section
          ref={panelRef}
          style={windowStyle}
          className={`pointer-events-auto fixed flex h-10 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 shadow-lg shadow-slate-900/10 ${
            floating ? 'left-0 top-0' : 'bottom-[calc(82px+env(safe-area-inset-bottom))] right-3'
          }`}
        >
          <div
            onPointerDown={startDrag}
            style={{ touchAction: 'none' }}
            className="cursor-grab select-none px-2 text-[11px] font-bold text-slate-700 active:cursor-grabbing"
          >
            Trợ lý
          </div>
          <button
            type="button"
            onClick={() => setMinimized(false)}
            className="h-7 rounded-full bg-slate-100 px-2.5 text-[10px] font-bold text-slate-600"
          >
            Mở
          </button>
          <button
            type="button"
            onClick={closeAssistant}
            className="h-7 rounded-full px-2 text-[10px] font-bold text-slate-400"
          >
            Đóng
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[220]">
      <button
        type="button"
        aria-label="Ẩn trợ lý"
        onClick={() => setMinimized(true)}
        className="pointer-events-auto absolute inset-0 bg-slate-950/30 backdrop-blur-[1px] sm:hidden"
      />

      <section
        ref={panelRef}
        style={windowStyle}
        className={`pointer-events-auto fixed flex max-h-[92dvh] flex-col overflow-hidden bg-white shadow-2xl ${
          floating
            ? 'left-0 top-0 w-[calc(100vw-24px)] max-w-[520px] rounded-[24px] border border-slate-200'
            : 'inset-x-0 bottom-0 w-full rounded-t-[28px] sm:inset-auto sm:right-6 sm:top-24 sm:w-[520px] sm:max-w-[calc(100vw-24px)] sm:rounded-[24px] sm:border sm:border-slate-200'
        }`}
      >
        <div
          onPointerDown={startDrag}
          style={{ touchAction: 'none' }}
          className={`flex h-7 shrink-0 cursor-grab items-center justify-center select-none ${
            dragging ? 'cursor-grabbing' : ''
          }`}
          aria-label="Kéo để di chuyển trợ lý"
        >
          <span className="h-1 w-10 rounded-full bg-slate-300" />
        </div>
        <header
          className="flex select-none items-start justify-between gap-3 border-b border-slate-100 px-4 pb-3.5 sm:px-5"
        >
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">Trợ lý</h2>
            <p className="mt-0.5 text-[10px] leading-4 text-slate-400">
              Kéo thanh phía trên để di chuyển · Ctrl/⌘ + Enter để xác nhận
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {history.length > 0 ? (
              <button
                type="button"
                onClick={() => setHistoryOpen((value) => !value)}
                className="h-8 rounded-lg px-2 text-[10px] font-bold text-slate-500 hover:bg-slate-100"
              >
                Gần đây
              </button>
            ) : null}
            <button
              type="button"
              onClick={resetPosition}
              className="h-8 rounded-lg px-2 text-[10px] font-bold text-slate-400 hover:bg-slate-100"
            >
              Vị trí
            </button>
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="h-8 rounded-lg px-2 text-[10px] font-bold text-slate-500 hover:bg-slate-100"
            >
              Ẩn
            </button>
            <button
              type="button"
              onClick={closeAssistant}
              className="h-8 rounded-lg px-2 text-[10px] font-bold text-slate-400 hover:bg-slate-100"
            >
              Đóng
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {historyOpen && history.length > 0 ? (
            <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-2.5">
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Lệnh gần đây</p>
                <button
                  type="button"
                  onClick={() => {
                    clearAssistantHistory();
                    setHistory([]);
                    setHistoryOpen(false);
                  }}
                  className="text-[10px] font-bold text-slate-400"
                >
                  Xóa
                </button>
              </div>
              <div className="space-y-1.5">
                {history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setInput(item.text);
                      setHistoryOpen(false);
                    }}
                    className="w-full rounded-xl bg-white px-3 py-2 text-left text-[11px] font-medium leading-5 text-slate-600 ring-1 ring-slate-200/70"
                  >
                    <span className="line-clamp-2">{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="relative">
            <textarea
              autoFocus
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={4}
              placeholder="Nhập lệnh hoặc dán nội dung cần xử lý…"
              className="w-full resize-y rounded-2xl border border-slate-200 bg-white p-3 pr-14 text-sm leading-6 text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            />
            {input ? (
              <button
                type="button"
                onClick={clearInput}
                className="absolute right-2.5 top-2.5 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-400 hover:bg-slate-100"
              >
                Xóa
              </button>
            ) : null}
          </div>

          {readResult?.type === 'nutrition_today' ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-800">Dinh dưỡng hôm nay</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{readResult.entries} món đã ghi</p>
                </div>
                <p className="text-sm font-extrabold tabular-nums text-slate-900">
                  {number.format(readResult.totals.calories)} / {number.format(readResult.profile.calorieTarget)} kcal
                </p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  ['Protein', readResult.totals.protein, readResult.profile.proteinTarget],
                  ['Carb', readResult.totals.carbs, readResult.profile.carbTarget],
                  ['Fat', readResult.totals.fat, readResult.profile.fatTarget],
                ].map(([label, value, target]) => (
                  <div key={String(label)} className="rounded-xl bg-white p-2.5 ring-1 ring-slate-200/70">
                    <p className="text-[9px] font-bold uppercase text-slate-400">{label}</p>
                    <p className="mt-1 text-[11px] font-bold text-slate-700">
                      {number.format(Number(value))} / {number.format(Number(target))}g
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] font-semibold text-slate-500">
                Còn {number.format(Math.max(0, readResult.profile.calorieTarget - readResult.totals.calories))} kcal ·
                {' '}P {number.format(Math.max(0, readResult.profile.proteinTarget - readResult.totals.protein))}g
              </p>
            </div>
          ) : null}

          {readResult?.type === 'today_tasks' ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-slate-800">Việc còn lại hôm nay</p>
                <span className="text-[10px] font-bold text-slate-400">{readResult.tasks.length}</span>
              </div>
              {readResult.tasks.length ? (
                <div className="space-y-1.5">
                  {readResult.tasks.slice(0, 8).map((task) => (
                    <div key={task.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200/70">
                      <span className="w-10 shrink-0 text-[10px] font-bold tabular-nums text-slate-400">{task.startTime || '—'}</span>
                      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700">{task.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-2 text-[11px] text-slate-400">Không còn việc nào được lên lịch hôm nay.</p>
              )}
            </div>
          ) : null}

          {readResult?.type === 'workout_today' ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-slate-800">Buổi tập hôm nay</p>
                <span className="text-[10px] font-bold text-slate-400">{readResult.sessions.length} buổi</span>
              </div>
              {readResult.sessions.length ? (
                <div className="space-y-3">
                  {readResult.sessions.map(({ task, exercises }) => (
                    <div key={task.id} className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
                      <p className="text-[11px] font-bold text-slate-800">{task.title}</p>
                      <div className="mt-2 space-y-1">
                        {exercises.slice(0, 8).map((exercise) => (
                          <div key={exercise.label} className="flex items-center justify-between gap-3 text-[10px]">
                            <span className="min-w-0 flex-1 truncate font-medium text-slate-600">{exercise.label}</span>
                            <span className="shrink-0 font-semibold text-slate-400">
                              {exercise.latest?.weight || '—'}kg × {exercise.latest?.reps || '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-2 text-[11px] text-slate-400">Chưa có buổi tập nào được lên lịch hôm nay.</p>
              )}
            </div>
          ) : null}

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
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
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

        {(action || readIntent || input.trim()) ? (
          <footer className="grid grid-cols-2 gap-2.5 border-t border-slate-100 bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 sm:px-5">
            <button
              type="button"
              onClick={action || readIntent ? goToDomain : () => setMinimized(true)}
              className="h-11 rounded-2xl bg-slate-100 text-xs font-bold text-slate-600"
            >
              {action || readIntent ? 'Mở dữ liệu' : 'Ẩn'}
            </button>
            <button
              type="button"
              disabled={!readIntent && (busy || !action || Boolean(parsed?.errors.length))}
              onClick={() => {
                if (readIntent) {
                  rememberCurrentCommand();
                  setMinimized(true);
                  return;
                }
                void confirm();
              }}
              className="h-11 rounded-2xl bg-indigo-600 text-xs font-bold text-white shadow-xs disabled:bg-slate-200 disabled:text-slate-400"
            >
              {readIntent
                ? 'Ẩn'
                : busy
                  ? 'Đang lưu…'
                  : action?.type === 'workout'
                    ? 'Xác nhận buổi tập'
                    : 'Lưu bữa này'}
            </button>
          </footer>
        ) : null}
      </section>
    </div>
  );
};
