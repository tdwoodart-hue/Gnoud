import React, { useState } from 'react';
import { Calendar, ChevronDown, Clock, Plus, Sparkles, Star, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Task, TaskPriority } from '../../types';
import { isTaskDraft } from '../../services/taskDraft';

export const TaskEditModal: React.FC = () => {
  const { editingTask } = useApp();
  return editingTask ? <TaskForm key={editingTask.id} initialTask={editingTask} /> : null;
};

const priorities: Array<{ value: TaskPriority; label: string; active: string }> = [
  { value: 'medium', label: 'Thường', active: 'border-blue-200 bg-blue-50 text-blue-700' },
  { value: 'high', label: 'Quan trọng', active: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'urgent', label: 'Khẩn cấp', active: 'border-rose-200 bg-rose-50 text-rose-700' },
];

const TaskForm: React.FC<{ initialTask: Task }> = ({ initialTask }) => {
  const { setEditingTask, addTask, updateTask, deleteTask, projects } = useApp();
  const [task, setTask] = useState({ ...initialTask });
  const [newSubtask, setNewSubtask] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [breakingDown, setBreakingDown] = useState(false);
  const draft = isTaskDraft(task);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (draft) addTask(task);
    else updateTask(task.id, task);
    setEditingTask(null);
  };

  const addSubtask = () => {
    const title = newSubtask.trim();
    if (!title) return;
    setTask((current) => ({
      ...current,
      subtasks: [
        ...current.subtasks,
        { id: `sub-${Date.now()}`, title, completed: false, estimatedMinutes: 20 },
      ],
    }));
    setNewSubtask('');
  };

  const breakdown = async () => {
    if (!task.title.trim()) return;
    setBreakingDown(true);
    try {
      const response = await fetch('/api/gemini/breakdown-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: task.title,
          taskDescription: task.description,
          estimatedMinutes: task.estimatedMinutes,
        }),
      });
      const data = await response.json();
      if (Array.isArray(data.subtasks)) {
        setTask((current) => ({ ...current, subtasks: [...current.subtasks, ...data.subtasks] }));
      }
    } finally {
      setBreakingDown(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center sm:p-4">
      <section className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-100 px-4 sm:px-5">
          <button
            type="button"
            onClick={() => setTask({ ...task, isTopPriority: !task.isTopPriority })}
            className={`grid h-9 w-9 place-items-center rounded-xl transition ${
              task.isTopPriority ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
            }`}
            aria-label="Đánh dấu quan trọng"
          >
            <Star className="h-4 w-4 fill-current" />
          </button>
          <h2 className="flex-1 text-base font-bold">{draft ? 'Thêm việc' : 'Sửa việc'}</h2>
          {!draft ? (
            <button
              type="button"
              onClick={() => {
                deleteTask(task.id);
                setEditingTask(null);
              }}
              className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-500"
              aria-label="Xóa"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setEditingTask(null)}
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={save} className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Tên việc
          </label>
          <input
            autoFocus
            required
            value={task.title}
            onChange={(event) => setTask({ ...task, title: event.target.value })}
            placeholder="Bạn cần làm gì?"
            className="h-14 w-full rounded-2xl border border-slate-200 px-4 text-lg font-semibold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
          />

          <div className="mt-3 grid grid-cols-[0.9fr_1.7fr] gap-2.5">
            <label className="flex min-h-[56px] min-w-0 flex-col justify-center rounded-2xl border border-slate-200 px-3 py-2">
              <span className="mb-1 flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold text-slate-400 sm:text-[11px]">
                <Clock className="h-3 w-3 shrink-0" />
                Giờ bắt đầu
              </span>
              <input
                type="time"
                value={task.startTime || ''}
                onChange={(event) => setTask({ ...task, startTime: event.target.value || undefined })}
                className="min-w-0 w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
              />
            </label>

            <div className="grid min-h-[56px] min-w-0 grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">
              {priorities.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTask({ ...task, priority: option.value })}
                  className={`min-w-0 whitespace-nowrap rounded-xl border border-transparent px-1 text-[10px] font-semibold transition sm:text-[11px] ${
                    task.priority === option.value ? option.active : 'text-slate-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <section className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Nhiệm vụ nhỏ ({task.subtasks.length})
              </h3>
              <button
                type="button"
                onClick={breakdown}
                disabled={breakingDown || !task.title.trim()}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-600 disabled:opacity-40"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {breakingDown ? 'Đang chia…' : 'AI chia nhỏ'}
              </button>
            </div>

            <div className="space-y-2">
              {task.subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setTask({
                        ...task,
                        subtasks: task.subtasks.map((item) =>
                          item.id === subtask.id ? { ...item, completed: !item.completed } : item,
                        ),
                      })
                    }
                    className={`h-5 w-5 shrink-0 rounded-full border-2 ${
                      subtask.completed ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                    }`}
                    aria-label={subtask.completed ? 'Đánh dấu chưa xong' : 'Hoàn thành bước'}
                  />
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${
                      subtask.completed ? 'text-slate-400 line-through' : 'text-slate-700'
                    }`}
                  >
                    {subtask.title}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setTask({
                        ...task,
                        subtasks: task.subtasks.filter((item) => item.id !== subtask.id),
                      })
                    }
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 hover:bg-white hover:text-slate-500"
                    aria-label="Xóa bước"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-2 flex gap-2">
              <input
                value={newSubtask}
                onChange={(event) => setNewSubtask(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addSubtask();
                  }
                }}
                placeholder="Thêm một bước…"
                className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500"
              />
              <button
                type="button"
                onClick={addSubtask}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"
                aria-label="Thêm bước"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </section>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="mt-4 flex w-full items-center justify-between border-t border-slate-100 py-4 text-sm font-semibold text-slate-500"
          >
            <span>Tùy chọn thêm</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            />
          </button>

          {showAdvanced ? (
            <section className="space-y-3 pb-2">
              <textarea
                rows={2}
                value={task.description || ''}
                onChange={(event) => setTask({ ...task, description: event.target.value })}
                placeholder="Mô tả"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <label className="rounded-xl border border-slate-200 p-3 text-xs text-slate-400">
                  <span className="mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Ngày làm
                  </span>
                  <input
                    type="date"
                    value={task.plannedDate || ''}
                    onChange={(event) =>
                      setTask({ ...task, plannedDate: event.target.value || undefined })
                    }
                    className="w-full bg-transparent font-semibold text-slate-700 outline-none"
                  />
                </label>
                <label className="rounded-xl border border-slate-200 p-3 text-xs text-slate-400">
                  <span className="mb-1 block">Thời lượng (phút)</span>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={task.estimatedMinutes}
                    onChange={(event) =>
                      setTask({ ...task, estimatedMinutes: Number(event.target.value) })
                    }
                    className="w-full bg-transparent font-semibold text-slate-700 outline-none"
                  />
                </label>
              </div>

              <select
                value={task.projectId || ''}
                onChange={(event) =>
                  setTask({ ...task, projectId: event.target.value || undefined })
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
              >
                <option value="">Không thuộc dự án</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="date"
                  value={task.deadline || ''}
                  onChange={(event) =>
                    setTask({ ...task, deadline: event.target.value || undefined })
                  }
                  aria-label="Hạn chót"
                  className="h-11 min-w-0 rounded-xl border border-slate-200 px-3 text-sm outline-none"
                />
                <select
                  value={task.recurrence || 'none'}
                  onChange={(event) =>
                    setTask({ ...task, recurrence: event.target.value as Task['recurrence'] })
                  }
                  className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                >
                  <option value="none">Không lặp</option>
                  <option value="daily">Hằng ngày</option>
                  <option value="weekdays">Ngày làm việc</option>
                  <option value="weekly">Hằng tuần</option>
                  <option value="monthly">Hằng tháng</option>
                </select>
              </div>

              <textarea
                rows={2}
                value={task.notes || ''}
                onChange={(event) => setTask({ ...task, notes: event.target.value })}
                placeholder="Ghi chú, đường link…"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
              />
            </section>
          ) : null}

          <div className="sticky bottom-0 -mx-4 mt-1 flex gap-2 border-t border-slate-100 bg-white/95 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-mx-5 sm:px-5">
            <button
              type="button"
              onClick={() => setEditingTask(null)}
              className="h-12 flex-1 rounded-xl bg-slate-100 text-sm font-semibold text-slate-500"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="h-12 flex-[2] rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm shadow-blue-600/20"
            >
              {draft ? 'Thêm việc' : 'Lưu'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
