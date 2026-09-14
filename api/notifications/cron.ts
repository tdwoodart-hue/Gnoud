import type { VercelRequest, VercelResponse } from '../_lib/http';
import { requireMethod, serverError } from '../_lib/http';
import { notificationForTask } from '../_lib/notificationCore';
import type { DeviceDocument } from '../_lib/pushStore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, 'GET')) return;
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const [{ default: webpush }, { adminDb }, { configureWebPush }] = await Promise.all([import('web-push'), import('../_lib/firebaseAdmin'), import('../_lib/pushStore')]);
    configureWebPush();
    const snapshot = await adminDb().collection('pushDevices').limit(500).get();
    const now = Date.now();
    let delivered = 0;
    let expired = 0;
    for (const document of snapshot.docs) {
      const device = document.data() as DeviceDocument;
      if (!device.subscription?.endpoint) continue;
      const sent = new Set(Array.isArray(device.sent) ? device.sent : []);
      let changed = false;
      for (const task of Array.isArray(device.tasks) ? device.tasks : []) {
        const message = notificationForTask(task, now, sent);
        if (!message || sent.has(message.key)) continue;
        try {
          await webpush.sendNotification(device.subscription, JSON.stringify({ ...message, tag: message.key, url: `/?task=${encodeURIComponent(task.id)}` }));
          sent.add(message.key);
          delivered += 1;
          changed = true;
        } catch (error: any) {
          if (error?.statusCode === 404 || error?.statusCode === 410) {
            await document.ref.delete();
            expired += 1;
            changed = false;
            break;
          }
          console.warn('Push delivery failed:', error);
        }
      }
      if (changed) await document.ref.set({ sent: [...sent].slice(-500), updatedAt: new Date().toISOString() }, { merge: true });
    }
    return res.json({ ok: true, devices: snapshot.size, delivered, expired });
  } catch (error) { return serverError(res, error); }
}
