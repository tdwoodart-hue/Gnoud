import webpush, { PushSubscription } from 'web-push';
import { adminDb } from './firebaseAdmin.ts';
import { ScheduledTask } from './notificationCore.ts';

export interface DeviceDocument {
  subscription: PushSubscription;
  tasks: ScheduledTask[];
  sent: string[];
  updatedAt?: string;
}

export function configureWebPush(): void {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error('VAPID is not configured');
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', publicKey, privateKey);
}

export const deviceRef = (deviceId: string) => adminDb().collection('pushDevices').doc(deviceId);

export async function getDevice(deviceId: string): Promise<DeviceDocument | null> {
  const snapshot = await deviceRef(deviceId).get();
  return snapshot.exists ? snapshot.data() as DeviceDocument : null;
}
