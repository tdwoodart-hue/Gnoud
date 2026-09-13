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
  if (error === 'Device is not subscribed' || error === 'Notifications are not ready') return 'iPhone chưa đăng ký nhận thông báo. Hãy bật lại.';
  if (error === 'Push delivery failed') return 'Apple không nhận được thông báo. Hãy bật lại thông báo.';
  return 'Không thể gửi thông báo lúc này.';
}
