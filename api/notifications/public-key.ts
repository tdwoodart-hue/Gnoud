import type { VercelRequest, VercelResponse } from '../_lib/http';
import { firebaseAdminConfigured } from '../_lib/firebaseAdmin';
import { requireMethod } from '../_lib/http';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, 'GET')) return;
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return res.status(503).json({ error: 'VAPID is not configured' });
  if (!firebaseAdminConfigured()) return res.status(503).json({ error: 'Firebase Admin is not configured' });
  return res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
}
