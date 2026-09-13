import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  UserRound,
  Sparkles,
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
    goals,
    calendarEvents,
    setActiveTab,
    setIsAssistantOpen,
    openFocusSession,
    openTaskModal,
    updateTask,
    addToast,
  } = useApp();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 4);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const navigationActions = [
    { label: 'Đi tới Hôm nay', tab: 'today' as NavTab, icon: Sun },
    { label: 'Đi tới Công việc', tab: 'tasks' as NavTab, icon: ListTodo },
    { label: 'Đi tới Lịch', tab: 'calendar' as NavTab, icon: Calendar },
    { label: 'Đi tới Cá nhân', tab: 'personal' as NavTab, icon: UserRound },
    { label: 'Đi tới Báo cáo', tab: 'reports' as NavTab, icon: BarChart3 },
  ].filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col">
        {/* Search Input */}
        <div className="p-3.5 border-b border-stone-200 flex items-center gap-3">
          <Search className="w-4 h-4 text-stone-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm công việc, dự án, mục tiêu hoặc nhập lệnh..."
            className="flex-1 text-sm bg-transparent outline-hidden text-stone-900 placeholder:text-stone-400"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-stone-400 bg-stone-100 rounded border border-stone-200">
            ESC
          </kbd>
          <button onClick={onClose} className="sm:hidden text-stone-400 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Results */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-3">
          {/* Quick Actions */}
          <div className="space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              Thao tác nhanh
            </div>

            <button
              onClick={() => {
                openTaskModal();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-blue-600" /> Tạo công việc mới
              </span>
              <kbd className="text-[10px] font-mono text-stone-400">T</kbd>
            </button>

            <button
              onClick={() => {
                setIsAssistantOpen(true);
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Hỏi Trợ lý AI
              </span>
              <kbd className="text-[10px] font-mono text-stone-400">A</kbd>
            </button>
          </div>

          {/* Matched Tasks */}
          {filteredTasks.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Công việc
              </div>
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-stone-800 hover:bg-stone-100 transition-colors group"
                >
                  <span
                    onClick={() => {
                      openTaskModal(task);
                      onClose();
                    }}
                    className="cursor-pointer truncate flex-1 font-medium"
                  >
                    {task.title}
                  </span>
                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={() => openFocusSession(task)}
                      title="Bắt đầu tập trung"
                      className="p-1 hover:bg-blue-100 rounded text-blue-600"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleCompleteTask(task.id, task.title)}
                      title="Hoàn thành"
                      className="p-1 hover:bg-emerald-100 rounded text-emerald-600"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Matched Projects */}
          {filteredProjects.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Dự án
              </div>
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    setActiveTab('tasks');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-stone-800 hover:bg-stone-100 transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="font-medium">{project.name}</span>
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {project.progress}%
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Navigation */}
          {navigationActions.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Điều hướng
              </div>
              {navigationActions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.tab}
                    onClick={() => handleSelectNav(item.tab)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-stone-700 hover:bg-stone-100 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-stone-500" />
                      <span>{item.label}</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-300" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-2.5 border-t border-stone-100 bg-stone-50/70 text-[10px] text-stone-400 flex items-center justify-between">
          <span>Dùng phím mũi tên hoặc nhấp chuột để chọn</span>
          <span className="font-mono">Ctrl + K / ⌘ + K</span>
        </div>
      </div>
    </div>
  );
};
