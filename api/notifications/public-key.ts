export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return res.status(503).json({ error: 'VAPID is not configured' });
  }
  let schedulerReady = !process.env.VERCEL;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    try {
      let account = JSON.parse(raw);
      if (typeof account === 'string') account = JSON.parse(account);
      schedulerReady = Boolean(account?.project_id && account?.client_email && account?.private_key);
    } catch { schedulerReady = false; }
  }
  return res.status(200).json({
    publicKey: process.env.VAPID_PUBLIC_KEY,
    schedulerReady,
    schedulerError: schedulerReady ? null : 'FIREBASE_SERVICE_ACCOUNT_JSON không phải JSON service account hợp lệ',
  });
}
