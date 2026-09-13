import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sun,
  X,
  ArrowRight,
  Check,
  Battery,
  Calendar,
  Clock,
  Star,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { getFormattedToday } from '../../data/mockData';

interface MorningPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MorningPlanningModal: React.FC<MorningPlanningModalProps> = ({ isOpen, onClose }) => {
  const { tasks, calendarEvents, toggleTopPriority, addToast } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [energyLevel, setEnergyLevel] = useState<'Thấp' | 'Vừa' | 'Cao'>('Cao');

  if (!isOpen) return null;

  const yesterdayDateStr = getFormattedToday(-1);
  const todayDateStr = getFormattedToday(0);

  // Unfinished tasks
  const unfinishedTasks = tasks.filter((t) => t.status !== 'done').slice(0, 4);

  // Today fixed events
  const todayEvents = calendarEvents.filter((e) => e.date === todayDateStr);

  const handleFinishPlanning = () => {
    addToast('Đã thiết lập kế hoạch khởi đầu ngày mới thành công!', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-amber-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Lập kế hoạch đầu ngày</h3>
              <p className="text-[11px] text-stone-500">Khởi đầu ngày mới tập trung & bình an</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content based on step */}
        <div className="p-6 space-y-4 flex-1">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Bước 1 / 3
                </span>
                <h4 className="text-base font-bold text-stone-900">
                  Việc còn dang dở & Lịch cố định hôm nay
                </h4>
                <p className="text-xs text-stone-500">
                  Rà soát nhanh các đầu việc cần giải quyết tiếp tục trong ngày.
                </p>
              </div>

              {/* Unfinished tasks */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Việc cần ưu tiên tiếp tục:
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {unfinishedTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-xl border border-stone-200/80 bg-stone-50 text-xs flex items-center justify-between"
                    >
                      <span className="font-medium text-stone-800 truncate">{t.title}</span>
                      <span className="text-[10px] text-stone-400 shrink-0">{t.estimatedMinutes}p</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Today fixed events */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <span className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" /> Các khung giờ cố định hôm nay:
                </span>
                <div className="space-y-1">
                  {todayEvents.length === 0 ? (
                    <div className="text-xs text-stone-400 italic">Không có lịch cố định</div>
                  ) : (
                    todayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="px-2.5 py-1.5 bg-blue-50/50 rounded-lg text-xs flex items-center justify-between text-blue-900"
                      >
                        <span>{ev.title}</span>
                        <span className="font-mono text-[10px] text-stone-500">
                          {ev.startTime} - {ev.endTime}
                        </span>
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
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Bước 2 / 3
                </span>
                <h4 className="text-base font-bold text-stone-900">
                  Mức năng lượng hiện tại của bạn
                </h4>
                <p className="text-xs text-stone-500">
                  Trợ lý sẽ điều chỉnh mật độ công việc phù hợp với trạng thái thể lực của bạn.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { level: 'Thấp' as const, desc: 'Cần nhịp độ nhẹ nhàng, ưu tiên việc đơn giản', color: 'border-stone-200 hover:border-stone-400' },
                  { level: 'Vừa' as const, desc: 'Sẵn sàng xử lý 1-2 việc trọng tâm', color: 'border-blue-200 hover:border-blue-400' },
                  { level: 'Cao' as const, desc: 'Tràn đầy năng lượng cho các việc thử thách', color: 'border-emerald-200 hover:border-emerald-400' },
                ].map((item) => (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setEnergyLevel(item.level)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      energyLevel === item.level
                        ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : `bg-white ${item.color}`
                    }`}
                  >
                    <span className="font-bold text-stone-900 text-sm block mb-1">
                      {item.level}
                    </span>
                    <span className="text-[11px] text-stone-500 leading-snug block">
                      {item.desc}
                    </span>
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
                  Đề xuất 3 ưu tiên lớn nhất hôm nay
                </h4>
                <p className="text-xs text-stone-500">
                  Với mức năng lượng &ldquo;{energyLevel}&rdquo;, đây là lịch trình tối ưu được sắp xếp:
                </p>
              </div>

              <div className="space-y-2">
                {tasks.filter((t) => t.isTopPriority).slice(0, 3).map((t, idx) => (
                  <div
                    key={t.id}
                    className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-stone-900">{t.title}</span>
                    </div>
                    <span className="text-[10px] text-stone-400">{t.estimatedMinutes}p</span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/60 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Kế hoạch đã chừa khoảng nghỉ 15 phút giữa các phiên làm việc.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
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
              onClick={handleFinishPlanning}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Check className="w-3.5 h-3.5" /> Xác nhận & Bắt đầu ngày
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
