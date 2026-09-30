import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PRIMARY_NAV_ITEMS } from '../src/config/navigation';

test('primary navigation keeps only current destinations', () => {
  assert.deepEqual(PRIMARY_NAV_ITEMS.map((item) => item.id), [
    'today', 'tasks', 'nutrition', 'reader', 'reports',
  ]);
});

test('nutrition replaces calendar as a primary destination', () => {
  assert.equal(PRIMARY_NAV_ITEMS.find((item) => item.id === 'nutrition')?.label, 'Dinh dưỡng');
  assert.equal(PRIMARY_NAV_ITEMS.some((item) => (item.id as string) === 'calendar'), false);
});

test('personal is removed from navigation surfaces', () => {
  assert.equal(PRIMARY_NAV_ITEMS.some((item) => item.id === 'personal'), false);
  assert.doesNotMatch(readFileSync('src/components/layout/AppShell.tsx', 'utf8'), /label: 'Cá nhân'/);
  assert.doesNotMatch(readFileSync('src/components/common/CommandMenuModal.tsx', 'utf8'), /Đi tới Cá nhân/);
  assert.doesNotMatch(readFileSync('src/App.tsx', 'utf8'), /PersonalView/);
});

test('reader is a compact primary destination', () => {
  assert.equal(PRIMARY_NAV_ITEMS.find((item) => item.id === 'reader')?.label, 'Sách');
});
