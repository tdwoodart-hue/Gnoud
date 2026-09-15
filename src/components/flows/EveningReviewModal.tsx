import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Moon,
  X,
  CheckCircle2,
  Clock,
  ArrowRight,
  Check,
  RotateCcw,
} from 'lucide-react';
import { getFormattedToday } from '../../data/mockData';

interface EveningReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EveningReviewModal: React.FC<EveningReviewModalProps> = ({ isOpen, onClose }) => {
  const { tasks, updateTask, addToast } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [delayReason, setDelayReason] = useState('');

  if (!isOpen) return null;

  const today = getFormattedToday(0);
  const completedToday = tasks.filter((task) => task.status === 'done' && (!task.completedAt || task.completedAt.startsWith(today)));
  const pendingTasks = tasks.filter((task) => task.status !== 'done' && task.plannedDate === today);
  const tomorrowStr = getFormattedToday(1);

  const handleRescheduleAllToTomorrow = () => {
    pendingTasks.forEach((task) => updateTask(task.id, { plannedDate: tomorrowStr }));
    addToast('Đã dời các công việc dang dở sang ngày mai', 'info');
  };

  const handleFinishReview = () => {
    addToast('Hoàn tất tổng kết cuối ngày.', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-indigo-50/50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-indigo-200/60 bg-indigo-100/90 text-indigo-700 shadow-2xs">
              <Moon className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tổng kết cuối ngày</h3>
              <p className="text-[11px] text-slate-400">Khép lại ngày làm việc nhẹ nhàng dưới 2 phút</p>
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
                <h4 className="text-base font-bold text-slate-900">Thành quả & Việc chưa hoàn tất hôm nay</h4>
                <p className="text-xs text-slate-400">Ghi nhận những gì bạn đã làm được và xử lý phần còn lại.</p>
              </div>

              <div className="space-y-2 rounded-2xl border border-emerald-200/60 bg-emerald-50/70 p-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Đã hoàn thành ({completedToday.length})
                  </span>
                </div>
                <div className="max-h-24 space-y-1 overflow-y-auto">
                  {completedToday.length === 0 ? (
                    <div className="text-xs italic text-slate-400">Hôm nay chưa có việc nào được tick xong</div>
                  ) : completedToday.map((task) => (
                    <div key={task.id} className="flex items-center gap-1.5 text-xs text-slate-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-amber-200/60 bg-amber-50/70 p-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-600" /> Còn dang dở ({pendingTasks.length})
                  </span>
                  {pendingTasks.length > 0 ? (
                    <button
                      onClick={handleRescheduleAllToTomorrow}
                      className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      <RotateCcw className="h-3 w-3" /> Dời sang ngày mai
                    </button>
                  ) : null}
                </div>
                <div className="max-h-24 space-y-1 overflow-y-auto">
                  {pendingTasks.length === 0 ? (
                    <div className="text-xs italic text-slate-400">Không còn việc dang dở trong hôm nay</div>
                  ) : pendingTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between text-xs text-slate-700">
                      <span className="truncate">{task.title}</span>
                      <span className="text-[11px] font-semibold text-slate-400">{task.estimatedMinutes}p</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bước 2 / 3</span>
                <h4 className="text-base font-bold text-slate-900">Lý do chính khiến việc bị chậm trễ?</h4>
                <p className="text-xs text-slate-400">Ghi lại nguyên nhân để điều chỉnh kế hoạch ngày mai thực tế hơn.</p>
              </div>

              <div className="space-y-2">
                {[
                  'Thời lượng thực tế tốn nhiều hơn ước tính ban đầu',
                  'Phát sinh nhiều cuộc gọi và tin nhắn gián đoạn',
                  'Mức năng lượng buổi chiều giảm sút',
                  'Chờ phản hồi từ người khác',
                  'Ưu tiên giải quyết việc gia đình / cá nhân phát sinh',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setDelayReason(reason)}
                    className={`w-full rounded-2xl border p-3.5 text-left text-xs transition-all ${
                      delayReason === reason
                        ? 'border-indigo-400 bg-indigo-50 font-bold text-indigo-900 shadow-xs'
                        : 'border-slate-200/80 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bước 3 / 3</span>
                <h4 className="text-base font-bold text-slate-900">Chuẩn bị cho ngày mai</h4>
                <p className="text-xs text-slate-400">Khép lại ngày làm việc và chuẩn bị tâm thế cho ngày mới.</p>
              </div>

              <div className="space-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs text-indigo-950">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-800">
                  <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" /> Tóm tắt hôm nay
                </div>
                <p className="leading-relaxed">
                  Bạn đã hoàn thành {completedToday.length} việc và còn {pendingTasks.length} việc chưa xong.
                  {delayReason ? ` Nguyên nhân chính bạn ghi lại: ${delayReason}.` : ' Nếu có việc dang dở, hãy ưu tiên lại trước khi bắt đầu ngày mai.'}
                </p>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3.5 text-xs text-slate-700">
                <span className="font-semibold text-slate-800">Kết thúc công việc đúng giờ</span>
                <span className="text-[11px] font-bold text-emerald-600">Dành thời gian nghỉ ngơi</span>
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
              onClick={handleFinishReview}
              className="flex h-10 items-center gap-1.5 rounded-2xl bg-indigo-600 px-4.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-95"
            >
              <Check className="h-3.5 w-3.5" /> Hoàn tất tổng kết
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
