import test from 'node:test';
import assert from 'node:assert/strict';
import { publicKeyResult } from '../api/_lib/notificationConfig';

test('public key endpoint is ready without importing Firebase Admin', () => {
  assert.deepEqual(publicKeyResult({ VAPID_PUBLIC_KEY: 'public', VAPID_PRIVATE_KEY: 'private', FIREBASE_SERVICE_ACCOUNT_JSON: '{}' }), {
    status: 200,
    body: { publicKey: 'public' },
  });
});

test('public key endpoint reports missing VAPID configuration', () => {
  assert.equal(publicKeyResult({}).status, 503);
});
