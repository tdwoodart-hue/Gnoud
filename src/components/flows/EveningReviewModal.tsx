import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Moon,
  X,
  CheckCircle2,
  Clock,
  ArrowRight,
  Check,
  Sparkles,
  AlertCircle,
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
  const [delayReason, setDelayReason] = useState<string>('');

  if (!isOpen) return null;

  const completedToday = tasks.filter((t) => t.status === 'done');
  const pendingTasks = tasks.filter((t) => t.status !== 'done');
  const tomorrowStr = getFormattedToday(1);

  const handleRescheduleAllToTomorrow = () => {
    pendingTasks.forEach((t) => {
      updateTask(t.id, { plannedDate: tomorrowStr });
    });
    addToast('Đã dời các công việc dang dở sang ngày mai', 'info');
  };

  const handleFinishReview = () => {
    addToast('Hoàn tất tổng kết cuối ngày. Chúc bạn có buổi tối nghỉ ngơi trọn vẹn!', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-indigo-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Tổng kết cuối ngày</h3>
              <p className="text-[11px] text-stone-500">Khép lại ngày làm việc nhẹ nhàng dưới 2 phút</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 flex-1">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Bước 1 / 3
                </span>
                <h4 className="text-base font-bold text-stone-900">
                  Thành quả & Việc chưa hoàn tất hôm nay
                </h4>
                <p className="text-xs text-stone-500">
                  Ghi nhận những gì bạn đã làm được mà không phán xét bản thân.
                </p>
              </div>

              {/* Completed tasks */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Đã hoàn thành ({completedToday.length})
                  </span>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {completedToday.length === 0 ? (
                    <div className="text-xs text-stone-400 italic">Hôm nay chưa có việc nào được tick xong</div>
                  ) : (
                    completedToday.map((t) => (
                      <div key={t.id} className="text-xs text-stone-700 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Unfinished tasks */}
              <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" /> Còn dang dở ({pendingTasks.length})
                  </span>
                  <button
                    onClick={handleRescheduleAllToTomorrow}
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Dời sang sáng mai
                  </button>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {pendingTasks.map((t) => (
                    <div key={t.id} className="text-xs text-stone-700 flex items-center justify-between">
                      <span className="truncate">{t.title}</span>
                      <span className="text-[10px] text-stone-400">{t.estimatedMinutes}p</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Bước 2 / 3
                </span>
                <h4 className="text-base font-bold text-stone-900">
                  Lý do chính khiến việc bị chậm trễ?
                </h4>
                <p className="text-xs text-stone-500">
                  Hiểu rõ nguyên nhân giúp AI điều chỉnh lịch ngày mai thực tế hơn.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  'Thời lượng thực tế tốn nhiều hơn ước tính ban đầu',
                  'Phát sinh nhiều cuộc gọi và tin nhắn gián đoạn',
                  'Mức năng lượng buổi chiều giảm sút',
                  'Chờ phản hồi duyệt mẫu từ đối tác',
                  'Ưu tiên giải quyết việc gia đình / cá nhân phát sinh',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setDelayReason(reason)}
                    className={`w-full p-3 rounded-xl border text-left text-xs transition-all ${
                      delayReason === reason
                        ? 'bg-blue-50 border-blue-500 text-blue-900 font-semibold'
                        : 'bg-white border-stone-200/80 text-stone-700 hover:border-stone-400'
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
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Bước 3 / 3
                </span>
                <h4 className="text-base font-bold text-stone-900">
                  Nhận định AI & Dự thảo cho ngày mai
                </h4>
                <p className="text-xs text-stone-500">
                  Đóng lại ngày làm việc và chuẩn bị tâm thế cho ngày mới.
                </p>
              </div>

              {/* AI Insight */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 text-xs text-blue-950">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-blue-900">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Nhận định từ Trợ lý
                </div>
                <p className="leading-relaxed">
                  Bạn đã hoàn thành các việc trọng yếu của buổi sáng với sự tập trung rất tốt. Việc chụp ảnh sản phẩm Senko chưa xong là bình thường do cần căn chỉnh ánh sáng kỹ. Ngày mai bạn có lịch trống lúc 09:00, rất phù hợp để dứt điểm phần này.
                </p>
              </div>

              {/* Habit to finish the day */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-xs text-stone-700 flex items-center justify-between">
                <span className="font-medium">Thói quen tối: Không làm việc sau 22:30</span>
                <span className="text-[11px] text-emerald-600 font-semibold">Đã đến giờ nghỉ ngơi</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 flex items-center justify-between bg-stone-50/50">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => (s - 1) as any)}
              className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900"
            >
              Quay lại
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as any)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              Tiếp tục <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinishReview}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Check className="w-3.5 h-3.5" /> Hoàn tất tổng kết
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
