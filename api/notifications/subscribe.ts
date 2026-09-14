import type { VercelRequest, VercelResponse } from '../_lib/http';
import { requireMethod, serverError } from '../_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, 'POST')) return;
  const { deviceId, subscription } = req.body || {};
  if (!deviceId || !subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
  try {
    const { deviceRef } = await import('../_lib/pushStore');
    await deviceRef(deviceId).set({ subscription, sent: [], updatedAt: new Date().toISOString() }, { merge: true });
    return res.json({ ok: true });
  } catch (error) { return serverError(res, error); }
}
