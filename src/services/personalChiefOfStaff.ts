export type AssistantDecisionMode = 'auto' | 'auto_notify' | 'approval_required' | 'blocked';
export type AssistantDecisionStatus = 'planned' | 'executed' | 'undone' | 'rejected' | 'expired';
export type AssistantRisk = 'low' | 'medium' | 'high';

export interface AssistantTaskInput {
  id: string;
  title: string;
  status: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  plannedDate?: string;
  startTime?: string;
  estimatedMinutes: number;
  deadline?: string;
  isTopPriority?: boolean;
}

export interface AssistantCalendarEventInput {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type?: string;
}

export interface AssistantHabitInput {
  id: string;
  name: string;
  preferredTime?: string;
  durationMinutes?: number;
  completedDates?: string[];
}

export interface MentorProfile {
  id: string;
  name: string;
  bedtime: string;
  wakeTime: string;
}

export interface DailyMentorDirective {
  date: string;
  bedtime?: string;
  confirmed?: boolean;
}

export interface MentorTimelineItem {
  id: string;
  time: string;
  title: string;
  detail?: string;
  kind: 'routine' | 'transition';
}

export interface MentorPrompt {
  id: string;
  text: string;
  suggestedBedtime: string;
}

export type MentorInstruction =
  | { kind: 'bedtime_override'; date: string; bedtime: string }
  | { kind: 'mentor_profile'; mentorName: string; bedtime?: string };

export interface RescheduleTaskAssistantAction {
  type: 'reschedule_task';
  taskId: string;
  from: { plannedDate?: string; startTime?: string };
  to: { plannedDate: string; startTime?: string };
}

export interface RequestTaskRescheduleAssistantAction {
  type: 'request_task_reschedule';
  taskId: string;
  from: { plannedDate?: string; startTime?: string };
  suggested: { plannedDate: string; startTime?: string };
}

export type AssistantAction = RescheduleTaskAssistantAction | RequestTaskRescheduleAssistantAction;

export interface AssistantDecisionRecord {
  id: string;
  createdAt: string;
  summary: string;
  reason: string;
  confidence: number;
  risk: AssistantRisk;
  mode: AssistantDecisionMode;
  action?: AssistantAction;
  status: AssistantDecisionStatus;
  executedAt?: string;
  undoneAt?: string;
}

export interface ChiefOfStaffTransition {
  time: string;
  label: string;
}

export interface ChiefOfStaffBrief {
  date: string;
  headline: string;
  now: {
    title: string;
    detail: string;
  };
  nextTransition?: ChiefOfStaffTransition;
  intervention?: string;
}

export interface ChiefOfStaffEvaluation {
  brief: ChiefOfStaffBrief;
  decisions: AssistantDecisionRecord[];
  mentorTimeline: MentorTimelineItem[];
  mentorPrompt: MentorPrompt | null;
}

export interface ChiefOfStaffInput {
  tasks: AssistantTaskInput[];
  calendarEvents: AssistantCalendarEventInput[];
  habits: AssistantHabitInput[];
  now: Date;
  mentorProfile?: MentorProfile;
  dailyDirective?: DailyMentorDirective | null;
}

const MINUTE = 60_000;

function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateText: string, days: number): string {
  const [year, month, day] = dateText.split('-').map(Number);
  const date = new Date(year, month - 1, day + days, 12, 0, 0, 0);
  return localDate(date);
}

