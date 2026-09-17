import test from 'node:test';
import assert from 'node:assert/strict';
import { authErrorMessage, shouldUseRedirect } from '../src/services/authFlow';

test('installed iPhone app uses popup instead of cross-domain redirect', () => {
  assert.equal(shouldUseRedirect('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)', true), false);
});

test('Android browser uses popup instead of cross-domain redirect', () => {
  assert.equal(shouldUseRedirect('Mozilla/5.0 (Linux; Android 15)', false), false);
});

test('desktop browser keeps popup flow', () => {
  assert.equal(shouldUseRedirect('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', false), false);
});

test('unauthorized domain error tells the user the real configuration problem', () => {
  assert.equal(authErrorMessage({ code: 'auth/unauthorized-domain' }), 'Tên miền hiện tại chưa được cho phép trong Firebase.');
});
