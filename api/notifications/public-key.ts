import type { VercelRequest, VercelResponse } from '../_lib/http.ts';
import { requireMethod } from '../_lib/http.ts';
import { publicKeyResult } from '../_lib/notificationConfig.ts';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, 'GET')) return;
  const result = publicKeyResult(process.env);
  return res.status(result.status).json(result.body);
}
