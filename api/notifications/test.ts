import { configureWebPush, getDevice, requireMethod, sendNotification, serverError } from '../_lib/runtime.js';

export default async function handler(req: any, res: any) {
  if (!requireMethod(req, res, 'POST')) return;
  try {
    configureWebPush();
    const device = await getDevice(req.body?.deviceId || '');
    if (!device) return res.status(400).json({ error: 'Device is not subscribed' });
    await sendNotification(device.subscription, { title: 'Thông báo đã hoạt động', body: 'Lịch Sống đã kết nối với iPhone.', tag: 'lich-song-test', url: '/' });
    return res.json({ ok: true });
  } catch (error: any) {
    if ([401, 403, 404, 410].includes(error?.statusCode)) return res.status(410).json({ error: 'Subscription expired' });
    return serverError(res, error);
  }
}
