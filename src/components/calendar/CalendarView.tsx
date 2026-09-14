import React, { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../common/PageHeader';
import { EmptyState } from '../common/EmptyState';

const iso = (date: Date) => date.toISOString().slice(0, 10);
const dateLabel = (date: Date) =>
  new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);

type ImportedCalendarItem = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
  color?: string;
};

const normalizeDate = (value: unknown): string => {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  return compact ? `${compact[1]}-${compact[2]}-${compact[3]}` : '';
};

const normalizeTime = (value: unknown): string => {
  const raw = String(value || '').trim();
  const colon = raw.match(/^(\d{1,2}):(\d{2})/);
  if (colon) return `${colon[1].padStart(2, '0')}:${colon[2]}`;
  const dateTime = raw.match(/T(\d{2})(\d{2})/);
  if (dateTime) return `${dateTime[1]}:${dateTime[2]}`;
  const compact = raw.match(/^(\d{2})(\d{2})$/);
  return compact ? `${compact[1]}:${compact[2]}` : '';
};

const addMinutes = (time: string, minutes: number): string => {
  const [hours, mins] = time.split(':').map(Number);
  const total = Math.max(0, (hours || 0) * 60 + (mins || 0) + minutes);
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const unescapeIcs = (value: string) =>
  value.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim();

const parseJsonCalendar = (content: string): ImportedCalendarItem[] => {
  const parsed = JSON.parse(content);
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.events) ? parsed.events : [];

  return rows.flatMap((row: any) => {
    const title = String(row?.title || row?.summary || row?.name || '').trim();
    const date = normalizeDate(row?.date || row?.plannedDate || row?.startDate);
    const startTime = normalizeTime(row?.startTime || row?.time || row?.start) || '09:00';
    const duration = Number(row?.durationMinutes || row?.duration || 60);
    const endTime = normalizeTime(row?.endTime || row?.end) || addMinutes(startTime, Number.isFinite(duration) ? duration : 60);

    if (!title || !date) return [];
    return [{
      title,
      date,
      startTime,
      endTime,
      description: row?.description ? String(row.description) : undefined,
      location: row?.location ? String(row.location) : undefined,
      color: row?.color ? String(row.color) : undefined,
    }];
  });
};

const parseIcsCalendar = (content: string): ImportedCalendarItem[] => {
  const unfolded = content.replace(/\r?\n[ \t]/g, '');
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
  const read = (block: string, key: string) => {
    const match = block.match(new RegExp(`^${key}(?:;[^:]*)?:(.*)$`, 'mi'));
    return match ? unescapeIcs(match[1]) : '';
  };

  return blocks.flatMap((block) => {
    const title = read(block, 'SUMMARY');
    const startRaw = read(block, 'DTSTART');
    const endRaw = read(block, 'DTEND');
    const date = normalizeDate(startRaw);
    const startTime = normalizeTime(startRaw) || '09:00';
    const endTime = normalizeTime(endRaw) || addMinutes(startTime, 60);

    if (!title || !date) return [];
    return [{
      title,
      date,
      startTime,
      endTime,
      description: read(block, 'DESCRIPTION') || undefined,
      location: read(block, 'LOCATION') || undefined,
    }];
  });
};

export const parseImportedCalendar = (fileName: string, content: string): ImportedCalendarItem[] => {
  const lowerName = fileName.toLowerCase();
  const trimmed = content.trim();
  const items = lowerName.endsWith('.ics') || trimmed.includes('BEGIN:VCALENDAR')
    ? parseIcsCalendar(content)
    : parseJsonCalendar(content);

  if (!items.length) {
    throw new Error('Không tìm thấy sự kiện hợp lệ trong file.');
  }
  return items;
};

export const CalendarView: React.FC = () => {
  const { calendarEvents, tasks, openTaskModal, addCalendarEvent, addToast } = useApp();
  const [date, setDate] = useState(() => new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const key = iso(date);

  const items = useMemo(
    () => [
      ...calendarEvents
        .filter((event) => event.date === key)
        .map((event) => ({
          id: `e-${event.id}`,
          title: event.title,
          time: event.startTime,
          end: event.endTime,
          color: event.color || '#2563eb',
        })),
      ...tasks
        .filter(
          (task) =>
            task.plannedDate === key &&
            task.status !== 'done' &&
            !calendarEvents.some((event) => event.taskId === task.id),
        )
        .map((task) => ({
          id: `t-${task.id}`,
          title: task.title,
          time: task.startTime || '--:--',
          end: '',
          color: task.priority === 'urgent' ? '#f43f5e' : '#2563eb',
        })),
    ].sort((a, b) => a.time.localeCompare(b.time)),
    [calendarEvents, tasks, key],
  );

  const move = (days: number) =>
    setDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + days);
      return next;
    });

  const importCalendar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imported = parseImportedCalendar(file.name, await file.text());
      imported.forEach((item) => {
        addCalendarEvent({
          title: item.title,
          type: 'personal',
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          description: item.description,
          location: item.location,
          color: item.color || '#2563eb',
        });
      });
      setDate(new Date(`${imported[0].date}T12:00:00`));
      addToast(`Đã nhập ${imported.length} mục vào lịch`, 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Không thể đọc file lịch.', 'error');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="mx-auto min-w-0 w-full max-w-2xl overflow-x-hidden">
      <PageHeader
        title="Lịch"
        action={
          <button
            type="button"
            onClick={() => openTaskModal()}
            className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-white"
            aria-label="Thêm"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".ics,text/calendar,.json,application/json"
        onChange={importCalendar}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700 active:scale-[0.99]"
      >
        <Upload className="h-4 w-4" />
        Nhập lịch từ file
        <span className="font-medium text-blue-400">.ics / .json</span>
      </button>

      <div className="mb-5 flex min-w-0 items-center justify-between rounded-2xl bg-white p-2 ring-1 ring-slate-200">
        <button type="button" onClick={() => move(-1)} className="p-2 text-slate-400" aria-label="Ngày trước">
          <ChevronLeft />
        </button>
        <button type="button" onClick={() => setDate(new Date())} className="min-w-0 text-center">
          <p className="truncate text-sm font-bold capitalize">{dateLabel(date)}</p>
          {key !== iso(new Date()) && <span className="text-[11px] font-semibold text-blue-600">Về hôm nay</span>}
        </button>
        <button type="button" onClick={() => move(1)} className="p-2 text-slate-400" aria-label="Ngày sau">
          <ChevronRight />
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Ngày này đang trống"
          action={
            <button
              type="button"
              onClick={() => openTaskModal()}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Thêm việc
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex min-h-[70px] min-w-0 items-center gap-4 rounded-2xl bg-white px-4 ring-1 ring-slate-200"
            >
              <div className="w-11 shrink-0 text-sm font-bold text-slate-700">{item.time}</div>
              <span className="h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{item.title}</p>
                {item.end && <p className="mt-1 text-xs text-slate-400">đến {item.end}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
