import type { VercelRequest, VercelResponse } from '../_lib/http';
import { requireMethod, serverError } from '../_lib/http';
import { deviceRef } from '../_lib/pushStore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, 'POST')) return;
  if (!req.body?.deviceId) return res.status(400).json({ error: 'Missing device id' });
  try { await deviceRef(req.body.deviceId).delete(); return res.json({ ok: true }); }
  catch (error) { return serverError(res, error); }
}
