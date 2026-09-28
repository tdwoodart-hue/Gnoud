import test from 'node:test';
import assert from 'node:assert/strict';
import { PRIMARY_NAV_ITEMS } from '../src/config/navigation';

test('mobile navigation keeps six focused destinations', () => {
  assert.deepEqual(PRIMARY_NAV_ITEMS.map((item) => item.id), [
    'today', 'tasks', 'nutrition', 'personal', 'reader', 'reports',
  ]);
});

test('nutrition replaces calendar as a primary destination', () => {
  assert.equal(PRIMARY_NAV_ITEMS.find((item) => item.id === 'nutrition')?.label, 'Dinh dưỡng');
  assert.equal(PRIMARY_NAV_ITEMS.some((item) => (item.id as string) === 'calendar'), false);
});

test('personal areas are merged under one destination', () => {
  assert.equal(PRIMARY_NAV_ITEMS.find((item) => item.id === 'personal')?.label, 'Cá nhân');
  assert.equal(PRIMARY_NAV_ITEMS.some((item) => ['goals', 'habits', 'life'].includes(item.id)), false);
});

test('reader is a compact primary destination', () => {
  assert.equal(PRIMARY_NAV_ITEMS.find((item) => item.id === 'reader')?.label, 'Sách');
});
