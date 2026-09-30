import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('mobile bottom nav stays below modal layers', () => {
  const appShell = readFileSync('src/components/layout/AppShell.tsx', 'utf8');
  const nutrition = readFileSync('src/components/nutrition/NutritionView.tsx', 'utf8');

  assert.match(
    appShell,
    /<nav className="fixed inset-x-3 bottom-\[max\(8px,env\(safe-area-inset-bottom\)\)\] z-40 grid grid-cols-5/,
    'mobile floating bottom nav must stay at z-40 so it cannot cover dialogs',
  );

  assert.match(
    nutrition,
    /fixed inset-0 z-50 flex items-end justify-center/,
    'nutrition add-meal dialog must remain above the mobile nav',
  );
});
