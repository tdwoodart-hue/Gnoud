import type { VercelRequest, VercelResponse } from '../_lib/http';
import { requireMethod, serverError } from '../_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, 'POST')) return;
  try {
    const [{ default: webpush }, { configureWebPush, getDevice }] = await Promise.all([import('web-push'), import('../_lib/pushStore')]);
    configureWebPush();
    const device = await getDevice(req.body?.deviceId || '');
    if (!device) return res.status(400).json({ error: 'Device is not subscribed' });
    await webpush.sendNotification(device.subscription, JSON.stringify({ title: 'Thông báo đã hoạt động', body: 'Lịch Sống đã kết nối với iPhone.', tag: 'lich-song-test', url: '/' }));
    return res.json({ ok: true });
  } catch (error: any) {
    if (error?.statusCode === 404 || error?.statusCode === 410) return res.status(410).json({ error: 'Subscription expired' });
    return serverError(res, error);
  }
}
