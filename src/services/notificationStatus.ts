export type NotificationState = NotificationPermission | 'unsupported' | 'needs_install' | 'needs_registration' | 'server_unavailable' | 'active';

export function resolveNotificationState(
  permission: NotificationPermission,
  hasSubscription: boolean,
  serverReady: boolean,
): NotificationState {
  if (permission !== 'granted') return permission;
  if (!serverReady) return 'server_unavailable';
  return hasSubscription ? 'active' : 'needs_registration';
}

export async function notificationErrorMessage(response: Response): Promise<string> {
  let error = '';
  try { error = (await response.json())?.error || ''; } catch { /* response is not JSON */ }
  if (error === 'VAPID is not configured') return 'Server chưa cấu hình khóa VAPID.';
  if (error === 'Firebase Admin is not configured') return 'Server chưa kết nối Firestore Admin.';
  if (error === 'Device is not subscribed' || error === 'Notifications are not ready') return 'iPhone chưa đăng ký nhận thông báo. Hãy bật lại.';
  if (error === 'Push delivery failed') return 'Apple không nhận được thông báo. Hãy bật lại thông báo.';
  if (error === 'Subscription expired') return 'Đăng ký thông báo đã cũ. Ứng dụng đang kết nối lại.';
  return error || 'Không thể gửi thông báo lúc này.';
}

export function shouldRenewPushSubscription(status: number, error: string): boolean {
  return [401, 403, 404, 410].includes(status) || /expired|unauthorizedregistration|vapid/i.test(error);
}
