import assert from 'node:assert/strict';
import test from 'node:test';
import type { Task } from '../src/types';
import {
  activityNoteLine,
  appendActivityResult,
  getLatestActivityResult,
  resolveTaskActivity,
} from '../src/services/taskActivityService';

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Việc test',
  category: 'personal',
  status: 'todo',
  priority: 'medium',
  plannedDate: '2026-09-19',
  estimatedMinutes: 15,
  actualMinutes: 0,
  subtasks: [],
  tags: [],
  createdAt: '2026-09-19',
  ...overrides,
});

test('reads explicit language activity from notes', () => {
  const marker = activityNoteLine({
    type: 'language_chat',
    language: 'de-DE',
    languageName: 'Tiếng Đức',
    level: 'A1',
    durationMinutes: 15,
    autoSpeak: true,
    topic: 'Giới thiệu bản thân',
    goal: 'Nói tên và nơi sống',
    correctionMode: 'gentle',
    personaName: 'Mia',
  });

  const activity = resolveTaskActivity(task({ notes: marker }));
  assert.equal(activity?.type, 'language_chat');
  assert.equal(activity?.language, 'de-DE');
  assert.equal(activity?.durationMinutes, 15);
});

test('legacy German task is automatically recognized', () => {
  const activity = resolveTaskActivity(task({ title: 'Đức A1 · Tuần 1 · Từ vựng + phát âm' }));
  assert.equal(activity?.type, 'language_chat');
  assert.equal(activity?.level, 'A1');
  assert.equal(activity?.inferred, true);
});

test('activity result can be appended and read back', () => {
  const notes = appendActivityResult('ghi chú', {
    type: 'language_chat',
    completedAt: '2026-09-19T10:15:00.000Z',
    durationMinutes: 15,
    turns: 8,
    corrections: 2,
    newWords: ['wohnen — sống', 'heißen — tên là'],
  });

  const result = getLatestActivityResult(notes);
  assert.equal(result?.turns, 8);
  assert.equal(result?.newWords.length, 2);
});
