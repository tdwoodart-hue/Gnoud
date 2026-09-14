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

export function notificationForTask(task, now, sent = new Set()) {
  if (task.status === 'done') return null;
  const start = dueAt(task);
  const minute = 60_000;
  for (const lead of task.policy.leadMinutes) {
    const target = start - lead * minute;
    const key = lead === 0 ? `${task.id}:start` : `${task.id}:lead:${lead}`;
    if (now >= target && now < target + 5 * minute && !sent.has(key)) {
      return lead === 0
        ? { key, title: 'Đến giờ bắt đầu', body: task.title }
        : { key, title: `Còn ${lead} phút`, body: task.title };
    }
  }
  if (task.policy.chaseMinutes && now > start) {
    const chaseNumber = Math.floor((now - start) / (task.policy.chaseMinutes * minute));
    const key = `${task.id}:chase:${chaseNumber}`;
    if (chaseNumber >= 1 && !sent.has(key)) return {
      key,
      title: task.policy.level === 'Mạnh' ? 'Bắt đầu ngay' : 'Việc đang chờ bạn',
      body: `${task.title} vẫn chưa được hoàn thành.`,
    };
  }
  return null;
}
