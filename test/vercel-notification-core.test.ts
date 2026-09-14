import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationForTask } from '../api/_lib/notificationCore';

const task = {
  id: 'task-1',
  title: 'Gửi đơn hàng',
  plannedDate: '2026-09-14',
  startTime: '09:00',
  status: 'todo',
  policy: { leadMinutes: [15, 0], chaseMinutes: 10, level: 'Mạnh' as const },
};

test('creates a lead notification inside the delivery window', () => {
  const now = new Date('2026-09-14T08:45:30+07:00').getTime();
  assert.deepEqual(notificationForTask(task, now), {
    key: 'task-1:lead:15', title: 'Còn 15 phút', body: 'Gửi đơn hàng',
  });
});

test('five-minute scheduler does not miss a lead reminder', () => {
  const now = new Date('2026-09-14T08:49:30+07:00').getTime();
  assert.equal(notificationForTask(task, now)?.key, 'task-1:lead:15');
});

test('does not send completed tasks', () => {
  const now = new Date('2026-09-14T09:10:30+07:00').getTime();
  assert.equal(notificationForTask({ ...task, status: 'done' }, now), null);
});

test('creates a chase notification after an unfinished important task', () => {
  const now = new Date('2026-09-14T09:21:00+07:00').getTime();
  assert.equal(notificationForTask(task, now)?.key, 'task-1:chase:2');
});
