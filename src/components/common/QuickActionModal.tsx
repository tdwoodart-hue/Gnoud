import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  Dumbbell,
  Sparkles,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import {
  parseQuickAction,
  quickNutritionTemplate,
  quickWorkoutTemplate,
  type QuickAction,
  type QuickActionDomain,
} from '../../services/quickActionService';

interface QuickActionModalProps {
  domain: QuickActionDomain;
  date?: string;
  onClose: () => void;
  onApply: (action: QuickAction) => void | Promise<void>;
}

const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  domain,
  date,
  onClose,
  onApply,
}) => {
  const template = domain === 'nutrition' ? quickNutritionTemplate(date) : quickWorkoutTemplate(date);
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(
    () => raw.trim() ? parseQuickAction(raw, domain, date) : null,
    [raw, domain, date],
  );

  const apply = async () => {
    if (!parsed?.action || parsed.errors.length) return;
    setBusy(true);
    try {
      await onApply(parsed.action);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/40 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <section
        className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-slate-900">
              {domain === 'nutrition' ? 'Nhập nhanh dinh dưỡng' : 'Nhập nhanh buổi tập'}
            </h2>
            <p className="mt-0.5 text-[10px] leading-4 text-slate-400">
              Dán form JSON từ ChatGPT/AI. App kiểm tra trước rồi mới lưu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                <ClipboardPaste className="h-3.5 w-3.5 text-slate-400" />
                Form cần lưu
              </p>
              <button
                type="button"
                onClick={() => setRaw(template)}
                className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-indigo-600 ring-1 ring-slate-200"
              >
                Điền mẫu
              </button>
            </div>
            <textarea
              autoFocus
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              rows={10}
              spellCheck={false}
              placeholder={template}
              className="min-h-52 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 font-mono text-[11px] leading-5 text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            />
          </div>

          {parsed ? (
            <div className="mt-4 space-y-3">
              {parsed.errors.length > 0 ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                  {parsed.errors.map((error) => (
                    <p key={error} className="flex items-start gap-2 text-[11px] font-semibold leading-5 text-rose-700">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {error}
                    </p>
                  ))}
                </div>
              ) : null}

              {parsed.warnings.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  {parsed.warnings.map((warning) => (
                    <p key={warning} className="text-[10px] font-medium leading-5 text-amber-700">• {warning}</p>
                  ))}
                </div>
              ) : null}

              {parsed.action ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <p className="text-[11px] font-bold text-emerald-800">Sẵn sàng lưu</p>
                  </div>

                  {parsed.action.type === 'nutrition' ? (
                    <>
                      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                        <UtensilsCrossed className="h-3.5 w-3.5" />
                        {parsed.action.items.length} món · {parsed.action.meal}
                        {parsed.action.date ? ` · ${parsed.action.date}` : ''}
                      </div>
                      <div className="space-y-2">
                        {parsed.action.items.map((item, index) => (
                          <div key={`${item.name}-${index}`} className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200/70">
                            <div className="flex items-center justify-between gap-3">
                              <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">{item.name}</p>
                              <span className="shrink-0 text-[10px] font-bold text-slate-600">{number.format(item.calories)} kcal</span>
                            </div>
                            <p className="mt-1 text-[10px] text-slate-400">
                              P {number.format(item.protein)}g · C {number.format(item.carbs)}g · F {number.format(item.fat)}g
                              {item.amount ? ` · ${number.format(item.amount)} ${item.unit || ''}`.trimEnd() : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                        <Dumbbell className="h-3.5 w-3.5" />
                        {parsed.action.exercises.length} bài
                        {parsed.action.date ? ` · ${parsed.action.date}` : ''}
                      </div>
                      <div className="space-y-2">
                        {parsed.action.exercises.map((exercise, index) => (
                          <div key={`${exercise.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200/70">
                            <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">{exercise.name}</p>
                            <p className="shrink-0 text-[10px] font-semibold text-slate-500">
                              {exercise.weightKg !== undefined ? `${number.format(exercise.weightKg)}kg` : '—'}
                              {' × '}
                              {exercise.reps !== undefined ? `${exercise.reps}` : '—'}
                              {exercise.sets !== undefined ? ` · ${exercise.sets} sets` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <footer className="grid grid-cols-2 gap-2.5 border-t border-slate-100 bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 sm:px-5">
          <button type="button" onClick={onClose} className="h-12 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600">
            Hủy
          </button>
          <button
            type="button"
            disabled={busy || !parsed?.action || Boolean(parsed.errors.length)}
            onClick={() => void apply()}
            className="h-12 rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-xs disabled:bg-slate-200 disabled:text-slate-400"
          >
            {busy ? 'Đang lưu…' : 'Xác nhận lưu'}
          </button>
        </footer>
      </section>
    </div>
  );
};
