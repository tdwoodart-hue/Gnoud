import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sun,
  X,
  ArrowRight,
  Check,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { getFormattedToday } from '../../data/mockData';

interface MorningPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MorningPlanningModal: React.FC<MorningPlanningModalProps> = ({ isOpen, onClose }) => {
  const { tasks, calendarEvents, addToast } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [energyLevel, setEnergyLevel] = useState<'Thấp' | 'Vừa' | 'Cao'>('Cao');

  if (!isOpen) return null;

  const todayDateStr = getFormattedToday(0);
  const unfinishedTasks = tasks.filter((task) => task.status !== 'done').slice(0, 4);
  const todayEvents = calendarEvents.filter((event) => event.date === todayDateStr);
  const priorityTasks = tasks.filter((task) => task.isTopPriority && task.status !== 'done').slice(0, 3);

  const handleFinishPlanning = () => {
    addToast('Đã thiết lập kế hoạch khởi đầu ngày mới!', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-amber-50/50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/60 bg-amber-100/90 text-amber-700 shadow-2xs">
              <Sun className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Lập kế hoạch đầu ngày</h3>
              <p className="text-[11px] text-slate-400">Khởi đầu ngày mới tập trung & bình an</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100/80 text-slate-400 transition hover:text-slate-600"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 p-6">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bước 1 / 3</span>
                <h4 className="text-base font-bold text-slate-900">Việc còn dang dở & Lịch cố định hôm nay</h4>
                <p className="text-xs text-slate-400">Rà soát nhanh các đầu việc cần giải quyết tiếp tục trong ngày.</p>
              </div>

              <div className="space-y-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Việc cần ưu tiên tiếp tục:
                </span>
                <div className="max-h-36 space-y-1.5 overflow-y-auto">
                  {unfinishedTasks.length ? unfinishedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/60 p-3 text-xs"
                    >
                      <span className="truncate font-bold text-slate-800">{task.title}</span>
                      <span className="shrink-0 text-[11px] font-semibold text-slate-400">{task.estimatedMinutes}p</span>
                    </div>
                  )) : (
                    <div className="text-xs italic text-slate-400">Không có việc dang dở</div>
                  )}
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" /> Các khung giờ cố định hôm nay:
                </span>
                <div className="space-y-1.5">
                  {todayEvents.length === 0 ? (
                    <div className="text-xs italic text-slate-400">Không có lịch cố định</div>
                  ) : (
                    todayEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between rounded-2xl border border-indigo-100/70 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-900"
                      >
                        <span className="font-semibold">{event.title}</span>
                        <span className="font-mono text-[11px] text-slate-500">{event.startTime} - {event.endTime}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bước 2 / 3</span>
                <h4 className="text-base font-bold text-slate-900">Mức năng lượng hiện tại của bạn</h4>
                <p className="text-xs text-slate-400">Chọn mức phù hợp để tự cân đối khối lượng công việc trong ngày.</p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-2">
                {[
                  { level: 'Thấp' as const, desc: 'Nhịp độ nhẹ, ưu tiên việc đơn giản' },
                  { level: 'Vừa' as const, desc: 'Sẵn sàng xử lý 1-2 việc trọng tâm' },
                  { level: 'Cao' as const, desc: 'Đủ sức cho các việc lớn và cần tập trung' },
                ].map((item) => (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setEnergyLevel(item.level)}
                    className={`rounded-2xl border p-3.5 text-left transition-all ${
                      energyLevel === item.level
                        ? 'border-indigo-400 bg-indigo-50/80 shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200/80 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="mb-1 block text-sm font-bold text-slate-900">{item.level}</span>
                    <span className="block text-[11px] leading-snug text-slate-400">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bước 3 / 3</span>
                <h4 className="text-base font-bold text-slate-900">3 ưu tiên lớn nhất hôm nay</h4>
                <p className="text-xs text-slate-400">
                  Với mức năng lượng “{energyLevel}”, hãy kiểm tra lại các việc bạn đã đánh dấu ưu tiên.
                </p>
              </div>

              <div className="space-y-2">
                {priorityTasks.length ? priorityTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="truncate font-bold text-slate-900">{task.title}</span>
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold text-slate-400">{task.estimatedMinutes}p</span>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                    Chưa có việc nào được đánh dấu ưu tiên.
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200/60 bg-emerald-50/80 p-3.5 text-xs text-emerald-900">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="font-medium">Bạn có thể chủ động chừa khoảng nghỉ 15 phút giữa các phiên làm việc.</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4.5">
          {step > 1 ? (
            <button
              onClick={() => setStep((current) => (current - 1) as 1 | 2)}
              className="px-3.5 py-2 text-xs font-bold text-slate-500 transition hover:text-slate-800"
            >
              Quay lại
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              onClick={() => setStep((current) => (current + 1) as 2 | 3)}
              className="flex h-10 items-center gap-1.5 rounded-2xl bg-indigo-600 px-4.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-95"
            >
              Tiếp tục <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinishPlanning}
              className="flex h-10 items-center gap-1.5 rounded-2xl bg-emerald-600 px-4.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
            >
              <Check className="h-3.5 w-3.5" /> Xác nhận & Bắt đầu ngày
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
