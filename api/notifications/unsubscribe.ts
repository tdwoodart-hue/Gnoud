import { deviceRef, requireMethod, serverError } from '../_lib/runtime.js';

export default async function handler(req: any, res: any) {
  if (!requireMethod(req, res, 'POST')) return;
  if (!req.body?.deviceId) return res.status(400).json({ error: 'Missing device id' });
  try { await deviceRef(req.body.deviceId).delete(); return res.json({ ok: true }); }
  catch (error) { return serverError(res, error); }
}
