import assert from 'node:assert/strict';
import test from 'node:test';
import { buildChatGPTSnapshot } from '../src/services/dataSnapshot';

const input = {
  tasks: [{
    id: 'task-1',
    title: 'Chụp ảnh sản phẩm',
    description: 'PRIVATE DESCRIPTION',
    category: 'work' as const,
    projectId: 'project-1',
    status: 'done' as const,
    priority: 'high' as const,
    deadline: '2026-09-15',
    plannedDate: '2026-09-15',
    startTime: '09:00',
    estimatedMinutes: 60,
    actualMinutes: 90,
    subtasks: [{ id: 'sub-1', title: 'PRIVATE SUBTASK', completed: true }],
    notes: 'PRIVATE NOTES',
    tags: [],
    reminder: '15 phút trước',
    recurrence: 'none' as const,
    isTopPriority: true,
    createdAt: '2026-09-10',
    completedAt: '2026-09-15',
  }],
  projects: [{
    id: 'project-1',
    name: 'Ra mắt sản phẩm',
    description: 'PRIVATE PROJECT DESCRIPTION',
    category: 'work' as const,
    color: '#000000',
    targetDate: '2026-09-30',
    milestones: [],
    recentActivity: [],
  }],
  calendarEvents: [{
    id: 'event-1',
    title: 'Chụp ảnh sản phẩm',
    type: 'task' as const,
    date: '2026-09-15',
    startTime: '09:00',
    endTime: '10:30',
    taskId: 'task-1',
    projectId: 'project-1',
    description: 'PRIVATE EVENT DESCRIPTION',
    location: 'PRIVATE LOCATION',
  }],
  habits: [],
  goals: [],
  telemetry: {
    events: [{ name: 'task_created', timestamp: '2026-09-15T01:00:00.000Z', metadata: { source: 'manual' } }],
    errors: [{ timestamp: '2026-09-15T01:30:00.000Z', message: 'Boom', source: 'TaskEditModal.tsx' }],
  },
  now: new Date('2026-09-15T08:00:00+07:00'),
};

test('builds a filtered snapshot without private free-text fields', () => {
  const snapshot = buildChatGPTSnapshot(input);
  const serialized = JSON.stringify(snapshot);

  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.summary.totalTasks, 1);
  assert.equal(snapshot.summary.completionRate, 100);
  assert.equal(snapshot.summary.averageEstimateAccuracyRatio, 1.5);
  assert.equal(snapshot.tasks[0].project, 'Ra mắt sản phẩm');
  assert.equal(snapshot.tasks[0].subtaskCount, 1);
  assert.equal(snapshot.usage.counts.task_created, 1);
  assert.equal(snapshot.diagnostics.errorCount, 1);
  assert.equal(serialized.includes('PRIVATE DESCRIPTION'), false);
  assert.equal(serialized.includes('PRIVATE NOTES'), false);
  assert.equal(serialized.includes('PRIVATE SUBTASK'), false);
  assert.equal(serialized.includes('PRIVATE LOCATION'), false);
});
