import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('mobile bottom nav stays below modal layers', () => {
  const appShell = readFileSync('src/components/layout/AppShell.tsx', 'utf8');
  const nutrition = readFileSync('src/components/nutrition/NutritionView.tsx', 'utf8');

  assert.match(
    appShell,
    /<nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5/,
    'mobile bottom nav must stay at z-40 so it cannot cover dialogs',
  );

  assert.match(
    nutrition,
    /fixed inset-0 z-50 flex items-end justify-center/,
    'nutrition add-meal dialog must remain above the mobile nav',
  );
});


test('app theme is persisted and exposed from Settings', () => {
  const main = readFileSync('src/main.tsx', 'utf8');
  const settings = readFileSync('src/components/settings/SettingsModal.tsx', 'utf8');
  const themeService = readFileSync('src/services/themeService.ts', 'utf8');
  const css = readFileSync('src/index.css', 'utf8');

  assert.match(main, /initializeAppTheme\(\)/, 'theme must be applied before React renders');
  assert.match(settings, /Giao diện/, 'Settings must expose the appearance control');
  assert.match(settings, /updateTheme\('dark'\)/, 'Settings must allow dark mode');
  assert.match(themeService, /gnoud-theme-v1/, 'theme preference must be persisted');
  assert.match(css, /html\.dark/, 'dark theme palette must be scoped to the dark root class');
});
