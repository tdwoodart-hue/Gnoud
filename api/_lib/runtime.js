import webpush from 'web-push';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let database = null;

function adminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return initializeApp({ credential: applicationDefault() });
  const serviceAccount = JSON.parse(raw);
  if (serviceAccount.private_key) serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  return initializeApp({ credential: cert(serviceAccount) });
}

export function adminDb() {
  if (!database) database = getFirestore(adminApp(), process.env.FIRESTORE_DATABASE_ID || '(default)');
  return database;
}

export function requireMethod(req, res, method) {
  if (req.method === method) return true;
  res.setHeader('Allow', method).status(405).json({ error: 'Method not allowed' });
  return false;
}

export function serverError(res, error) {
  console.error('Notification API error:', error);
  res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
}

export function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error('VAPID is not configured');
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', publicKey, privateKey);
}

export const deviceRef = (deviceId) => adminDb().collection('pushDevices').doc(deviceId);

export async function getDevice(deviceId) {
  const snapshot = await deviceRef(deviceId).get();
  return snapshot.exists ? snapshot.data() : null;
}

export function sendNotification(subscription, payload) {
  return webpush.sendNotification(subscription, JSON.stringify(payload));
}

function dueAt(task) {
  return new Date(`${task.plannedDate}T${task.startTime}:00+07:00`).getTime();
}

function beforeTitle(minutes) {
  if (minutes === 60) return 'Còn 1 giờ';
  if (minutes === 120) return 'Còn 2 giờ';
  return `Còn ${minutes} phút`;
}

export function notificationForTask(task, now, sent = new Set()) {
  if (task.status === 'done') return null;
  if (!task.policy || !Object.prototype.hasOwnProperty.call(task.policy, 'previousDayLeadMinutes')) return null;
  const start = dueAt(task);
  const minute = 60_000;
  for (const lead of task.policy.leadMinutes) {
    const target = start - lead * minute;
    if (now < target || now >= target + 5 * minute) continue;

    let key;
    let title;
    if (lead === task.policy.previousDayLeadMinutes) {
      key = `${task.id}:previous-day:${lead}`;
      title = task.actualStartTime ? `Ngày mai · ${task.actualStartTime}` : 'Ngày mai';
    } else if (lead === task.policy.beforeStartMinutes) {
      key = `${task.id}:before:${lead}`;
      title = beforeTitle(lead);
    } else if (lead === 0 && task.policy.atStartEnabled) {
      key = `${task.id}:start`;
      title = 'Đến giờ bắt đầu';
    } else {
      continue;
    }
    if (!sent.has(key)) return { key, title, body: task.title };
  }
  return null;
}
