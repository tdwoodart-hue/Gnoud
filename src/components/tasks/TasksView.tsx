import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, Project, TaskStatus, TaskPriority, TaskCategory } from '../../types';
import {
  FolderKanban,
  ListTodo,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  Star,
  Clock,
  Calendar,
  AlertCircle,
  Edit2,
  Trash2,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Tag,
  Check,
} from 'lucide-react';
import { getFormattedToday } from '../../data/mockData';

export const TasksView: React.FC = () => {
  const {
    tasks,
    projects,
    addTask,
    deleteTask,
    toggleTaskComplete,
    toggleTopPriority,
    setEditingTask,
    addProject,
    toggleMilestone,
    calculateProjectProgress,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'list' | 'projects'>('list');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // List filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // New task quick state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('work');
  const [newTaskProjectId, setNewTaskProjectId] = useState<string>('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');

  // New Project modal state
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjCategory, setNewProjCategory] = useState<TaskCategory>('work');

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    return true;
  });

  const handleQuickAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addTask({
      title: newTaskTitle.trim(),
      category: newTaskCategory,
      projectId: newTaskProjectId || undefined,
      priority: newTaskPriority,
      plannedDate: getFormattedToday(0),
    });
    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    addProject({
      name: newProjName.trim(),
      description: newProjDesc.trim(),
      category: newProjCategory,
      color: newProjCategory === 'work' ? '#3b82f6' : '#10b981',
      targetDate: getFormattedToday(30),
      milestones: [
        { id: `m-${Date.now()}-1`, title: 'Cột mốc khởi động', completed: false, weight: 3 },
      ],
    });
    setNewProjName('');
    setNewProjDesc('');
    setIsAddingProject(false);
  };

  const statusLabels: Record<TaskStatus, { label: string; color: string }> = {
    todo: { label: 'Chưa làm', color: 'text-stone-600 bg-stone-100' },
    in_progress: { label: 'Đang làm', color: 'text-blue-700 bg-blue-50' },
    waiting: { label: 'Chờ phản hồi', color: 'text-amber-700 bg-amber-50' },
    done: { label: 'Hoàn thành', color: 'text-emerald-700 bg-emerald-50' },
    deferred: { label: 'Tạm hoãn', color: 'text-stone-400 bg-stone-100' },
  };

  const priorityLabels: Record<TaskPriority, { label: string; dotColor: string }> = {
    urgent: { label: 'Khẩn cấp', dotColor: 'bg-red-500' },
    high: { label: 'Quan trọng', dotColor: 'bg-amber-500' },
    medium: { label: 'Bình thường', dotColor: 'bg-blue-500' },
    low: { label: 'Có thể làm sau', dotColor: 'bg-stone-300' },
  };

  // Selected project for detail view
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Công việc & Dự án</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Quản lý tập trung mọi nhiệm vụ công việc và kế hoạch cá nhân
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200/60 self-start">
          <button
            onClick={() => {
              setActiveTab('list');
              setSelectedProjectId(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'list' && !selectedProjectId
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            Danh sách ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'projects' || selectedProjectId
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            Dự án ({projects.length})
          </button>
        </div>
      </div>

      {/* 1. Project Detail View (if a project is selected) */}
      {selectedProject ? (
        <div className="space-y-6 animate-in fade-in duration-150">
          <button
            onClick={() => setSelectedProjectId(null)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            ← Quay lại danh sách dự án
          </button>

          {/* Project Banner Card */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: selectedProject.color }}
                  />
                  <h2 className="text-xl font-bold text-stone-900">{selectedProject.name}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                    {selectedProject.category === 'work' ? 'Công việc' : 'Cá nhân'}
                  </span>
                </div>
                <p className="text-xs text-stone-600 max-w-2xl">{selectedProject.description}</p>
              </div>

              <div className="text-right sm:shrink-0">
                <div className="text-xs text-stone-500">Mục tiêu bàn giao</div>
                <div className="text-sm font-semibold text-stone-900">
                  {selectedProject.targetDate || 'Chưa đặt'}
                </div>
              </div>
            </div>

            {/* Weighted Progress Bar */}
            <div className="space-y-1.5 pt-2 border-t border-stone-100">
              <div className="flex justify-between text-xs">
                <span className="text-stone-500 font-medium">Tiến độ thực tế (trọng số mốc & nhiệm vụ)</span>
                <span className="font-bold text-stone-900">
                  {calculateProjectProgress(selectedProject.id)}%
                </span>
              </div>
              <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${calculateProjectProgress(selectedProject.id)}%`,
                    backgroundColor: selectedProject.color,
                  }}
                />
              </div>
            </div>

            {/* AI Project Health Summary */}
            {selectedProject.aiHealthSummary && (
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Đánh giá sức khỏe dự án bằng AI
                  </div>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${
                      selectedProject.aiHealthSummary.status === 'healthy'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedProject.aiHealthSummary.status === 'healthy'
                      ? 'Đúng tiến độ'
                      : 'Cần chú ý'}
                  </span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed">
                  {selectedProject.aiHealthSummary.summary}
                </p>
                {selectedProject.aiHealthSummary.recommendations.length > 0 && (
                  <ul className="text-xs text-stone-600 space-y-1 list-disc list-inside">
                    {selectedProject.aiHealthSummary.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Milestones & Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Milestones */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Cột mốc quan trọng ({selectedProject.milestones.length})
              </h3>
              <div className="space-y-2">
                {selectedProject.milestones.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => toggleMilestone(selectedProject.id, m.id)}
                    className="flex items-start gap-3 p-2.5 rounded-xl border border-stone-200/70 hover:bg-stone-50 cursor-pointer transition-colors"
                  >
                    <button type="button" className="mt-0.5 text-stone-400 hover:text-emerald-600">
                      {m.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-xs font-medium block ${
                          m.completed ? 'line-through text-stone-400' : 'text-stone-900'
                        }`}
                      >
                        {m.title}
                      </span>
                      {m.targetDate && (
                        <span className="text-[10px] text-stone-400">Hạn: {m.targetDate}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Hoạt động gần đây
              </h3>
              <div className="space-y-2.5">
                {selectedProject.recentActivity.map((act) => (
                  <div key={act.id} className="text-xs space-y-0.5 border-l-2 border-stone-200 pl-3">
                    <span className="text-[10px] text-stone-400 block">{act.timestamp}</span>
                    <span className="text-stone-700">{act.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Related Tasks */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Các nhiệm vụ liên quan ({tasks.filter((t) => t.projectId === selectedProject.id).length})
            </h3>
            <div className="divide-y divide-stone-100">
              {tasks
                .filter((t) => t.projectId === selectedProject.id)
                .map((task) => (
                  <div
                    key={task.id}
                    className="py-2.5 flex items-center justify-between gap-3 group hover:bg-stone-50/80 px-2 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleTaskComplete(task.id)}
                        className="text-stone-300 hover:text-emerald-600"
                      >
                        {task.status === 'done' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>
                      <span
                        className={`text-xs font-medium ${
                          task.status === 'done' ? 'line-through text-stone-400' : 'text-stone-900'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                    <button
                      onClick={() => setEditingTask(task)}
                      className="text-stone-400 hover:text-stone-700 p-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'projects' ? (
        /* 2. Projects Grid View */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-stone-500">
              Nhấp vào dự án để xem chi tiết mốc tiến độ & phân tích AI
            </span>
            <button
              onClick={() => setIsAddingProject(true)}
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm dự án
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => {
              const projectTasks = tasks.filter((t) => t.projectId === p.id);
              const progress = calculateProjectProgress(p.id);

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border"
                        style={{
                          borderColor: `${p.color}40`,
                          backgroundColor: `${p.color}10`,
                          color: p.color,
                        }}
                      >
                        {p.category === 'work' ? 'Công việc' : 'Cá nhân'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-blue-600 transition-colors" />
                    </div>

                    <h3 className="font-bold text-stone-900 text-base leading-snug group-hover:text-blue-600 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  {/* Footer stats */}
                  <div className="space-y-2 pt-3 border-t border-stone-100">
                    <div className="flex justify-between text-xs text-stone-500">
                      <span>{projectTasks.length} nhiệm vụ</span>
                      <span className="font-semibold text-stone-800">{progress}%</span>
                    </div>
                    <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%`, backgroundColor: p.color }}
                      />
                    </div>
                    {p.targetDate && (
                      <span className="text-[10px] text-stone-400 block text-right">
                        Hạn: {p.targetDate}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 3. Tasks List View */
        <div className="space-y-4">
          {/* Action Bar: Search, Filters & Add Task */}
          <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm công việc..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-700"
              >
                <option value="all">Mọi trạng thái</option>
                <option value="todo">Chưa làm</option>
                <option value="in_progress">Đang làm</option>
                <option value="waiting">Chờ phản hồi</option>
                <option value="done">Hoàn thành</option>
                <option value="deferred">Tạm hoãn</option>
              </select>

              {/* Priority filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-700 hidden md:block"
              >
                <option value="all">Mọi mức ưu tiên</option>
                <option value="urgent">Khẩn cấp</option>
                <option value="high">Quan trọng</option>
                <option value="medium">Bình thường</option>
                <option value="low">Có thể làm sau</option>
              </select>
            </div>

            <button
              onClick={() => setIsAddingTask(!isAddingTask)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm nhiệm vụ
            </button>
          </div>

          {/* Quick Add Form Dropdown */}
          {isAddingTask && (
            <form
              onSubmit={handleQuickAddTask}
              className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm space-y-3 animate-in fade-in"
            >
              <div className="text-xs font-semibold text-stone-800">Thêm nhiệm vụ mới nhanh</div>
              <input
                type="text"
                required
                autoFocus
                placeholder="Tiêu đề nhiệm vụ..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:border-blue-500"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={newTaskCategory}
                  onChange={(e) => setNewTaskCategory(e.target.value as any)}
                  className="px-2 py-1.5 text-xs bg-white border border-stone-200 rounded-lg"
                >
                  <option value="work">Công việc</option>
                  <option value="personal">Cá nhân</option>
                </select>

                <select
                  value={newTaskProjectId}
                  onChange={(e) => setNewTaskProjectId(e.target.value)}
                  className="px-2 py-1.5 text-xs bg-white border border-stone-200 rounded-lg"
                >
                  <option value="">(Chọn dự án liên quan)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as any)}
                  className="px-2 py-1.5 text-xs bg-white border border-stone-200 rounded-lg"
                >
                  <option value="urgent">Khẩn cấp</option>
                  <option value="high">Quan trọng</option>
                  <option value="medium">Bình thường</option>
                  <option value="low">Có thể làm sau</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
                >
                  Tạo nhiệm vụ
                </button>
              </div>
            </form>
          )}

          {/* Tasks Table / List */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="divide-y divide-stone-100">
              {filteredTasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-400">
                  Không tìm thấy nhiệm vụ nào phù hợp.
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const project = projects.find((p) => p.id === task.projectId);
                  const isDone = task.status === 'done';

                  return (
                    <div
                      key={task.id}
                      className="p-3.5 flex items-center justify-between gap-3 group hover:bg-stone-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          onClick={() => toggleTaskComplete(task.id)}
                          className="text-stone-300 hover:text-emerald-600 shrink-0"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>

                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-xs font-medium ${
                                isDone ? 'line-through text-stone-400' : 'text-stone-900'
                              }`}
                            >
                              {task.title}
                            </span>

                            {/* Status chip */}
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                                statusLabels[task.status].color
                              }`}
                            >
                              {statusLabels[task.status].label}
                            </span>

                            {/* Priority dot */}
                            <span className="flex items-center gap-1 text-[10px] text-stone-500">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  priorityLabels[task.priority].dotColor
                                }`}
                              />
                              {priorityLabels[task.priority].label}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] text-stone-400">
                            {project && (
                              <span className="font-medium text-stone-600">{project.name}</span>
                            )}
                            {task.deadline && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Hạn: {task.deadline}
                              </span>
                            )}
                            {task.subtasks.length > 0 && (
                              <span>
                                {task.subtasks.filter((s) => s.completed).length}/
                                {task.subtasks.length} bước
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleTopPriority(task.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            task.isTopPriority
                              ? 'text-amber-500'
                              : 'text-stone-300 hover:text-amber-500'
                          }`}
                          title="Ghim làm việc quan trọng nhất"
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>

                        <button
                          onClick={() => setEditingTask(task)}
                          className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {isAddingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-stone-900">Tạo dự án mới</h3>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Tên dự án</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Ra mắt Senko..."
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Mô tả mục tiêu</label>
                <textarea
                  rows={2}
                  placeholder="Mục đích chính của dự án này..."
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Loại hình</label>
                <select
                  value={newProjCategory}
                  onChange={(e) => setNewProjCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg"
                >
                  <option value="work">Công việc</option>
                  <option value="personal">Cá nhân</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingProject(false)}
                  className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
                >
                  Tạo dự án
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
