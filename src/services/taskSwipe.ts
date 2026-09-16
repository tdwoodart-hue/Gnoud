export const TASK_SWIPE_ACTION_WIDTH = 88;
export const TASK_SWIPE_MAX_DISTANCE = 180;
export const TASK_SWIPE_OPEN_THRESHOLD = 44;
export const TASK_SWIPE_HARD_DELETE_DISTANCE = 132;
export const TASK_SWIPE_FAST_DELETE_DISTANCE = 72;
export const TASK_SWIPE_FAST_DELETE_VELOCITY = -0.85;
export const TASK_SWIPE_COMPLETE_DISTANCE = 96;
export const TASK_SWIPE_FAST_COMPLETE_DISTANCE = 64;
export const TASK_SWIPE_FAST_COMPLETE_VELOCITY = 0.8;
export const TASK_SWIPE_START_THRESHOLD = 8;

export type TaskSwipeReleaseAction = 'close' | 'open' | 'delete' | 'complete';

export function resolveTaskSwipeRelease(offset: number, velocityX: number): TaskSwipeReleaseAction {
  if (
    offset <= -TASK_SWIPE_HARD_DELETE_DISTANCE ||
    (offset <= -TASK_SWIPE_FAST_DELETE_DISTANCE && velocityX <= TASK_SWIPE_FAST_DELETE_VELOCITY)
  ) {
    return 'delete';
  }
  if (
    offset >= TASK_SWIPE_COMPLETE_DISTANCE ||
    (offset >= TASK_SWIPE_FAST_COMPLETE_DISTANCE && velocityX >= TASK_SWIPE_FAST_COMPLETE_VELOCITY)
  ) {
    return 'complete';
  }
  if (offset <= -TASK_SWIPE_OPEN_THRESHOLD) return 'open';
  return 'close';
}

export function shouldStartTaskSwipe(deltaX: number, deltaY: number): boolean {
  const horizontal = Math.abs(deltaX);
  const vertical = Math.abs(deltaY);
  return horizontal >= TASK_SWIPE_START_THRESHOLD && horizontal > vertical;
}
