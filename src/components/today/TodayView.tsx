import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, ParsedInputResult } from '../../types';
import { ConfirmationModal } from '../common/ConfirmationModal';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Play,
  Calendar,
  Clock,
  MoreHorizontal,
  ChevronRight,
  Plus,
  Flame,
  ArrowRight,
  ListTodo,
  Check,
  X,
  Edit2,
  CalendarClock,
  Split,
  MessageSquare,
  AlertCircle,
  Tag,
  Star,
  Sun,
  Moon,
  Search,
} from 'lucide-react';
import { getFormattedToday } from '../../data/mockData';

export const TodayView: React.FC = () => {
  const {
    tasks,
    calendarEvents,
    habits,
    aiSuggestions,
    projects,
    toggleTaskComplete,
    toggleTopPriority,
    startFocusSession,
    setEditingTask,
    updateTask,
    breakdownTaskWithAi,
    applyAiSuggestion,
    dismissAiSuggestion,
    parseAndConfirmInput,
    confirmParsedInput,
    addToast,
    setIsMorningPlanningOpen,
    setIsEveningReviewOpen,
    setIsCommandMenuOpen,
  } = useApp();

  const [naturalInput, setNaturalInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedConfirmationData, setParsedConfirmationData] = useState<ParsedInputResult | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  // Other tasks filter
  const [otherFilter, setOtherFilter] = useState<'all' | 'work' | 'personal' | 'priority' | 'unscheduled'>('all');

  // Greeting calculation
  const now = new Date();
  const currentHour = now.getHours();
  let greeting = 'Chào buổi sáng';
  if (currentHour >= 12 && currentHour < 18) {
    greeting = 'Chào buổi chiều';
  } else if (currentHour >= 18) {
    greeting = 'Chào buổi tối';
  }

  // Vietnamese Date formatting: "Chủ Nhật, 13 tháng 9"
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayOfWeek = dayNames[now.getDay()];
  const formattedFullDate = `${dayOfWeek}, ${now.getDate()} tháng ${now.getMonth() + 1}`;
  const todayDateStr = getFormattedToday(0);

  // Tasks for today
  const todayTasks = tasks.filter((t) => t.plannedDate === todayDateStr || t.isTopPriority);
  const topPriorityTasks = tasks.filter((t) => t.isTopPriority).slice(0, 3);
  const otherTasks = tasks.filter((t) => !t.isTopPriority && t.status !== 'done');

  // Filter other tasks
  const filteredOtherTasks = otherTasks.filter((t) => {
    if (otherFilter === 'work') return t.category === 'work';
    if (otherFilter === 'personal') return t.category === 'personal';
    if (otherFilter === 'priority') return t.priority === 'urgent' || t.priority === 'high';
    if (otherFilter === 'unscheduled') return !t.startTime;
    return true;
  });

  // Progress metrics
  const completedTodayCount = todayTasks.filter((t) => t.status === 'done').length;
  const totalTodayCount = todayTasks.length;
  const totalPlannedMinutes = todayTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
  const totalActualMinutes = todayTasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0);
  const plannedHours = (totalPlannedMinutes / 60).toFixed(1);
  const actualHours = (totalActualMinutes / 60).toFixed(1);

  const todayHabits = habits;
  const completedHabitsCount = todayHabits.filter((h) => h.completedDates.includes(todayDateStr)).length;

  const progressPercentage =
    totalTodayCount > 0 ? Math.round((completedTodayCount / totalTodayCount) * 100) : 0;

  // Natural language submit
  const handleNaturalInputSubmit = async (e?: React.FormEvent, promptOverride?: string) => {
    if (e) e.preventDefault();
    const query = promptOverride || naturalInput;
    if (!query.trim() || isParsing) return;

    setIsParsing(true);
    try {
      const parsed = await parseAndConfirmInput(query.trim());
      setParsedConfirmationData(parsed);
      setIsConfirmationOpen(true);
      setNaturalInput('');
    } catch (err) {
      addToast('Không thể phân tích câu lệnh lúc này.', 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const suggestionChips = [
    'Mai 9 giờ chụp sản phẩm Senko trong 2 tiếng',
    'Nhắc tôi gọi nhà cung cấp lúc 3 giờ chiều',
    'Hoàn thiện concept hộp nhẫn đỏ đô trước thứ Sáu',
    'Mỗi tối đi bộ 30 phút',
    'Dời việc viết content sang sáng mai',
  ];

  // Timeline events for today sorted by time
  const todayTimelineEvents = calendarEvents
    .filter((e) => e.date === todayDateStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-7 max-w-5xl mx-auto">
      {/* 1. Top Header & Overview */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
              {greeting}, Trần Đăng
            </h1>
            <span className="text-xs sm:text-sm font-medium text-stone-500">{formattedFullDate}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMorningPlanningOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-amber-50/60 text-xs font-semibold text-stone-700 hover:text-amber-800 hover:border-amber-200 flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Kế hoạch sáng</span>
            </button>
            <button
              onClick={() => setIsEveningReviewOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-indigo-50/60 text-xs font-semibold text-stone-700 hover:text-indigo-800 hover:border-indigo-200 flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Moon className="w-3.5 h-3.5 text-indigo-500" />
              <span>Tổng kết tối</span>
            </button>
            <button
              onClick={() => setIsCommandMenuOpen(true)}
              title="Tìm kiếm & Thao tác nhanh (Ctrl/Cmd + K)"
              className="p-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors shadow-2xs"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI Overview Banner */}
        <div className="p-3.5 bg-[#f5f4ef] rounded-xl border border-stone-200/80 flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs sm:text-sm text-stone-700 leading-relaxed">
            <span className="font-semibold text-stone-900">Tổng quan hôm nay: </span>
            Bạn có {totalTodayCount} việc, {topPriorityTasks.length} việc quan trọng và khoảng{' '}
            {plannedHours} giờ tập trung. Buổi sáng là khung giờ vàng cho buổi chụp studio Senko.
          </div>
        </div>
      </div>

      {/* 2. Global Natural Language Input Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-stone-200/90 shadow-xs space-y-2.5">
        <form onSubmit={handleNaturalInputSubmit} className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={naturalInput}
            onChange={(e) => setNaturalInput(e.target.value)}
            disabled={isParsing}
            placeholder="Hôm nay bạn muốn thêm gì? (ví dụ: 'Mai 9 giờ chụp sản phẩm Senko trong 2 tiếng')"
            className="flex-1 text-sm bg-transparent border-none text-stone-900 placeholder:text-stone-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!naturalInput.trim() || isParsing}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs shrink-0 flex items-center gap-1.5"
          >
            {isParsing ? 'Đang phân tích...' : 'Thêm'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-stone-100">
          <span className="text-[11px] text-stone-400 shrink-0">Gợi ý mẫu:</span>
          {suggestionChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleNaturalInputSubmit(undefined, chip)}
              disabled={isParsing}
              className="text-[11px] whitespace-nowrap px-2 py-0.5 rounded-md bg-stone-50 hover:bg-stone-100 text-stone-600 hover:text-stone-900 border border-stone-200/60 transition-colors"
            >
              &ldquo;{chip}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* 3. Tiến độ hôm nay (Today's Progress) */}
      <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Tiến độ hôm nay
          </h2>
          <div className="flex items-center gap-4 text-xs text-stone-600">
            <span>
              Công việc: <strong className="text-stone-900">{completedTodayCount}/{totalTodayCount}</strong>
            </span>
            <span className="text-stone-300">•</span>
            <span>
              Thời gian tập trung: <strong className="text-stone-900">{actualHours}h</strong> / {plannedHours}h
            </span>
            <span className="text-stone-300">•</span>
            <span>
              Thói quen: <strong className="text-stone-900">{completedHabitsCount}/{todayHabits.length}</strong>
            </span>
          </div>
        </div>
        {/* Subtle Progress Bar */}
        <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-emerald-600 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* 4. Trợ lý đề xuất (AI Recommendations - Max 3) */}
      {aiSuggestions.filter((s) => s.status === 'pending').length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Trợ lý đề xuất ({aiSuggestions.filter((s) => s.status === 'pending').length})
            </h2>
            <span className="text-[11px] text-stone-400">Không tự ý đổi lịch khi chưa bạn duyệt</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {aiSuggestions
              .filter((s) => s.status === 'pending')
              .slice(0, 3)
              .map((sug) => (
                <div
                  key={sug.id}
                  className="bg-white p-4 rounded-xl border border-stone-200/90 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-semibold text-stone-900 leading-snug">
                      {sug.title}
                    </h3>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      <span className="font-medium text-stone-700">Lý do: </span>
                      {sug.reason}
                    </p>
                    <p className="text-[11px] text-emerald-800 bg-emerald-50/70 p-1.5 rounded-md border border-emerald-100 leading-relaxed">
                      <span className="font-medium">Tác động: </span>
                      {sug.expectedImpact}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-1">
                    <button
                      onClick={() => applyAiSuggestion(sug.id)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <Check className="w-3 h-3" /> Áp dụng
                    </button>
                    <button
                      onClick={() => {
                        const targetTask = tasks.find((t) => t.id === sug.payload?.taskId);
                        if (targetTask) setEditingTask(targetTask);
                      }}
                      className="px-2 py-1 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg text-xs font-medium transition-colors"
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      onClick={() => dismissAiSuggestion(sug.id)}
                      className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition-colors"
                      title="Bỏ qua đề xuất này"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 5. Việc quan trọng nhất (Top 3 Priority Tasks) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              Việc quan trọng nhất hôm nay
            </h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
              {topPriorityTasks.length}/3 việc
            </span>
          </div>
          <span className="text-[11px] text-stone-400">Tập trung hoàn thành trước 15:00</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {topPriorityTasks.map((task) => {
            const project = projects.find((p) => p.id === task.projectId);
            const isDone = task.status === 'done';

            return (
              <div
                key={task.id}
                className={`group bg-white p-4 rounded-xl border transition-all ${
                  isDone
                    ? 'border-stone-200/60 bg-stone-50/40 opacity-70'
                    : 'border-stone-200 shadow-xs hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleTaskComplete(task.id)}
                      className="mt-0.5 text-stone-300 hover:text-emerald-600 transition-colors shrink-0"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-semibold ${
                            isDone ? 'line-through text-stone-400' : 'text-stone-900'
                          }`}
                        >
                          {task.title}
                        </span>

                        {project && (
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md border"
                            style={{
                              borderColor: `${project.color}30`,
                              backgroundColor: `${project.color}10`,
                              color: project.color,
                            }}
                          >
                            {project.name}
                          </span>
                        )}

                        {task.startTime && (
                          <span className="text-[11px] text-stone-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-stone-400" />
                            {task.startTime} ({task.estimatedMinutes}p)
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-stone-500 line-clamp-1">{task.description}</p>
                      )}

                      {/* Subtasks progress preview */}
                      {task.subtasks.length > 0 && (
                        <div className="pt-1 flex items-center gap-2 text-[11px] text-stone-500">
                          <span className="flex items-center gap-1 font-medium text-stone-600">
                            <ListTodo className="w-3 h-3" />
                            {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} bước
                          </span>
                          <div className="w-20 bg-stone-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full"
                              style={{
                                width: `${
                                  (task.subtasks.filter((s) => s.completed).length /
                                    task.subtasks.length) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions for Top Priority Task */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startFocusSession(task)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-blue-200/60"
                      title="Bắt đầu phiên làm việc sâu"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span className="hidden sm:inline">Tập trung</span>
                    </button>

                    <button
                      onClick={() => breakdownTaskWithAi(task.id)}
                      className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Chia nhỏ nhiệm vụ bằng AI"
                    >
                      <Split className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setEditingTask(task)}
                      className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                      title="Chỉnh sửa chi tiết"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => toggleTopPriority(task.id)}
                      className="p-1.5 text-amber-500 hover:text-stone-400 rounded-lg transition-colors"
                      title="Bỏ khỏi việc quan trọng nhất"
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Lịch hôm nay (Vertical Timeline with Free time & current time) */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            Lịch hôm nay ({todayTimelineEvents.length} khung thời gian)
          </h2>
          <span className="text-[11px] text-stone-400 font-mono">Asia/Ho_Chi_Minh</span>
        </div>

        <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
          {todayTimelineEvents.map((ev, idx) => {
            const isHabit = ev.type === 'habit';
            const isMeeting = ev.type === 'meeting';
            const isTask = ev.type === 'task';

            let pillColor = 'border-blue-200 bg-blue-50/50 text-blue-900';
            let dotColor = 'bg-blue-600';
            if (isHabit) {
              pillColor = 'border-emerald-200 bg-emerald-50/50 text-emerald-900';
              dotColor = 'bg-emerald-600';
            } else if (isMeeting) {
              pillColor = 'border-amber-200 bg-amber-50/50 text-amber-900';
              dotColor = 'bg-amber-600';
            }

            return (
              <div key={ev.id} className="relative group">
                {/* Timeline Dot */}
                <div
                  className={`absolute -left-[19px] top-3 w-2.5 h-2.5 rounded-full ring-4 ring-white ${dotColor}`}
                />

                <div
                  className={`p-3 rounded-xl border ${pillColor} transition-all hover:shadow-xs flex items-center justify-between gap-3`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-stone-700">
                        {ev.startTime} - {ev.endTime}
                      </span>
                      <span className="font-medium text-xs text-stone-900">{ev.title}</span>
                    </div>
                    {ev.description && (
                      <p className="text-[11px] text-stone-500">{ev.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {ev.location && (
                      <span className="text-[10px] text-stone-500 px-2 py-0.5 bg-white/70 rounded-md border border-stone-200/60">
                        {ev.location}
                      </span>
                    )}
                    <span className="text-[10px] uppercase font-semibold text-stone-400">
                      {isMeeting ? 'Cuộc họp' : isHabit ? 'Thói quen' : 'Công việc'}
                    </span>
                  </div>
                </div>

                {/* Free time block gap indicator between events if gap > 30 mins */}
                {idx < todayTimelineEvents.length - 1 && (
                  <div className="py-1 px-3 my-1 ml-2 text-[10px] text-stone-400 border-l border-dashed border-stone-300">
                    Khoảng trống tự do giữa các khung giờ
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. Việc khác (Remaining Tasks with filters) */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
            <ListTodo className="w-4 h-4 text-stone-500" />
            Việc khác ({filteredOtherTasks.length})
          </h2>

          {/* Filters */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'all', label: 'Tất cả' },
                { id: 'work', label: 'Công việc' },
                { id: 'personal', label: 'Cá nhân' },
                { id: 'priority', label: 'Ưu tiên' },
                { id: 'unscheduled', label: 'Chưa lên lịch' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setOtherFilter(f.id)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                  otherFilter === f.id
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-stone-100">
          {filteredOtherTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-stone-400">
              Không có công việc nào trong danh mục này.
            </div>
          ) : (
            filteredOtherTasks.map((task) => {
              const project = projects.find((p) => p.id === task.projectId);
              return (
                <div
                  key={task.id}
                  className="py-2.5 flex items-center justify-between gap-3 group hover:bg-stone-50/70 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleTaskComplete(task.id)}
                      className="text-stone-300 hover:text-emerald-600 shrink-0"
                    >
                      <Circle className="w-4 h-4" />
                    </button>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <span className="text-xs font-medium text-stone-800 block truncate">
                        {task.title}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-stone-400">
                        {project && (
                          <span className="font-medium text-stone-600">{project.name}</span>
                        )}
                        {task.deadline && <span>Hạn: {task.deadline}</span>}
                        {task.estimatedMinutes && <span>{task.estimatedMinutes}p</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={() => toggleTopPriority(task.id)}
                      className="p-1 text-stone-300 hover:text-amber-500 rounded transition-colors"
                      title="Đưa vào việc quan trọng nhất"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingTask(task)}
                      className="p-1 text-stone-400 hover:text-stone-600 rounded transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmation Modal for Natural Language Input */}
      <ConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        parsedData={parsedConfirmationData}
        onConfirm={confirmParsedInput}
      />
    </div>
  );
};
