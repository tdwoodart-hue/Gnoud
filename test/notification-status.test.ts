import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveNotificationState, notificationErrorMessage } from '../src/services/notificationStatus';

test('permission alone is not reported as active without a subscription', () => {
  assert.equal(resolveNotificationState('granted', false, true), 'needs_registration');
});

test('server configuration failure is reported separately', () => {
  assert.equal(resolveNotificationState('granted', true, false), 'server_unavailable');
});

test('active requires permission, subscription and server readiness', () => {
  assert.equal(resolveNotificationState('granted', true, true), 'active');
});

test('server error text is preserved for an actionable toast', async () => {
  const response = new Response(JSON.stringify({ error: 'VAPID is not configured' }), {
    status: 503,
    headers: { 'content-type': 'application/json' },
  });
  assert.equal(await notificationErrorMessage(response), 'Server chưa cấu hình khóa VAPID.');
});

test('missing Firebase Admin credentials are explained', async () => {
  const response = new Response(JSON.stringify({ error: 'Firebase Admin is not configured' }), { status: 503 });
  assert.equal(await notificationErrorMessage(response), 'Server chưa kết nối Firestore Admin.');
});
