const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');

const root = path.resolve(__dirname, '..');

function loadTsModule(relativePath) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) return null;
  const source = fs.readFileSync(file, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  const fn = new Function('exports', 'module', 'require', '__filename', '__dirname', output);
  fn(module.exports, module, require, file, path.dirname(file));
  return module.exports;
}

test('late-night flexible work is deferred but protected work is untouched', () => {
  const engine = loadTsModule('src/services/personalChiefOfStaff.ts');
  assert.ok(engine, 'personalChiefOfStaff.ts must exist');
  assert.equal(typeof engine.evaluateChiefOfStaff, 'function');

  const now = new Date('2026-09-14T22:50:00+07:00');
  const tasks = [
    {
      id: 'flex', title: 'Viết caption', status: 'todo', priority: 'medium',
      plannedDate: '2026-09-14', startTime: '22:45', estimatedMinutes: 60,
      actualMinutes: 0, subtasks: [], tags: [], category: 'work', createdAt: '2026-09-14',
    },
    {
      id: 'locked', title: 'Gửi file khách', status: 'todo', priority: 'high',
      plannedDate: '2026-09-14', startTime: '23:00', estimatedMinutes: 30,
      deadline: '2026-09-14', isTopPriority: true,
      actualMinutes: 0, subtasks: [], tags: [], category: 'work', createdAt: '2026-09-14',
    },
  ];

  const result = engine.evaluateChiefOfStaff({ tasks, calendarEvents: [], habits: [], now });
  const deferredIds = result.decisions
    .filter((decision) => decision.action?.type === 'reschedule_task')
    .map((decision) => decision.action.taskId);

  assert.deepEqual(deferredIds, ['flex']);
  assert.equal(result.decisions[0].mode, 'auto_notify');
  assert.match(result.brief.nextTransition?.label || '', /vệ sinh|ngủ/i);
});

test('late protected work is surfaced for approval instead of being silently changed', () => {
  const engine = loadTsModule('src/services/personalChiefOfStaff.ts');
  const now = new Date('2026-09-14T23:05:00+07:00');
  const tasks = [{
    id: 'protected', title: 'Gửi báo giá', status: 'todo', priority: 'high',
    plannedDate: '2026-09-14', startTime: '23:10', estimatedMinutes: 60,
    deadline: '2026-09-15', isTopPriority: true,
  }];

  const result = engine.evaluateChiefOfStaff({ tasks, calendarEvents: [], habits: [], now });
  const decision = result.decisions.find((item) => item.action?.taskId === 'protected');

  assert.ok(decision, 'protected late work should still create a visible decision');
  assert.equal(decision.mode, 'approval_required');
});

test('executed reschedule decisions can be applied and undone without changing protected fields', () => {
  const engine = loadTsModule('src/services/personalChiefOfStaff.ts');
  assert.equal(typeof engine.applyAssistantDecisionToTasks, 'function');
  assert.equal(typeof engine.undoAssistantDecisionInTasks, 'function');

  const task = {
    id: 'flex', title: 'Viết caption', status: 'todo', priority: 'medium',
    plannedDate: '2026-09-14', startTime: '22:45', estimatedMinutes: 60,
    notes: 'giữ nguyên', projectId: 'p1',
  };
  const decision = {
    id: 'd1', createdAt: '2026-09-14T22:50:00+07:00', summary: 'move', reason: 'late',
    confidence: 0.9, risk: 'low', mode: 'auto_notify', status: 'planned',
    action: {
      type: 'reschedule_task', taskId: 'flex',
      from: { plannedDate: '2026-09-14', startTime: '22:45' },
      to: { plannedDate: '2026-09-15', startTime: '09:30' },
    },
  };

  const moved = engine.applyAssistantDecisionToTasks([task], decision);
  assert.equal(moved[0].plannedDate, '2026-09-15');
  assert.equal(moved[0].startTime, '09:30');
  assert.equal(moved[0].notes, 'giữ nguyên');

  const restored = engine.undoAssistantDecisionInTasks(moved, decision);
  assert.equal(restored[0].plannedDate, '2026-09-14');
  assert.equal(restored[0].startTime, '22:45');
  assert.equal(restored[0].projectId, 'p1');
});

test('AppContext wires the Chief of Staff engine, execution guard, and undo into public context', () => {
  const source = fs.readFileSync(path.join(root, 'src/context/AppContext.tsx'), 'utf8');
  assert.match(source, /evaluateChiefOfStaff/);
  assert.match(source, /assistantBrief:\s*ChiefOfStaffBrief\s*\|\s*null/);
  assert.match(source, /assistantDecisions:\s*AssistantDecisionRecord\[\]/);
  assert.match(source, /undoAssistantDecision:\s*\(decisionId:\s*string\)\s*=>\s*void/);
  assert.match(source, /applyAssistantDecisionToTasks/);
  assert.match(source, /assistantDecisions\.some\(\([\s\S]*?\.id === item\.id\)/);
});

test('Today view renders a Chief of Staff card with next transition and undo', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/today/TodayView.tsx'), 'utf8');
  assert.match(source, /data-testid="chief-of-staff-card"/);
  assert.match(source, /Trợ lý đang điều hành hôm nay/);
  assert.match(source, /assistantBrief\.nextTransition/);
  assert.match(source, /undoAssistantDecision\(latestAssistantDecision\.id\)/);
  assert.match(source, /setIsAssistantOpen\(true\)/);
});