function minutesOfDay(time?: string): number | null {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [hour, minute] = time.split(':').map(Number);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function formatTime(totalMinutes: number): string {
  const safe = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hour = Math.floor(safe / 60);
  const minute = safe % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function nowMinutes(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

function findHabitTime(habits: AssistantHabitInput[], pattern: RegExp): number | null {
  const habit = habits.find((item) => pattern.test(item.name.toLowerCase()) && item.preferredTime);
  return minutesOfDay(habit?.preferredTime);
}

function routineTimes(input: ChiefOfStaffInput, today: string, tomorrow: string) {
  const tomorrowStarts = [
    ...input.tasks
      .filter((task) => task.status !== 'done' && task.plannedDate === tomorrow)
      .map((task) => minutesOfDay(task.startTime)),
    ...input.calendarEvents
      .filter((event) => event.date === tomorrow)
      .map((event) => minutesOfDay(event.startTime)),
  ].filter((value): value is number => value !== null);

  const earliestTomorrow = tomorrowStarts.length ? Math.min(...tomorrowStarts) : null;
  const learnedSleep = findHabitTime(input.habits, /ngủ|sleep|bedtime/);
  const learnedHygiene = findHabitTime(input.habits, /vệ sinh|đánh răng|tắm|hygiene/);
  const directiveBedtime = input.dailyDirective?.date === today
    ? minutesOfDay(input.dailyDirective.bedtime)
    : null;
  const mentorBedtime = minutesOfDay(input.mentorProfile?.bedtime);
  const bedtime = directiveBedtime
    ?? learnedSleep
    ?? mentorBedtime
    ?? (earliestTomorrow !== null && earliestTomorrow <= 8 * 60 + 30 ? 23 * 60 : 23 * 60 + 30);
  const hygiene = learnedHygiene ?? bedtime - 25;
  const windDown = Math.min(hygiene - 20, bedtime - 45);
  return { bedtime, hygiene, windDown };
}


function parseBedtimeFromText(text: string): string | null {
  if (!/ngủ|bedtime|đi ngủ/i.test(text)) return null;
  const match = text.match(/(\d{1,2})(?::(\d{2}))?\s*(?:h|giờ)?\s*(sáng|trưa|chiều|tối)?/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const period = (match[3] || '').toLowerCase();
  if (minute > 59 || hour > 23) return null;
  if (period === 'trưa' && hour < 12) hour += 12;
  if ((period === 'chiều' || period === 'tối') && hour < 12) hour += 12;
  if (!period && hour >= 6 && hour <= 11) hour += 12;
  if (!period && hour === 12) hour = 0;
  return formatTime(hour * 60 + minute);
}

export function parseMentorInstruction(
  text: string,
  now: Date,
  currentBedtime?: string,
): MentorInstruction | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const bedtime = parseBedtimeFromText(trimmed);
  const mentorMatch = trimmed.match(/lấy\s+([^,]+?)\s+làm\s+(?:hình mẫu|mentor|người làm gương)/i);
  if (mentorMatch) {
    return {
      kind: 'mentor_profile',
      mentorName: mentorMatch[1].trim(),
      bedtime: bedtime || undefined,
    };
  }

  const isBedtimeFeedback = /quá sớm|hơi sớm|sớm quá|quá muộn|hơi muộn|muộn quá|muộn hơn|trễ hơn|sớm hơn|khó|không ổn|không được|không hợp|hơi gắt/i.test(trimmed);

  // Feedback/negotiation must go through the reasoning model. The local parser
  // is intentionally limited to explicit commands so it never pretends to
  // "think" about whether a proposed bedtime is actually sensible.
  if (/ngủ|bedtime|đi ngủ/i.test(trimmed) && isBedtimeFeedback) return null;

  // In an active mentor conversation, a clear "11h ngủ nhé" is already a
  // decision for the current day. Requiring the user to repeat "hôm nay"
  // makes natural follow-up messages fall through to the AI endpoint.
  if (bedtime) {
    return { kind: 'bedtime_override', date: localDate(now), bedtime };
  }
  return null;
}

function buildMentorTimeline(
  input: ChiefOfStaffInput,
  today: string,
  routine: ReturnType<typeof routineTimes>,
): MentorTimelineItem[] {
  const profile = input.mentorProfile;
  const detail = profile && profile.id !== 'disciplined'
    ? `Theo chuẩn mày đặt cho ${profile.name}`
    : undefined;
  const items: MentorTimelineItem[] = [];
  const current = nowMinutes(input.now);
  const workoutPattern = /gym|tập|thể dục|workout|full body|upper|lower|push|pull|cardio|leg day/i;
  const workoutStarts = [
    ...input.calendarEvents
      .filter((event) => event.date === today && workoutPattern.test(event.title))
      .map((event) => minutesOfDay(event.startTime)),
    ...input.tasks
      .filter((task) => task.status !== 'done' && task.plannedDate === today && workoutPattern.test(task.title))
      .map((task) => minutesOfDay(task.startTime)),
  ].filter((value): value is number => value !== null && value >= current)
    .sort((a, b) => a - b);
  if (workoutStarts[0] !== undefined) {
    const prep = Math.max(current, workoutStarts[0] - 20);
    items.push({
      id: `mentor:${today}:workout-prep:${formatTime(prep)}`,
      time: formatTime(prep),
      title: 'Chuẩn bị đi tập',
      kind: 'transition',
    });
  }
  items.push(
    {
      id: `mentor:${today}:wind-down`,
      time: formatTime(routine.windDown),
      title: 'Hạ nhịp và kết thúc việc',
      kind: 'routine',
    },
    {
      id: `mentor:${today}:hygiene`,
      time: formatTime(routine.hygiene),
      title: 'Vệ sinh cá nhân',
      kind: 'routine',
    },
    {
      id: `mentor:${today}:sleep`,
      time: formatTime(routine.bedtime),
      title: 'Đi ngủ',
      detail,
      kind: 'routine',
    },
  );
  return items.sort((a, b) => a.time.localeCompare(b.time));
}

function buildMentorPrompt(
  input: ChiefOfStaffInput,
  today: string,
  routine: ReturnType<typeof routineTimes>,
): MentorPrompt | null {
  if (input.dailyDirective?.date === today && input.dailyDirective.confirmed) return null;
  const hasExplicitSleepHabit = input.habits.some((habit) => /ngủ|sleep|bedtime/i.test(habit.name) && habit.preferredTime);
  if (hasExplicitSleepHabit) return null;
  const suggestedBedtime = formatTime(routine.bedtime);
  const profile = input.mentorProfile;
  const text = profile && profile.id !== 'disciplined'
    ? `Theo chuẩn mày đặt cho ${profile.name}: ${suggestedBedtime} ngủ. Chốt tối nay nhé?`
    : `${suggestedBedtime} ngủ nhé? Tao sẽ giữ cuối ngày theo giờ này.`;
  return { id: `mentor-prompt:${today}:bedtime`, text, suggestedBedtime };
}

function isProtectedTask(task: AssistantTaskInput, today: string): boolean {
  return Boolean(
    task.isTopPriority ||
      task.priority === 'urgent' ||
      task.priority === 'high' ||
      task.deadline === today,
  );
}

function policyForReschedule(confidence: number, protectedCommitment: boolean): AssistantDecisionMode {
  if (protectedCommitment) return 'approval_required';
  if (confidence >= 0.82) return 'auto_notify';
  return 'approval_required';
}

function roundUpToQuarter(minutes: number): number {
  return Math.ceil(minutes / 15) * 15;
}

function findFreeStartForDate(
  task: AssistantTaskInput,
  input: ChiefOfStaffInput,
  date: string,
  earliestMinute: number,
  latestMinute: number,
): string | null {
  const duration = Math.max(15, task.estimatedMinutes || 30);
  const occupied = [
    ...input.calendarEvents
      .filter((event) => event.date === date)
      .map((event) => [minutesOfDay(event.startTime), minutesOfDay(event.endTime)] as const),
    ...input.tasks
      .filter((item) => item.id !== task.id && item.status !== 'done' && item.plannedDate === date && item.startTime)
      .map((item) => {
        const start = minutesOfDay(item.startTime);
        return [start, start === null ? null : start + Math.max(15, item.estimatedMinutes || 30)] as const;
      }),
  ].filter((window): window is readonly [number, number] => window[0] !== null && window[1] !== null);

  let cursor = roundUpToQuarter(Math.max(8 * 60 + 30, earliestMinute));
  while (cursor + duration <= latestMinute) {
    const collision = occupied.some(([start, end]) => cursor < end + 15 && cursor + duration + 15 > start);
    if (!collision) return formatTime(cursor);
    cursor += 15;
  }
  return null;
}

function findTomorrowStart(
  task: AssistantTaskInput,
  index: number,
  input: ChiefOfStaffInput,
  tomorrow: string,
): string {
  const duration = Math.max(15, task.estimatedMinutes || 30);
  const occupied = [
    ...input.calendarEvents
      .filter((event) => event.date === tomorrow)
      .map((event) => [minutesOfDay(event.startTime), minutesOfDay(event.endTime)] as const),
    ...input.tasks
      .filter((item) => item.id !== task.id && item.status !== 'done' && item.plannedDate === tomorrow && item.startTime)
      .map((item) => {
        const start = minutesOfDay(item.startTime);
        return [start, start === null ? null : start + Math.max(15, item.estimatedMinutes || 30)] as const;
      }),
  ].filter((window): window is readonly [number, number] => window[0] !== null && window[1] !== null);

  let cursor = 9 * 60 + 30 + index * 15;
  const endLimit = 19 * 60;
  while (cursor + duration <= endLimit) {
    const collision = occupied.some(([start, end]) => cursor < end + 15 && cursor + duration + 15 > start);
    if (!collision) return formatTime(cursor);
    cursor += 30;
  }
  return '09:30';
}

function chooseNowTask(input: ChiefOfStaffInput, today: string): AssistantTaskInput | null {
  const current = nowMinutes(input.now);
  const candidates = input.tasks
    .filter((task) => task.status !== 'done' && (task.plannedDate === today || task.isTopPriority))
    .filter((task) => {
      const start = minutesOfDay(task.startTime);
      return start === null || start <= current + 10;
    })
    .slice()
    .sort((a, b) => {
      const rank = (task: AssistantTaskInput) =>
        task.priority === 'urgent' ? 0 : task.isTopPriority ? 1 : task.priority === 'high' ? 2 : task.priority === 'medium' ? 3 : 4;
      const rankDiff = rank(a) - rank(b);
      if (rankDiff) return rankDiff;
      return (minutesOfDay(a.startTime) ?? 9999) - (minutesOfDay(b.startTime) ?? 9999);
    });
  return candidates[0] || null;
}

function nextTransition(input: ChiefOfStaffInput, today: string, routine: ReturnType<typeof routineTimes>): ChiefOfStaffTransition | undefined {
  const current = nowMinutes(input.now);
  const workoutPattern = /gym|tập|thể dục|workout|full body|upper|lower|push|pull|cardio|leg day/i;
  const workoutStarts = [
    ...input.calendarEvents
      .filter((event) => event.date === today && workoutPattern.test(event.title))
      .map((event) => minutesOfDay(event.startTime)),
    ...input.tasks
      .filter((task) => task.status !== 'done' && task.plannedDate === today && workoutPattern.test(task.title))
      .map((task) => minutesOfDay(task.startTime)),
  ].filter((start): start is number => start !== null && start >= current)
    .sort((a, b) => a - b);
  const upcomingGymStart = workoutStarts[0];

  if (upcomingGymStart !== undefined && upcomingGymStart - current <= 120) {
    const prepare = Math.max(current, upcomingGymStart - 20);
    return { time: formatTime(prepare), label: 'Dừng việc và chuẩn bị đi tập' };
  }

  if (current < routine.windDown) {
    return { time: formatTime(routine.windDown), label: 'Kết thúc việc và hạ nhịp' };
  }
  if (current < routine.hygiene) {
    return { time: formatTime(routine.hygiene), label: 'Vệ sinh cá nhân và chuẩn bị ngủ' };
  }
  if (current < routine.bedtime) {
    return { time: formatTime(routine.bedtime), label: 'Lên giường và kết thúc ngày' };
  }
  return undefined;
}

export function evaluateChiefOfStaff(input: ChiefOfStaffInput): ChiefOfStaffEvaluation {
  const today = localDate(input.now);
  const tomorrow = addDays(today, 1);
  const routine = routineTimes(input, today, tomorrow);
  const current = nowMinutes(input.now);
  const decisions: AssistantDecisionRecord[] = [];

  if (current < routine.windDown) {
    const unscheduled = input.tasks
      .filter((task) => task.status !== 'done' && task.plannedDate === today && !task.startTime)
      .filter((task) => task.priority === 'low' || task.priority === 'medium')
      .slice()
      .sort((a, b) => {
        const rank = (task: AssistantTaskInput) => task.priority === 'medium' ? 0 : 1;
        return rank(a) - rank(b) || b.estimatedMinutes - a.estimatedMinutes;
      })
      .slice(0, 3);

    let earliest = current + 10;
    unscheduled.forEach((task) => {
      const startTime = findFreeStartForDate(task, input, today, earliest, routine.windDown);
      if (!startTime) return;
      const startMinute = minutesOfDay(startTime) ?? earliest;
      decisions.push({
        id: `chief:schedule:${task.id}:${today}:${startTime}`,
        createdAt: input.now.toISOString(),
        summary: `Tao xếp “${task.title}” vào ${startTime} hôm nay.`,
        reason: 'Việc chưa có giờ bắt đầu và có một khoảng trống phù hợp trong ngày.',
        confidence: 0.92,
        risk: 'low',
        mode: 'auto',
        action: {
          type: 'reschedule_task',
          taskId: task.id,
          from: { plannedDate: task.plannedDate, startTime: task.startTime },
          to: { plannedDate: today, startTime },
        },
        status: 'planned',
      });
      earliest = startMinute + Math.max(15, task.estimatedMinutes || 30) + 15;
    });
  }

  if (current >= routine.windDown) {
    const flexible = input.tasks
      .filter((task) => task.status !== 'done' && task.plannedDate === today)
      .filter((task) => !isProtectedTask(task, today))
      .filter((task) => task.priority === 'low' || task.priority === 'medium')
      .filter((task) => {
        const start = minutesOfDay(task.startTime);
        const remainingBeforeBed = Math.max(0, routine.bedtime - current);
        return start === null || start >= routine.windDown || task.estimatedMinutes > remainingBeforeBed - 10;
      })
      .slice(0, 2);

    flexible.forEach((task, index) => {
      const confidence = 0.9;
      const toStartTime = findTomorrowStart(task, index, input, tomorrow);
      decisions.push({
        id: `chief:defer:${task.id}:${today}:${tomorrow}`,
        createdAt: input.now.toISOString(),
        summary: `Tao dời “${task.title}” sang ${toStartTime} ngày mai để bảo vệ cuối ngày.`,
        reason: 'Việc linh hoạt không còn vừa với thời gian còn lại trước giờ ngủ.',
        confidence,
        risk: 'low',
        mode: policyForReschedule(confidence, false),
        action: {
          type: 'reschedule_task',
          taskId: task.id,
          from: { plannedDate: task.plannedDate, startTime: task.startTime },
          to: { plannedDate: tomorrow, startTime: toStartTime },
        },
        status: 'planned',
      });
    });

    const protectedLate = input.tasks
      .filter((task) => task.status !== 'done' && task.plannedDate === today)
      .filter((task) => isProtectedTask(task, today))
      .filter((task) => {
        const start = minutesOfDay(task.startTime);
        const remainingBeforeBed = Math.max(0, routine.bedtime - current);
        return start === null || start >= routine.windDown || task.estimatedMinutes > remainingBeforeBed;
      })
      .slice(0, 1);

    protectedLate.forEach((task) => {
      const suggestedStart = findTomorrowStart(task, 0, input, tomorrow);
      decisions.push({
        id: `chief:approval:${task.id}:${today}:${tomorrow}`,
        createdAt: input.now.toISOString(),
        summary: `“${task.title}” đang đè lên cuối ngày. Tao cần mày quyết định có dời việc này không.`,
        reason: 'Đây là việc được bảo vệ nên trợ lý không tự thay đổi.',
        confidence: 0.9,
        risk: 'high',
        mode: 'approval_required',
        action: {
          type: 'request_task_reschedule',
          taskId: task.id,
          from: { plannedDate: task.plannedDate, startTime: task.startTime },
          suggested: { plannedDate: tomorrow, startTime: suggestedStart },
        },
        status: 'planned',
      });
    });
  }

  const mentorTimeline = buildMentorTimeline(input, today, routine);
  const mentorPrompt = buildMentorPrompt(input, today, routine);
  const focus = chooseNowTask(input, today);
  const transition = nextTransition(input, today, routine);
  const isHygieneWindow = current >= routine.hygiene && current < routine.bedtime;
  const isWindDownWindow = current >= routine.windDown && current < routine.hygiene;
  const nowTitle = isHygieneWindow
    ? 'Vệ sinh cá nhân và chuẩn bị ngủ'
    : isWindDownWindow
      ? 'Khép lại công việc trong ngày'
      : focus?.title || 'Giữ nhịp ngày hôm nay';
  const nowDetail = isHygieneWindow
    ? `Mục tiêu lên giường lúc ${formatTime(routine.bedtime)}.`
    : isWindDownWindow
      ? `Không nhận thêm việc linh hoạt. Chuẩn bị vệ sinh lúc ${formatTime(routine.hygiene)}.`
      : focus
        ? `${focus.estimatedMinutes} phút · ${focus.priority === 'urgent' || focus.priority === 'high' ? 'ưu tiên cao' : 'đang phù hợp nhất để làm'}`
        : 'Không có việc bắt buộc ngay lúc này.';

  const scheduledCount = decisions.filter((decision) => decision.id.startsWith('chief:schedule:')).length;
  const deferredCount = decisions.filter((decision) => decision.id.startsWith('chief:defer:')).length;
  const approvalCount = decisions.filter((decision) => decision.mode === 'approval_required').length;
  const intervention = scheduledCount
    ? `Tao đã tìm được giờ phù hợp cho ${scheduledCount} việc chưa có lịch.`
    : deferredCount
      ? `Tao chuyển ${deferredCount} việc linh hoạt khỏi cuối ngày để giữ nhịp nghỉ.`
      : approvalCount
        ? 'Có một việc quan trọng cần mày quyết định trước khi tao thay đổi.'
        : undefined;

  return {
    brief: {
      date: today,
      headline: decisions.length ? 'Đang cân lại lịch.' : '',
      now: { title: nowTitle, detail: nowDetail },
      nextTransition: transition,
      intervention,
    },
    decisions,
    mentorTimeline,
    mentorPrompt,
  };
}

export function applyAssistantDecisionToTasks<T extends AssistantTaskInput>(
  tasks: T[],
  decision: AssistantDecisionRecord,
): T[] {
  const action = decision.action;
  if (!action) return tasks;
  if (action.type === 'reschedule_task') {
    return tasks.map((task) =>
      task.id === action.taskId
        ? ({ ...task, plannedDate: action.to.plannedDate, startTime: action.to.startTime } as T)
        : task,
    );
  }
  if (action.type === 'request_task_reschedule') {
    return tasks.map((task) =>
      task.id === action.taskId
        ? ({ ...task, plannedDate: action.suggested.plannedDate, startTime: action.suggested.startTime } as T)
        : task,
    );
  }
  return tasks;
}

export function undoAssistantDecisionInTasks<T extends AssistantTaskInput>(
  tasks: T[],
  decision: AssistantDecisionRecord,
): T[] {
  const action = decision.action;
  if (!action) return tasks;
  if (action.type === 'reschedule_task' || action.type === 'request_task_reschedule') {
    return tasks.map((task) =>
      task.id === action.taskId
        ? ({ ...task, plannedDate: action.from.plannedDate, startTime: action.from.startTime } as T)
        : task,
    );
  }
  return tasks;
}
