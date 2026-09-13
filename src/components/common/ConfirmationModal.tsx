import React, { useState } from 'react';
import { ParsedInputResult, TaskPriority } from '../../types';
import { X, Check, Calendar, Clock, Tag, AlertCircle, Bell, Sparkles } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  parsedData: ParsedInputResult | null;
  onConfirm: (data: ParsedInputResult) => void;
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  parsedData,
  onConfirm,
  isLoading,
}) => {
  if (!isOpen || !parsedData) return null;

  const [formData, setFormData] = useState<ParsedInputResult>(parsedData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(formData);
    onClose();
  };

  const priorityLabels: Record<TaskPriority, { label: string; color: string }> = {
    urgent: { label: 'Khẩn cấp', color: 'text-red-700 bg-red-50 border-red-200' },
    high: { label: 'Quan trọng', color: 'text-amber-700 bg-amber-50 border-amber-200' },
    medium: { label: 'Bình thường', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    low: { label: 'Có thể làm sau', color: 'text-stone-600 bg-stone-100 border-stone-200' },
  };

  const typeLabels = {
    task: 'Công việc',
    event: 'Sự kiện / Lịch hẹn',
    habit: 'Thói quen hằng ngày',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl border border-stone-200 shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 text-base">Xác nhận thông tin diễn giải</h3>
              <p className="text-xs text-stone-500">Trợ lý AI đã phân tích câu lệnh tự nhiên của bạn</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {parsedData.rawInput && (
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/60 text-xs text-stone-600 italic">
              Câu gốc: &ldquo;{parsedData.rawInput}&rdquo;
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Tiêu đề</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-stone-900"
            />
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Loại hình</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-stone-800"
              >
                <option value="task">{typeLabels.task}</option>
                <option value="event">{typeLabels.event}</option>
                <option value="habit">{typeLabels.habit}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Mức ưu tiên</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-stone-800"
              >
                <option value="urgent">Khẩn cấp</option>
                <option value="high">Quan trọng</option>
                <option value="medium">Bình thường</option>
                <option value="low">Có thể làm sau</option>
              </select>
            </div>
          </div>

          {/* Date & Start Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" /> Ngày thực hiện
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-stone-400" /> Giờ bắt đầu
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-stone-800"
              />
            </div>
          </div>

          {/* Duration & Project */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Thời lượng (phút)</label>
              <input
                type="number"
                min="5"
                step="5"
                value={formData.estimatedMinutes}
                onChange={(e) => setFormData({ ...formData, estimatedMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-stone-400" /> Dự án liên quan
              </label>
              <input
                type="text"
                value={formData.relatedProject}
                onChange={(e) => setFormData({ ...formData, relatedProject: e.target.value })}
                placeholder="Ví dụ: Ra mắt Senko, The Luvin..."
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-stone-800"
              />
            </div>
          </div>

          {/* Reminder */}
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1">
              <Bell className="w-3.5 h-3.5 text-stone-400" /> Nhắc nhở
            </label>
            <input
              type="text"
              value={formData.reminder || ''}
              onChange={(e) => setFormData({ ...formData, reminder: e.target.value })}
              placeholder="15 phút trước giờ bắt đầu"
              className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-stone-800"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg font-medium transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4" />
              Lưu vào Lịch Sống
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
