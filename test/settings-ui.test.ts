import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('settings keeps technical diagnostics out of the user interface', () => {
  const settings = readFileSync('src/components/settings/SettingsModal.tsx', 'utf8');
  assert.doesNotMatch(settings, /Gửi thử/);
  assert.doesNotMatch(settings, /Test hôm trước/);
  assert.doesNotMatch(settings, /Test trước 1 giờ/);
  assert.doesNotMatch(settings, /Xuất dữ liệu cho ChatGPT/);
  assert.doesNotMatch(settings, /Lịch sử cập nhật/);
});

test('settings uses full-height mobile layout with top safe area', () => {
  const settings = readFileSync('src/components/settings/SettingsModal.tsx', 'utf8');
  assert.match(settings, /h-\[100dvh\]/);
  assert.match(settings, /pt-\[env\(safe-area-inset-top\)\]/);
});
