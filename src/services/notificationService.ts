import { Task } from '../types';
import {
  buildTaskReminderSchedule,
  getNotificationPreferences,
  NotificationPreferences,
} from './notificationPolicy';
import { NotificationState, notificationErrorMessage, resolveNotificationState, shouldRenewPushSubscription } from './notificationStatus';

const DEVICE_ID_KEY = 'lich_song_push_device_id';

function getDeviceId(): string {
  const saved = localStorage.getItem(DEVICE_ID_KEY);
  if (saved) return saved;
  const id = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

function urlBase64ToUint8Array(value: string): Uint8Array {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

export function isInstalledPwa(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function supportsPushNotifications(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

type NotificationServerConfig = {
  publicKey: string;
  schedulerReady: boolean;
  schedulerError?: string | null;
};

async function getNotificationServerConfig(): Promise<NotificationServerConfig | null> {
  try {
    const response = await fetch('/api/notifications/public-key', { cache: 'no-store' });
    if (!response.ok) return null;
    const payload = await response.json();
    if (!payload?.publicKey) return null;
    return {
      publicKey: String(payload.publicKey),
      schedulerReady: payload.schedulerReady !== false,
      schedulerError: payload.schedulerError || null,
    };
  } catch {
    return null;
  }
}

function applicationServerKeyMatches(subscription: PushSubscription, publicKey: string): boolean {
  const currentKey = subscription.options?.applicationServerKey;
  if (!currentKey) return true;
  const actual = new Uint8Array(currentKey);
  const expected = urlBase64ToUint8Array(publicKey);
  if (actual.length !== expected.length) return false;
  return actual.every((value, index) => value === expected[index]);
}

async function persistSubscription(subscription: PushSubscription): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getDeviceId(), subscription }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureCurrentSubscription(
  registration: ServiceWorkerRegistration,
  publicKey: string,
): Promise<PushSubscription> {
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !applicationServerKeyMatches(subscription, publicKey)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }
  return subscription;
}

async function serverIsReady(): Promise<boolean> {
  const config = await getNotificationServerConfig();
  return Boolean(config?.schedulerReady);
}

export async function getNotificationSchedulerReady(): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/public-key');
    if (!response.ok) return false;
    return (await response.json()).schedulerReady === true;
  } catch { return false; }
}

export async function getNotificationState(): Promise<NotificationState> {
  if (!supportsPushNotifications()) return 'unsupported';
  if (!isInstalledPwa() && /iPhone|iPad|iPod/i.test(navigator.userAgent)) return 'needs_install';
  if (Notification.permission !== 'granted') return Notification.permission;

  const config = await getNotificationServerConfig();
  if (!config?.schedulerReady) return 'server_unavailable';

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return 'needs_registration';

  try {
    const subscription = await ensureCurrentSubscription(registration, config.publicKey);
    const persisted = await persistSubscription(subscription);
    return resolveNotificationState(Notification.permission, persisted, true);
  } catch {
    return 'needs_registration';
  }
}

async function registerPushNotifications(dispatchEnabledEvent: boolean): Promise<void> {
  if (!supportsPushNotifications()) throw new Error('Thiết bị này không hỗ trợ thông báo web.');
  if (!isInstalledPwa() && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    throw new Error('Hãy thêm Lịch Sống vào Màn hình chính trước.');
  }
  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Bạn chưa cho phép gửi thông báo.');

  await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
  const registration = await navigator.serviceWorker.ready;

  const response = await fetch('/api/notifications/public-key', { cache: 'no-store' });
  if (!response.ok) throw new Error(await notificationErrorMessage(response));
  const config = await response.json() as NotificationServerConfig;
  if (!config.publicKey) throw new Error('Server chưa cung cấp khóa thông báo.');
  if (config.schedulerReady === false) {
    throw new Error(config.schedulerError || 'Lịch nhắc tự động chưa sẵn sàng.');
  }

  const subscription = await ensureCurrentSubscription(registration, config.publicKey);
  const registerResponse = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: getDeviceId(), subscription }),
  });
  if (!registerResponse.ok) throw new Error(await notificationErrorMessage(registerResponse));
  if (dispatchEnabledEvent) window.dispatchEvent(new Event('lich-song-notifications-enabled'));
}

export async function enablePushNotifications(): Promise<void> {
  await registerPushNotifications(true);
}

export async function disablePushNotifications(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  await subscription?.unsubscribe();
  await fetch('/api/notifications/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: getDeviceId() }),
  });
}

type ScheduledNotificationTask = {
  id: string;
  title: string;
  plannedDate: string;
  startTime: string;
  actualStartTime: string | null;
  status: string;
  policy: {
    leadMinutes: number[];
    chaseMinutes: null;
    level: 'Nhẹ';
    previousDayLeadMinutes: number | null;
    beforeStartMinutes: number | null;
    atStartEnabled: boolean;
  };
};

