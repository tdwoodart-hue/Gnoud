import type { VercelRequest, VercelResponse } from '../_lib/http.js';
import { requireMethod, serverError } from '../_lib/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, 'POST')) return;
  if (!req.body?.deviceId) return res.status(400).json({ error: 'Missing device id' });
  try { const { deviceRef } = await import('../_lib/pushStore.js'); await deviceRef(req.body.deviceId).delete(); return res.json({ ok: true }); }
  catch (error) { return serverError(res, error); }
}
