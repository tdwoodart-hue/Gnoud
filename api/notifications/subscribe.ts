import { deviceRef, requireMethod, serverError } from '../_lib/runtime.js';

export default async function handler(req: any, res: any) {
  if (!requireMethod(req, res, 'POST')) return;
  const { deviceId, subscription } = req.body || {};
  if (!deviceId || !subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
  try {
    await deviceRef(deviceId).set({ subscription, sent: [], updatedAt: new Date().toISOString() }, { merge: true });
    return res.json({ ok: true });
  } catch (error) { return serverError(res, error); }
}
