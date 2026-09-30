import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canRecoverPinWithAccount,
  DEFAULT_SECURITY_SETTINGS,
  type SecuritySettings,
} from '../src/services/securityService';

function settings(ownerUid: string | null): SecuritySettings {
  return {
    ...DEFAULT_SECURITY_SETTINGS,
    pinEnabled: true,
    pinHash: 'hash',
    pinOwnerUid: ownerUid,
    pinOwnerEmail: ownerUid ? 'owner@example.com' : null,
  };
}

test('PIN recovery only accepts the account that owns the PIN', () => {
  assert.equal(canRecoverPinWithAccount(settings('owner-uid'), 'owner-uid'), true);
  assert.equal(canRecoverPinWithAccount(settings('owner-uid'), 'other-uid'), false);
});

test('legacy PIN without owner still requires an authenticated account', () => {
  assert.equal(canRecoverPinWithAccount(settings(null), 'signed-in-user'), true);
  assert.equal(canRecoverPinWithAccount(settings(null), null), false);
});
