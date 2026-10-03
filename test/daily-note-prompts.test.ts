import assert from 'node:assert/strict';
import test from 'node:test';
import { DAILY_NOTE_PROMPTS, dailyNotePrompt } from '../src/services/dailyNotePromptService';

test('daily note prompt library contains a few hundred unique questions', () => {
  assert.ok(DAILY_NOTE_PROMPTS.length >= 200);
  assert.equal(new Set(DAILY_NOTE_PROMPTS).size, DAILY_NOTE_PROMPTS.length);
  assert.ok(DAILY_NOTE_PROMPTS.every((prompt) => prompt.endsWith('?')));
});

test('daily note prompt is stable for a date and advances after each saved note', () => {
  const date = '2026-10-03';
  const first = dailyNotePrompt(date, 0);
  assert.equal(dailyNotePrompt(date, 0), first);
  assert.notEqual(dailyNotePrompt(date, 1), first);
  assert.notEqual(dailyNotePrompt(date, 2), dailyNotePrompt(date, 1));
});
