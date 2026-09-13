import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, TaskCategory, TaskPriority, TaskStatus } from '../../types';
import {
  X,
  Trash2,
  Calendar,
  Clock,
  Tag as TagIcon,
  Sparkles,
  Plus,
  Star,
  CheckSquare,
  Square,
  FileText,
} from 'lucide-react';

export const TaskEditModal: React.FC = () => {
  const {
    editingTask,
    setEditingTask,
    updateTask,
    deleteTask,
    projects,
    breakdownTaskWithAi,
  } = useApp();

  if (!editingTask) return null;

  const [task, setTask] = useState<Task>({ ...editingTask });
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isBreakingDown, setIsBreakingDown] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTask(task.id, task);
    setEditingTask(null);
  };

  const handleDelete = () => {
    if (confirm(`Bạn có chắc muốn xóa nhiệm vụ "${task.title}" không?`)) {
      deleteTask(task.id);
      setEditingTask(null);
    }
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub = {
      id: `sub-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      completed: false,
      estimatedMinutes: 20,
    };
    setTask({ ...task, subtasks: [...task.subtasks, newSub] });
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (subId: string) => {
    setTask({
      ...task,
      subtasks: task.subtasks.map((st) =>
        st.id === subId ? { ...st, completed: !st.completed } : st
      ),
    });
  };

  const handleDeleteSubtask = (subId: string) => {
    setTask({
      ...task,
      subtasks: task.subtasks.filter((st) => st.id !== subId),
    });
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    if (!task.tags.includes(tagInput.trim())) {
      setTask({ ...task, tags: [...task.tags, tagInput.trim()] });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTask({ ...task, tags: task.tags.filter((t) => t !== tag) });
  };

  const handleAiBreakdown = async () => {
    setIsBreakingDown(true);
    await breakdownTaskWithAi(task.id);
    setIsBreakingDown(false);
    // Reload updated subtasks from context or fetch directly
    const res = await fetch('/api/gemini/breakdown-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskTitle: task.title,
        taskDescription: task.description,
        estimatedMinutes: task.estimatedMinutes,
      }),
    });
    const data = await res.json();
    if (data.subtasks) {
      setTask((prev) => ({
        ...prev,
        subtasks: [...prev.subtasks, ...data.subtasks],
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTask({ ...task, isTopPriority: !task.isTopPriority })}
              className={`p-1.5 rounded-lg border transition-colors ${
                task.isTopPriority
                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                  : 'bg-white border-stone-200 text-stone-400 hover:text-stone-600'
              }`}
              title={task.isTopPriority ? 'Việc quan trọng nhất hôm nay' : 'Đặt làm việc quan trọng nhất'}
            >
              <Star className="w-4 h-4 fill-current" />
            </button>
            <span className="text-xs font-medium text-stone-500">
              {task.isTopPriority ? 'Việc quan trọng nhất trong ngày' : 'Chi tiết công việc'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
              title="Xóa công việc"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setEditingTask(null)}
              className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1 text-stone-800">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wide">
              Tiêu đề nhiệm vụ
            </label>
            <input
              type="text"
              required
              value={task.title}
              onChange={(e) => setTask({ ...task, title: e.target.value })}
              className="w-full px-3.5 py-2.5 text-base font-medium bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-stone-900"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wide">
              Mô tả chi tiết
            </label>
            <textarea
              rows={2}
              value={task.description || ''}
              onChange={(e) => setTask({ ...task, description: e.target.value })}
              placeholder="Thêm mô tả hoặc hướng dẫn..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-stone-800"
            />
          </div>

          {/* Category, Project, Status, Priority */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Phân loại</label>
              <select
                value={task.category}
                onChange={(e) => setTask({ ...task, category: e.target.value as TaskCategory })}
                className="w-full px-2.5 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-blue-500 text-stone-800"
              >
                <option value="work">Công việc</option>
                <option value="personal">Cá nhân</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Dự án</label>
              <select
                value={task.projectId || ''}
                onChange={(e) => setTask({ ...task, projectId: e.target.value || undefined })}
                className="w-full px-2.5 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-blue-500 text-stone-800"
              >
                <option value="">(Không thuộc dự án)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Trạng thái</label>
              <select
                value={task.status}
                onChange={(e) => setTask({ ...task, status: e.target.value as TaskStatus })}
                className="w-full px-2.5 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-blue-500 text-stone-800"
              >
                <option value="todo">Chưa làm</option>
                <option value="in_progress">Đang làm</option>
                <option value="waiting">Chờ phản hồi</option>
                <option value="done">Hoàn thành</option>
                <option value="deferred">Tạm hoãn</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Mức ưu tiên</label>
              <select
                value={task.priority}
                onChange={(e) => setTask({ ...task, priority: e.target.value as TaskPriority })}
                className="w-full px-2.5 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-blue-500 text-stone-800"
              >
                <option value="urgent">Khẩn cấp</option>
                <option value="high">Quan trọng</option>
                <option value="medium">Bình thường</option>
                <option value="low">Có thể làm sau</option>
              </select>
            </div>
          </div>

          {/* Planned Date, Start Time, Deadline, Duration */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" /> Ngày làm
              </label>
              <input
                type="date"
                value={task.plannedDate || ''}
                onChange={(e) => setTask({ ...task, plannedDate: e.target.value || undefined })}
                className="w-full px-2 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-stone-400" /> Giờ bắt đầu
              </label>
              <input
                type="time"
                value={task.startTime || ''}
                onChange={(e) => setTask({ ...task, startTime: e.target.value || undefined })}
                className="w-full px-2 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Hạn chót</label>
              <input
                type="date"
                value={task.deadline || ''}
                onChange={(e) => setTask({ ...task, deadline: e.target.value || undefined })}
                className="w-full px-2 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Dự kiến (phút)</label>
              <input
                type="number"
                min="5"
                step="5"
                value={task.estimatedMinutes}
                onChange={(e) => setTask({ ...task, estimatedMinutes: Number(e.target.value) })}
                className="w-full px-2 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-800"
              />
            </div>
          </div>

          {/* Subtasks Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide flex items-center gap-1.5">
                Các bước thực hiện ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length})
              </label>
              <button
                type="button"
                onClick={handleAiBreakdown}
                disabled={isBreakingDown}
                className="text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isBreakingDown ? 'Đang chia nhỏ...' : 'Chia nhỏ bằng AI'}
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {task.subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-stone-50 border border-stone-200/60 hover:bg-stone-100/70 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleSubtask(st.id)}
                    className="text-stone-400 hover:text-stone-600"
                  >
                    {st.completed ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                  <span
                    className={`text-xs flex-1 ${
                      st.completed ? 'line-through text-stone-400' : 'text-stone-800'
                    }`}
                  >
                    {st.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubtask(st.id)}
                    className="text-stone-300 hover:text-red-500 p-1 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add subtask input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Thêm một bước thực hiện mới..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wide flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-stone-400" /> Ghi chú thêm
            </label>
            <textarea
              rows={2}
              value={task.notes || ''}
              onChange={(e) => setTask({ ...task, notes: e.target.value })}
              placeholder="Thông tin liên hệ, đường link hoặc lưu ý quan trọng..."
              className="w-full px-3.5 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-blue-500 text-stone-800"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wide flex items-center gap-1">
              <TagIcon className="w-3.5 h-3.5 text-stone-400" /> Thẻ nhãn (Tags)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-stone-100 text-stone-700 rounded-md flex items-center gap-1"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập tên nhãn rồi nhấn Thêm..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="w-48 px-2.5 py-1 text-xs bg-white border border-stone-200 rounded-lg text-stone-800"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs"
              >
                Thêm tag
              </button>
            </div>
          </div>

          {/* Recurrence & Reminder */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-100">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Lặp lại</label>
              <select
                value={task.recurrence || 'none'}
                onChange={(e) => setTask({ ...task, recurrence: e.target.value as any })}
                className="w-full px-2.5 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800"
              >
                <option value="none">Không lặp lại</option>
                <option value="daily">Hằng ngày</option>
                <option value="weekdays">Ngày làm việc (T2 - T6)</option>
                <option value="weekly">Hằng tuần</option>
                <option value="monthly">Hằng tháng</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Thông báo nhắc nhở</label>
              <input
                type="text"
                placeholder="Ví dụ: 15 phút trước"
                value={task.reminder || ''}
                onChange={(e) => setTask({ ...task, reminder: e.target.value })}
                className="w-full px-2.5 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setEditingTask(null)}
              className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-xl font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-xs"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
