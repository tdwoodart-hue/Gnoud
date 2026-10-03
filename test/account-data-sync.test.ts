import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('exercise progress is wired into account cloud sync', () => {
  const bridge = readFileSync('src/components/common/AccountDataSyncBridge.tsx', 'utf8');
  const service = readFileSync('src/services/accountDataSyncService.ts', 'utf8');
  const today = readFileSync('src/components/today/TodayView.tsx', 'utf8');

  assert.match(service, /bootstrapExerciseProgressCloud/);
  assert.match(service, /syncExerciseProgressCloud/);
  assert.match(service, /subscribeExerciseProgressCloud/);
  assert.match(bridge, /loadExerciseProgress\(user\.uid\)/);
  assert.match(bridge, /persistExerciseProgress\(merged, user\.uid\)/);
  assert.match(bridge, /emitRefresh\('exercise'\)/);
  assert.match(today, /EXERCISE_PROGRESS_REFRESH_EVENT/);
});

test('full-screen task and mobile sheets respect the iPhone top safe area', () => {
  const today = readFileSync('src/components/today/TodayView.tsx', 'utf8');
  const taskModal = readFileSync('src/components/common/TaskEditModal.tsx', 'utf8');
  const quickAction = readFileSync('src/components/common/QuickActionModal.tsx', 'utf8');
  const theme = readFileSync('src/services/themeService.ts', 'utf8');

  assert.match(today, /pt-\[env\(safe-area-inset-top\)\] backdrop-blur-md/);
  assert.match(taskModal, /pt-\[env\(safe-area-inset-top\)\]/);
  assert.match(quickAction, /pt-\[env\(safe-area-inset-top\)\]/);
  assert.match(theme, /apple-mobile-web-app-status-bar-style/);
  assert.match(theme, /black-translucent/);
});