function buildScheduledTasks(
  tasks: Task[],
  preferences: NotificationPreferences,
): ScheduledNotificationTask[] {
  return tasks
    .filter((task) => task.plannedDate && task.status !== 'done')
    .map((task) => {
      const schedule = buildTaskReminderSchedule(task.plannedDate!, task.startTime, preferences);
      return {
        id: task.id,
        title: task.title,
        plannedDate: task.plannedDate!,
        startTime: schedule.startTime,
        actualStartTime: schedule.actualStartTime,
        status: task.status,
        policy: schedule.policy,
      };
    })
    .filter((task) => task.policy.leadMinutes.length > 0);
}

async function postNotificationSchedule(
  tasks: ScheduledNotificationTask[],
  retryRegistration = true,
): Promise<void> {
  const response = await fetch('/api/notifications/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: getDeviceId(), tasks }),
  });
  if (response.ok) return;

  const copy = response.clone();
  let serverError = '';
  try { serverError = (await copy.json())?.error || ''; } catch { /* response is not JSON */ }

  if (retryRegistration && response.status === 400 && serverError === 'Device is not subscribed') {
    await registerPushNotifications(false);
    return postNotificationSchedule(tasks, false);
  }

  throw new Error(await notificationErrorMessage(response));
}

export async function syncNotificationTasks(
  tasks: Task[],
  preferences: NotificationPreferences = getNotificationPreferences(),
): Promise<void> {
  if (!supportsPushNotifications() || Notification.permission !== 'granted') return;
  await postNotificationSchedule(buildScheduledTasks(tasks, preferences));
}

export async function sendTestNotification(): Promise<void> {
  const currentSubscription = async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.pushManager.getSubscription();
  };
  let subscription = await currentSubscription();
  if (!subscription) throw new Error('iPhone chưa đăng ký nhận thông báo. Hãy bật lại.');
  const request = () => fetch('/api/notifications/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription }),
  });
  let response = await request();
  if (!response.ok) {
    const copy = response.clone();
    let serverError = '';
    try { serverError = (await copy.json())?.error || ''; } catch { /* response is not JSON */ }
    if (shouldRenewPushSubscription(response.status, serverError)) {
      await disablePushNotifications();
      await enablePushNotifications();
      subscription = await currentSubscription();
      if (!subscription) throw new Error('Không thể đăng ký lại thông báo trên iPhone.');
      response = await request();
    }
  }
  if (!response.ok) throw new Error(await notificationErrorMessage(response));
}

export type ReminderScheduleTestKind = 'previous-day' | 'before-start';

export interface ReminderScheduleTestResult {
  ok: true;
  kind: ReminderScheduleTestKind;
  firesAt: string;
  waitSeconds: number;
}

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const MINUTE_MS = 60_000;

function toVietnamScheduleParts(timestamp: number): { plannedDate: string; startTime: string } {
  const shifted = new Date(timestamp + VIETNAM_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  const hour = String(shifted.getUTCHours()).padStart(2, '0');
  const minute = String(shifted.getUTCMinutes()).padStart(2, '0');
  return { plannedDate: `${year}-${month}-${day}`, startTime: `${hour}:${minute}` };
}

export function buildReminderScheduleTestTask(
  kind: ReminderScheduleTestKind,
  now = Date.now(),
): ScheduledNotificationTask & { firesAt: string; waitSeconds: number } {
  const firesAtMs = Math.ceil((now + MINUTE_MS) / MINUTE_MS) * MINUTE_MS;
  const leadMinutes = kind === 'previous-day' ? 1440 : 60;
  const startMs = firesAtMs + leadMinutes * MINUTE_MS;
  const { plannedDate, startTime } = toVietnamScheduleParts(startMs);

  return {
    id: `__reminder-test:${kind}:${firesAtMs}`,
    title: kind === 'previous-day' ? 'TEST · Nhắc hôm trước' : 'TEST · Nhắc trước 1 giờ',
    plannedDate,
    startTime,
    actualStartTime: startTime,
    status: 'todo',
    policy: {
      leadMinutes: [leadMinutes],
      chaseMinutes: null,
      level: 'Nhẹ',
      previousDayLeadMinutes: kind === 'previous-day' ? 1440 : null,
      beforeStartMinutes: kind === 'before-start' ? 60 : null,
      atStartEnabled: false,
    },
    firesAt: new Date(firesAtMs).toISOString(),
    waitSeconds: Math.max(1, Math.ceil((firesAtMs - now) / 1000)),
  };
}

export async function scheduleReminderTest(
  kind: ReminderScheduleTestKind,
  tasks: Task[],
  preferences: NotificationPreferences = getNotificationPreferences(),
): Promise<ReminderScheduleTestResult> {
  if (!supportsPushNotifications()) throw new Error('Thiết bị này không hỗ trợ thông báo web.');

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (Notification.permission !== 'granted' || !subscription) {
    await registerPushNotifications(false);
  }

  if (!await getNotificationSchedulerReady()) {
    throw new Error('Lịch nhắc tự động chưa kết nối với server.');
  }

  const plan = buildReminderScheduleTestTask(kind);
  const { firesAt, waitSeconds, ...testTask } = plan;
  await postNotificationSchedule([
    ...buildScheduledTasks(tasks, preferences),
    testTask,
  ]);

  return { ok: true, kind, firesAt, waitSeconds };
}
