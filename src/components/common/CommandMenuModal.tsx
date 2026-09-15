import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  CheckCircle2,
  Calendar,
  UserRound,
  Play,
  Plus,
  ArrowRight,
  Sun,
  ListTodo,
  BarChart3,
  X,
} from 'lucide-react';
import { NavTab } from '../../types';

interface CommandMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandMenuModal: React.FC<CommandMenuModalProps> = ({ isOpen, onClose }) => {
  const {
    tasks,
    projects,
    setActiveTab,
    openFocusSession,
    openTaskModal,
    updateTask,
    addToast,
    calculateProjectProgress,
  } = useApp();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const normalizedQuery = query.toLowerCase();
  const filteredTasks = tasks
    .filter((task) => task.title.toLowerCase().includes(normalizedQuery))
    .slice(0, 4);

  const filteredProjects = projects
    .filter((project) => project.name.toLowerCase().includes(normalizedQuery))
    .slice(0, 3);

  const navigationActions = [
    { label: 'Đi tới Hôm nay', tab: 'today' as NavTab, icon: Sun },
    { label: 'Đi tới Công việc', tab: 'tasks' as NavTab, icon: ListTodo },
    { label: 'Đi tới Lịch', tab: 'calendar' as NavTab, icon: Calendar },
    { label: 'Đi tới Cá nhân', tab: 'personal' as NavTab, icon: UserRound },
    { label: 'Đi tới Báo cáo', tab: 'reports' as NavTab, icon: BarChart3 },
  ].filter((action) => action.label.toLowerCase().includes(normalizedQuery));

  const handleSelectNav = (tab: NavTab) => {
    setActiveTab(tab);
    onClose();
  };

  const handleCompleteTask = (taskId: string, title: string) => {
    updateTask(taskId, { status: 'done', completedAt: new Date().toISOString() });
    addToast(`Đã hoàn thành "${title}"`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16 backdrop-blur-xs animate-in fade-in sm:pt-24">
      <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-stone-200 p-3.5">
          <Search className="h-4 w-4 shrink-0 text-stone-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm kiếm công việc, dự án hoặc màn hình..."
            className="flex-1 bg-transparent text-sm text-stone-900 outline-hidden placeholder:text-stone-400"
          />
          <kbd className="hidden rounded border border-stone-200 bg-stone-100 px-2 py-0.5 font-mono text-[10px] text-stone-400 sm:inline-block">
            ESC
          </kbd>
          <button onClick={onClose} className="p-1 text-stone-400 sm:hidden" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-96 space-y-3 overflow-y-auto p-2">
          <div className="space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Thao tác nhanh
            </div>
            <button
              onClick={() => {
                openTaskModal();
                onClose();
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-stone-700 transition-colors hover:bg-stone-100"
            >
              <span className="flex items-center gap-2">
                <Plus className="h-3.5 w-3.5 text-blue-600" /> Tạo công việc mới
              </span>
              <kbd className="font-mono text-[10px] text-stone-400">T</kbd>
            </button>
          </div>

          {filteredTasks.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Công việc
              </div>
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="group flex items-center justify-between rounded-xl px-3 py-2 text-xs text-stone-800 transition-colors hover:bg-stone-100"
                >
                  <button
                    type="button"
                    onClick={() => {
                      openTaskModal(task);
                      onClose();
                    }}
                    className="min-w-0 flex-1 truncate text-left font-medium"
                  >
                    {task.title}
                  </button>
                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={() => {
                        openFocusSession(task);
                        onClose();
                      }}
                      title="Bắt đầu tập trung"
                      className="rounded p-1 text-blue-600 hover:bg-blue-100"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleCompleteTask(task.id, task.title)}
                      title="Hoàn thành"
                      className="rounded p-1 text-emerald-600 hover:bg-emerald-100"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredProjects.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Dự án
              </div>
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    setActiveTab('tasks');
                    onClose();
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs text-stone-800 transition-colors hover:bg-stone-100"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate font-medium">{project.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-stone-400">
                    {calculateProjectProgress(project.id)}%
                  </span>
                </button>
              ))}
            </div>
          )}

          {navigationActions.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Điều hướng
              </div>
              {navigationActions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.tab}
                    onClick={() => handleSelectNav(item.tab)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-stone-700 transition-colors hover:bg-stone-100"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-stone-500" />
                      <span>{item.label}</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-stone-300" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50/70 p-2.5 text-[10px] text-stone-400">
          <span>Nhấp vào kết quả để mở nhanh</span>
          <span className="font-mono">Ctrl + K / ⌘ + K</span>
        </div>
      </div>
    </div>
  );
};
