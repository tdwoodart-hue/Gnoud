import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('notification state self-heals an existing local subscription into the server', () => {
  const service = readFileSync('src/services/notificationService.ts', 'utf8');
  assert.match(service, /persistSubscription\(subscription\)/);
  assert.match(service, /navigator\.serviceWorker\.ready/);
  assert.match(service, /Device is not subscribed/);
  assert.match(service, /postNotificationSchedule\(tasks, false\)/);
});

test('reader home exposes motivational reading surfaces', () => {
  const reader = readFileSync('src/components/reader/ReaderView.tsx', 'utf8');
  assert.match(reader, /Nhịp đọc/);
  assert.match(reader, /phút hôm nay/);
  assert.match(reader, /ngày liên tiếp/);
  assert.match(reader, /grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4/);
});