test('day planner assigns a free time to unscheduled work without colliding with calendar commitments', () => {
  const engine = loadTsModule('src/services/personalChiefOfStaff.ts');
  const now = new Date('2026-09-14T10:00:00+07:00');
  const tasks = [{
    id: 'draft', title: 'Chụp sản phẩm', status: 'todo', priority: 'medium',
    plannedDate: '2026-09-14', estimatedMinutes: 60,
  }];
  const calendarEvents = [{
    id: 'meeting', title: 'Họp', date: '2026-09-14', startTime: '10:15', endTime: '11:15', type: 'meeting',
  }];

  const result = engine.evaluateChiefOfStaff({ tasks, calendarEvents, habits: [], now });
  const schedule = result.decisions.find((item) => item.action?.type === 'reschedule_task' && item.action.taskId === 'draft');

  assert.ok(schedule, 'unscheduled work should receive a slot');
  assert.equal(schedule.action.to.plannedDate, '2026-09-14');
  assert.notEqual(schedule.action.to.startTime, '10:15');
  assert.equal(schedule.mode, 'auto');
});

test('approval-required reschedule can be explicitly applied and then undone', () => {
  const engine = loadTsModule('src/services/personalChiefOfStaff.ts');
  const task = {
    id: 'protected', title: 'Gửi báo giá', status: 'todo', priority: 'high',
    plannedDate: '2026-09-14', startTime: '23:10', estimatedMinutes: 60,
  };
  const decision = {
    id: 'approval-1', createdAt: '2026-09-14T23:05:00+07:00',
    summary: 'Cần quyết định', reason: 'protected', confidence: 0.9,
    risk: 'high', mode: 'approval_required', status: 'planned',
    action: {
      type: 'request_task_reschedule', taskId: 'protected',
      from: { plannedDate: '2026-09-14', startTime: '23:10' },
      suggested: { plannedDate: '2026-09-15', startTime: '09:30' },
    },
  };

  const moved = engine.applyAssistantDecisionToTasks([task], decision);
  assert.equal(moved[0].plannedDate, '2026-09-15');
  assert.equal(moved[0].startTime, '09:30');

  const restored = engine.undoAssistantDecisionInTasks(moved, decision);
  assert.equal(restored[0].plannedDate, '2026-09-14');
  assert.equal(restored[0].startTime, '23:10');
});

test('AppContext exposes approve/reject for protected assistant decisions and persists approval decisions', () => {
  const source = fs.readFileSync(path.join(root, 'src/context/AppContext.tsx'), 'utf8');
  assert.match(source, /approveAssistantDecision:\s*\(decisionId:\s*string\)\s*=>\s*void/);
  assert.match(source, /rejectAssistantDecision:\s*\(decisionId:\s*string\)\s*=>\s*void/);
  assert.match(source, /item\.mode === 'approval_required'/);
  assert.match(source, /status:\s*'rejected'/);
});

test('Today view shows protected decisions with direct keep and approve actions', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/today/TodayView.tsx'), 'utf8');
  assert.match(source, /Cần mày quyết định/);
  assert.match(source, /approveAssistantDecision\(pendingAssistantDecision\.id\)/);
  assert.match(source, /rejectAssistantDecision\(pendingAssistantDecision\.id\)/);
  assert.match(source, /Giữ nguyên/);
  assert.match(source, /Cho dời/);
});

test('scheduled workout task creates a preparation transition before gym', () => {
  const engine = loadTsModule('src/services/personalChiefOfStaff.ts');
  const now = new Date('2026-09-14T18:15:00+07:00');
  const tasks = [{
    id: 'gym-task', title: 'Full body A – quay lại tập', status: 'todo', priority: 'medium',
    plannedDate: '2026-09-14', startTime: '19:00', estimatedMinutes: 75,
  }];

  const result = engine.evaluateChiefOfStaff({ tasks, calendarEvents: [], habits: [], now });

  assert.equal(result.brief.nextTransition?.time, '18:40');
  assert.match(result.brief.nextTransition?.label || '', /chuẩn bị đi tập/i);
});

test('daytime scheduling brief describes finding time instead of claiming work was moved out of the evening', () => {
  const engine = loadTsModule('src/services/personalChiefOfStaff.ts');
  const now = new Date('2026-09-14T10:00:00+07:00');
  const tasks = [{
    id: 'draft', title: 'Viết mô tả sản phẩm', status: 'todo', priority: 'medium',
    plannedDate: '2026-09-14', estimatedMinutes: 45,
  }];

  const result = engine.evaluateChiefOfStaff({ tasks, calendarEvents: [], habits: [], now });

  assert.match(result.brief.intervention || '', /xếp|giờ|lịch/i);
  assert.doesNotMatch(result.brief.intervention || '', /chuyển khỏi cuối ngày/i);
});

test('the Now recommendation does not tell the user to start a scheduled workout too early', () => {
  const engine = loadTsModule('src/services/personalChiefOfStaff.ts');
  const now = new Date('2026-09-14T18:15:00+07:00');
  const tasks = [{
    id: 'gym-task', title: 'Full body A – quay lại tập', status: 'todo', priority: 'medium',
    plannedDate: '2026-09-14', startTime: '19:00', estimatedMinutes: 75,
  }];

  const result = engine.evaluateChiefOfStaff({ tasks, calendarEvents: [], habits: [], now });

  assert.doesNotMatch(result.brief.now.title, /Full body A/i);
  assert.equal(result.brief.nextTransition?.time, '18:40');
});
