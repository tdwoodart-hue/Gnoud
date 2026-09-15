import { Router } from 'express';
import webpush, { PushSubscription } from 'web-push';
import { applicationDefault, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

interface ScheduledTask {
  id: string;
  title: string;
  plannedDate: string;
  startTime: string;
  actualStartTime?: string | null;
  status: string;
  policy: {
    leadMinutes: number[];
    chaseMinutes: number | null;
    level: 'Nhẹ' | 'Vừa' | 'Mạnh';
    previousDayLeadMinutes?: number | null;
    beforeStartMinutes?: number | null;
    atStartEnabled?: boolean;
  };
}

interface DeviceSchedule {
  subscription: PushSubscription;
  tasks: ScheduledTask[];
  sent: Set<string>;
}

const devices = new Map<string, DeviceSchedule>();
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (PUBLIC_KEY && PRIVATE_KEY) webpush.setVapidDetails(VAPID_SUBJECT, PUBLIC_KEY, PRIVATE_KEY);

const adminApp = getApps().length ? getApp() : initializeApp({ credential: applicationDefault() });
const adminDb = getFirestore(adminApp, process.env.FIRESTORE_DATABASE_ID || '(default)');

async function persistDevice(deviceId: string, device: DeviceSchedule): Promise<void> {
  try {
    await adminDb.collection('pushDevices').doc(deviceId).set({
      subscription: device.subscription,
      tasks: device.tasks,
      sent: [...device.sent].slice(-500),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.warn('Push schedule is using memory fallback:', error);
  }
}

async function loadPersistedDevices(): Promise<void> {
  try {
    const snapshot = await adminDb.collection('pushDevices').get();
    snapshot.docs.forEach((item) => {
      const data = item.data();
      if (data.subscription?.endpoint) {
        devices.set(item.id, {
          subscription: data.subscription,
          tasks: Array.isArray(data.tasks) ? data.tasks : [],
          sent: new Set(Array.isArray(data.sent) ? data.sent : []),
        });
      }
    });
  } catch (error) {
    console.warn('Could not restore push schedules; using memory fallback:', error);
  }
}

function dueAt(task: ScheduledTask): number {
  return new Date(`${task.plannedDate}T${task.startTime}:00+07:00`).getTime();
}

function beforeTitle(minutes: number): string {
  if (minutes === 60) return 'Còn 1 giờ';
  if (minutes === 120) return 'Còn 2 giờ';
  return `Còn ${minutes} phút`;
}

function notificationFor(task: ScheduledTask, now: number): { key: string; title: string; body: string } | null {
  if (!task.policy || !Object.prototype.hasOwnProperty.call(task.policy, 'previousDayLeadMinutes')) return null;
  const start = dueAt(task);
  const minute = 60_000;
  for (const lead of task.policy.leadMinutes) {
    const target = start - lead * minute;
    if (now < target || now >= target + 90_000) continue;

    if (lead === task.policy.previousDayLeadMinutes) {
      return {
        key: `${task.id}:previous-day:${lead}`,
        title: task.actualStartTime ? `Ngày mai · ${task.actualStartTime}` : 'Ngày mai',
        body: task.title,
      };
    }
    if (lead === task.policy.beforeStartMinutes) {
      return { key: `${task.id}:before:${lead}`, title: beforeTitle(lead), body: task.title };
    }
    if (lead === 0 && task.policy.atStartEnabled) {
      return { key: `${task.id}:start`, title: 'Đến giờ bắt đầu', body: task.title };
    }
  }
  return null;
}

async function tick(): Promise<void> {
  if (!PUBLIC_KEY || !PRIVATE_KEY) return;
  if (devices.size === 0) await loadPersistedDevices();
  const now = Date.now();
  for (const [deviceId, device] of devices) {
    for (const task of device.tasks) {
      if (task.status === 'done') continue;
      const message = notificationFor(task, now);
      if (!message || device.sent.has(message.key)) continue;
      try {
        await webpush.sendNotification(device.subscription, JSON.stringify({
          title: message.title,
          body: message.body,
          tag: message.key,
          url: `/?task=${encodeURIComponent(task.id)}`,
        }));
        device.sent.add(message.key);
        void persistDevice(deviceId, device);
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) devices.delete(deviceId);
        else console.warn('Push delivery failed:', error);
      }
    }
  }
}

export function startNotificationScheduler(): NodeJS.Timeout {
  void loadPersistedDevices().then(tick);
  return setInterval(() => void tick(), 60_000);
}

export function createNotificationRouter(): Router {
  const router = Router();
  router.get('/public-key', (_req, res) => {
    if (!PUBLIC_KEY) return res.status(503).json({ error: 'VAPID is not configured' });
    return res.json({ publicKey: PUBLIC_KEY });
  });
  router.post('/subscribe', async (req, res) => {
    const { deviceId, subscription } = req.body || {};
    if (!deviceId || !subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
    const previous = devices.get(deviceId);
    devices.set(deviceId, { subscription, tasks: previous?.tasks || [], sent: previous?.sent || new Set() });
    await persistDevice(deviceId, devices.get(deviceId)!);
    return res.json({ ok: true });
  });
  router.post('/sync', async (req, res) => {
    const { deviceId, tasks } = req.body || {};
    const device = devices.get(deviceId);
    if (!device || !Array.isArray(tasks)) return res.status(400).json({ error: 'Device is not subscribed' });
    device.tasks = tasks.slice(0, 250);
    await persistDevice(deviceId, device);
    return res.json({ ok: true, count: device.tasks.length });
  });
  router.post('/unsubscribe', async (req, res) => {
    const deviceId = req.body?.deviceId;
    devices.delete(deviceId);
    try { await adminDb.collection('pushDevices').doc(deviceId).delete(); } catch (error) { console.warn('Could not delete push device:', error); }
    return res.json({ ok: true });
  });
  router.post('/test', async (req, res) => {
    const device = devices.get(req.body?.deviceId);
    if (!PUBLIC_KEY || !PRIVATE_KEY) return res.status(503).json({ error: 'VAPID is not configured' });
    if (!device) return res.status(400).json({ error: 'Device is not subscribed' });
    try {
      await webpush.sendNotification(device.subscription, JSON.stringify({
        title: 'Thông báo đã hoạt động',
        body: 'Lịch Sống sẽ nhắc theo các mốc bạn chọn trong Cài đặt.',
        tag: 'lich-song-test',
        url: '/',
      }));
      return res.json({ ok: true });
    } catch (error) {
      console.warn('Test push failed:', error);
      return res.status(502).json({ error: 'Push delivery failed' });
    }
  });
  return router;
}
