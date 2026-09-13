import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarEvent, Task } from '../../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  AlertTriangle,
  Sparkles,
  Check,
  X,
  Layers,
  MapPin,
} from 'lucide-react';
import { getFormattedToday } from '../../data/mockData';

export const CalendarView: React.FC = () => {
  const {
    calendarEvents,
    addCalendarEvent,
    deleteCalendarEvent,
    tasks,
    updateTask,
    smartScheduleWithAi,
    addToast,
  } = useApp();

  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [currentDateIndex, setCurrentDateIndex] = useState(0); // 0 = today, +1 = tomorrow, etc.
  const [isAiScheduling, setIsAiScheduling] = useState(false);

  // New Event quick modal
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(getFormattedToday(0));
  const [eventStartTime, setEventStartTime] = useState('10:00');
  const [eventEndTime, setEventEndTime] = useState('11:00');
  const [eventType, setEventType] = useState<'task' | 'meeting' | 'personal' | 'habit'>('meeting');
  const [eventLocation, setEventLocation] = useState('');

  // Unscheduled tasks (tasks with no startTime or no plannedDate)
  const unscheduledTasks = tasks.filter((t) => !t.startTime && t.status !== 'done');

  // Overlap detection in today's / active events
  const detectOverlaps = (events: CalendarEvent[]) => {
    const sorted = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const overlaps: { event1: CalendarEvent; event2: CalendarEvent }[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const e1 = sorted[i];
        const e2 = sorted[j];
        if (e1.date === e2.date) {
          if (e1.endTime > e2.startTime && e1.startTime < e2.endTime) {
            overlaps.push({ event1: e1, event2: e2 });
          }
        }
      }
    }
    return overlaps;
  };

  const currentOverlaps = detectOverlaps(calendarEvents);

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    let color = '#3b82f6';
    if (eventType === 'personal') color = '#10b981';
    if (eventType === 'habit') color = '#059669';
    if (eventType === 'meeting') color = '#f59e0b';

    addCalendarEvent({
      title: eventTitle.trim(),
      date: eventDate,
      startTime: eventStartTime,
      endTime: eventEndTime,
      type: eventType,
      color,
      location: eventLocation.trim() || undefined,
    });

    setEventTitle('');
    setEventLocation('');
    setIsAddingEvent(false);
  };

  const handleScheduleTaskDirectly = (task: Task, time: string) => {
    // End time is start time + estimated duration
    const [h, m] = time.split(':').map(Number);
    const endMinutes = h * 60 + m + (task.estimatedMinutes || 60);
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const formattedEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    addCalendarEvent({
      title: task.title,
      date: getFormattedToday(0),
      startTime: time,
      endTime: formattedEndTime,
      type: task.category === 'work' ? 'task' : 'personal',
      taskId: task.id,
      color: task.category === 'work' ? '#3b82f6' : '#10b981',
    });

    updateTask(task.id, {
      plannedDate: getFormattedToday(0),
      startTime: time,
    });

    addToast(`Đã xếp "${task.title}" vào lúc ${time}`, 'success');
  };

  const handleAiSmartSchedule = async () => {
    setIsAiScheduling(true);
    await smartScheduleWithAi();
    setIsAiScheduling(false);
  };

  // Week days calculation (Monday as first day)
  const getWeekDates = () => {
    const dates = [];
    for (let i = -1; i <= 5; i++) {
      dates.push(getFormattedToday(i));
    }
    return dates;
  };

  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const weekDates = getWeekDates();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header & AI Scheduling Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Lịch & Lên lịch trình</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Sắp xếp thời gian thông minh, kiểm soát xung đột và cân bằng công việc
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAiSmartSchedule}
            disabled={isAiScheduling}
            className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            {isAiScheduling ? 'Đang phân tích lịch...' : 'Lên lịch bằng AI'}
          </button>

          <button
            onClick={() => setIsAddingEvent(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm lịch hẹn
          </button>
        </div>
      </div>

      {/* Overlap Alert Banner */}
      {currentOverlaps.length > 0 && (
        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-0.5">
            <span className="font-bold">Cảnh báo xung đột thời gian: </span>
            <span>
              Phát hiện {currentOverlaps.length} sự kiện bị trùng giờ (ví dụ: &ldquo;
              {currentOverlaps[0].event1.title}&rdquo; và &ldquo;
              {currentOverlaps[0].event2.title}&rdquo;). Hãy điều chỉnh lại để tránh quá tải.
            </span>
          </div>
        </div>
      )}

      {/* Main Grid: Calendar View (Left 8 cols) + Unscheduled Tasks (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Calendar View */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          {/* Controls: Prev/Next, Current Month, View Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-stone-900">
                Tháng 9, 2026 (Tuần hiện tại)
              </span>
            </div>

            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200/60">
              {(['day', 'week', 'month'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                    viewMode === mode
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {mode === 'day' ? 'Ngày' : mode === 'week' ? 'Tuần' : 'Tháng'}
                </button>
              ))}
            </div>
          </div>

          {/* Week View Grid */}
          {viewMode === 'week' && (
            <div className="space-y-3">
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {weekDays.map((day, idx) => {
                  const dateStr = weekDates[idx];
                  const isToday = dateStr === getFormattedToday(0);
                  return (
                    <div
                      key={day}
                      className={`p-2 rounded-xl text-xs ${
                        isToday ? 'bg-blue-50 border border-blue-200 font-bold text-blue-900' : 'bg-stone-50 text-stone-600'
                      }`}
                    >
                      <span className="block text-[10px] text-stone-400">{day}</span>
                      <span className="text-xs">{dateStr.slice(8, 10)}/09</span>
                    </div>
                  );
                })}
              </div>

              {/* Events by Day in Week */}
              <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 min-h-[360px]">
                {weekDates.map((dateStr) => {
                  const dayEvents = calendarEvents.filter((e) => e.date === dateStr);
                  const isToday = dateStr === getFormattedToday(0);

                  return (
                    <div
                      key={dateStr}
                      className={`p-2 rounded-xl border space-y-2 min-h-[120px] ${
                        isToday ? 'border-blue-200/80 bg-blue-50/20' : 'border-stone-100 bg-stone-50/40'
                      }`}
                    >
                      <div className="text-[10px] font-semibold text-stone-400 text-center sm:hidden">
                        {dateStr}
                      </div>

                      {dayEvents.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-[10px] text-stone-300">
                          Trống
                        </div>
                      ) : (
                        dayEvents.map((ev) => (
                          <div
                            key={ev.id}
                            className="p-2 rounded-lg text-xs space-y-1 shadow-2xs border transition-transform hover:-translate-y-0.5 bg-white"
                            style={{ borderLeftColor: ev.color, borderLeftWidth: 3 }}
                          >
                            <div className="font-semibold text-stone-900 text-[11px] leading-snug line-clamp-2">
                              {ev.title}
                            </div>
                            <div className="text-[10px] text-stone-500 font-mono">
                              {ev.startTime} - {ev.endTime}
                            </div>
                            {ev.location && (
                              <div className="text-[9px] text-stone-400 flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" />
                                {ev.location}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Day View */}
          {viewMode === 'day' && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-stone-700">
                Lịch chi tiết ngày hôm nay ({getFormattedToday(0)})
              </div>
              <div className="divide-y divide-stone-100">
                {calendarEvents
                  .filter((e) => e.date === getFormattedToday(0))
                  .map((ev) => (
                    <div
                      key={ev.id}
                      className="py-3 flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-stone-700 w-24">
                          {ev.startTime} - {ev.endTime}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-stone-900">{ev.title}</div>
                          {ev.description && (
                            <div className="text-[11px] text-stone-500">{ev.description}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md text-white"
                          style={{ backgroundColor: ev.color }}
                        >
                          {ev.type}
                        </span>
                        <button
                          onClick={() => deleteCalendarEvent(ev.id)}
                          className="text-stone-300 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Month View */}
          {viewMode === 'month' && (
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-stone-500 py-1">
                {weekDays.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 30 }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `2026-09-${String(dayNum).padStart(2, '0')}`;
                  const dayEvents = calendarEvents.filter((e) => e.date === dateStr);
                  const isToday = dayNum === 13;

                  return (
                    <div
                      key={i}
                      className={`min-h-[64px] p-1.5 rounded-lg border text-xs flex flex-col justify-between ${
                        isToday ? 'border-blue-500 bg-blue-50/30' : 'border-stone-100 bg-white'
                      }`}
                    >
                      <span
                        className={`text-[10px] font-bold ${
                          isToday ? 'text-blue-600' : 'text-stone-700'
                        }`}
                      >
                        {dayNum}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 2).map((ev) => (
                            <div
                              key={ev.id}
                              className="truncate text-[9px] px-1 rounded text-white font-medium"
                              style={{ backgroundColor: ev.color }}
                            >
                              {ev.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <span className="text-[8px] text-stone-400">
                              +{dayEvents.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center gap-4 text-[11px] text-stone-500">
            <span className="font-semibold text-stone-700">Màu phân loại:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Công việc
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Cá nhân
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Lịch hẹn / Gặp gỡ
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600" /> Thói quen
            </span>
          </div>
        </div>

        {/* Right Side: Unscheduled Tasks Panel */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-stone-500" />
              Việc chưa xếp lịch ({unscheduledTasks.length})
            </h3>
            <span className="text-[10px] text-stone-400">Gợi ý xếp vào ngày</span>
          </div>

          <p className="text-xs text-stone-500 leading-relaxed">
            Chọn giờ để đưa các công việc chưa có giờ cụ thể vào lịch hôm nay:
          </p>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {unscheduledTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                Tuyệt vời! Mọi việc đã được lên lịch trình.
              </div>
            ) : (
              unscheduledTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl border border-stone-200/80 hover:border-blue-300 bg-stone-50/50 space-y-2 transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-stone-900 block leading-snug">
                      {t.title}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      Dự kiến: {t.estimatedMinutes || 30} phút • {t.category === 'work' ? 'Công việc' : 'Cá nhân'}
                    </span>
                  </div>

                  {/* Quick time slots */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-stone-400">Xếp lúc:</span>
                    {['11:00', '14:30', '16:00', '17:00'].map((slot) => (
                      <button
                        key={slot}
                        onClick={() => handleScheduleTaskDirectly(t, slot)}
                        className="text-[10px] px-2 py-0.5 bg-white hover:bg-blue-50 hover:text-blue-700 text-stone-700 rounded-md border border-stone-200 transition-colors font-mono"
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* New Event Modal */}
      {isAddingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Thêm sự kiện / Lịch hẹn mới</h3>
              <button
                onClick={() => setIsAddingEvent(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Tiêu đề sự kiện</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Gặp đối tác cung cấp gỗ sồi..."
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Ngày diễn ra</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Loại hình</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg"
                  >
                    <option value="meeting">Lịch hẹn / Cuộc họp</option>
                    <option value="task">Khung giờ công việc</option>
                    <option value="personal">Việc cá nhân</option>
                    <option value="habit">Thói quen</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Bắt đầu</label>
                  <input
                    type="time"
                    required
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Kết thúc</label>
                  <input
                    type="time"
                    required
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Địa điểm / Đường link họp</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Xưởng TD Woodart hoặc Google Meet..."
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingEvent(false)}
                  className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
                >
                  Lưu sự kiện
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
