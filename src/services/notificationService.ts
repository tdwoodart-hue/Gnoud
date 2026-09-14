import { Task } from '../types';
import { getReminderPolicy } from './notificationPolicy';
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

async function serverIsReady(): Promise<boolean> {
  try { return (await fetch('/api/notifications/public-key')).ok; } catch { return false; }
}

export async function getNotificationState(): Promise<NotificationState> {
  if (!supportsPushNotifications()) return 'unsupported';
  if (!isInstalledPwa() && /iPhone|iPad|iPod/i.test(navigator.userAgent)) return 'needs_install';
  if (Notification.permission !== 'granted') return Notification.permission;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return resolveNotificationState(Notification.permission, Boolean(subscription), await serverIsReady());
}

export async function enablePushNotifications(): Promise<void> {
  if (!supportsPushNotifications()) throw new Error('Thiết bị này không hỗ trợ thông báo web.');
  if (!isInstalledPwa() && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    throw new Error('Hãy thêm Lịch Sống vào Màn hình chính trước.');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Bạn chưa cho phép gửi thông báo.');

  const registration = await navigator.serviceWorker.register('/sw.js');
  const response = await fetch('/api/notifications/public-key');
  if (!response.ok) throw new Error(await notificationErrorMessage(response));
  const { publicKey } = await response.json();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });
  const registerResponse = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: getDeviceId(), subscription }),
  });
  if (!registerResponse.ok) throw new Error(await notificationErrorMessage(registerResponse));
  window.dispatchEvent(new Event('lich-song-notifications-enabled'));
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

export async function syncNotificationTasks(tasks: Task[]): Promise<void> {
  if (!supportsPushNotifications() || Notification.permission !== 'granted') return;
  const scheduledTasks = tasks
    .filter((task) => task.plannedDate && task.startTime && task.status !== 'done')
    .map((task) => ({
      id: task.id,
      title: task.title,
      plannedDate: task.plannedDate,
      startTime: task.startTime,
      status: task.status,
      policy: getReminderPolicy(task.priority, Boolean(task.isTopPriority)),
    }));
  await fetch('/api/notifications/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: getDeviceId(), tasks: scheduledTasks }),
  });
}

export async function sendTestNotification(): Promise<void> {
  const request = () => fetch('/api/notifications/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: getDeviceId() }),
  });
  let response = await request();
  if (!response.ok) {
    const copy = response.clone();
    let serverError = '';
    try { serverError = (await copy.json())?.error || ''; } catch { /* response is not JSON */ }
    if (shouldRenewPushSubscription(response.status, serverError)) {
      await disablePushNotifications();
      await enablePushNotifications();
      response = await request();
    }
  }
  if (!response.ok) throw new Error(await notificationErrorMessage(response));
}
