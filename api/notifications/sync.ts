import type { VercelRequest, VercelResponse } from '../_lib/http';
import { requireMethod, serverError } from '../_lib/http';
import { deviceRef, getDevice } from '../_lib/pushStore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, 'POST')) return;
  const { deviceId, tasks } = req.body || {};
  if (!deviceId || !Array.isArray(tasks)) return res.status(400).json({ error: 'Invalid schedule' });
  try {
    if (!await getDevice(deviceId)) return res.status(400).json({ error: 'Device is not subscribed' });
    await deviceRef(deviceId).set({ tasks: tasks.slice(0, 250), updatedAt: new Date().toISOString() }, { merge: true });
    return res.json({ ok: true, count: Math.min(tasks.length, 250) });
  } catch (error) { return serverError(res, error); }
}
