import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  mergeDailyNotesForFirstMigration,
  mergeDailyNotesSnapshot,
} from '../src/services/dailyNoteSync';

const note = (id: string, content: string, updatedAt = '2026-10-03T07:00:00.000Z') => ({
  id,
  date: '2026-10-03',
  time: '14:00',
  content,
  category: 'general' as const,
  createdAt: updatedAt,
  updatedAt,
});

test('pending daily note survives a cloud snapshot that does not contain it yet', () => {
  const remote = [note('remote', 'đã có trên cloud')];
  const pending = note('local', 'vừa nhập lúc mất mạng');

  const merged = mergeDailyNotesSnapshot(remote, {
    upserts: [pending],
    deletes: [],
  });

  assert.deepEqual(new Set(merged.map((item) => item.id)), new Set(['remote', 'local']));
  assert.equal(merged.find((item) => item.id === 'local')?.content, pending.content);
});

test('pending delete prevents an old cloud snapshot from resurrecting a deleted note', () => {
  const remote = [note('delete-me', 'cũ')];
  const merged = mergeDailyNotesSnapshot(remote, {
    upserts: [],
    deletes: ['delete-me'],
  });
  assert.equal(merged.length, 0);
});

test('first daily-note migration keeps the newer local edit', () => {
  const remote = [note('same', 'cloud cũ', '2026-10-03T06:00:00.000Z')];
  const local = [note('same', 'local mới', '2026-10-03T07:00:00.000Z')];
  const merged = mergeDailyNotesForFirstMigration(remote, local);
  assert.equal(merged[0]?.content, 'local mới');
});

test('daily note date refreshes after midnight or when iPhone app returns to foreground', () => {
  const source = readFileSync('src/components/today/DailyHourlyNotesSection.tsx', 'utf8');
  assert.match(source, /setInterval\(refreshDate, 60_000\)/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /window\.addEventListener\('focus', refreshDate\)/);
});
