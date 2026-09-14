import type { VercelRequest, VercelResponse } from '../_lib/http';
import { requireMethod } from '../_lib/http';
import { publicKeyResult } from '../_lib/notificationConfig';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, 'GET')) return;
  const result = publicKeyResult(process.env);
  return res.status(result.status).json(result.body);
}
