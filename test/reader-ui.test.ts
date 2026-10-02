import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/reader/ReaderView.tsx', import.meta.url), 'utf8');

test('reader pagehide flush always calls the latest position writer', () => {
  assert.match(source, /persistCurrentReadingPositionRef\.current = \(\) => persistCurrentReadingPosition\(\)/);
  assert.match(source, /const flush = \(\) => persistCurrentReadingPositionRef\.current\(\)/);
  assert.doesNotMatch(source, /const flush = \(\) => persistCurrentReadingPosition\(\)/);
});

test('night reader uses warm neutral chrome instead of blue-purple chrome', () => {
  assert.match(source, /shell: 'bg-\[#181715\] text-\[#e9e4da\]'/);
  assert.match(source, /progress: 'bg-\[#cdbda7\]'/);
});
