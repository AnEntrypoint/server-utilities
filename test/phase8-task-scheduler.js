import test from 'node:test';
import assert from 'node:assert';
import { TaskScheduler } from '../src/task-scheduler.js';
import { TaskQueueManager } from '../src/task-queue-manager.js';
import { nowISO, createTimestamps, updateTimestamp } from '@sequentialos/timestamp-utilities';

const mockStateManager = {
  set: async () => {},
  get: async () => null,
  getAll: async () => ({}),
  delete: async () => {},
  shutdown: async () => {}
};

test('Phase 8: Task Scheduler - Initialization', async (t) => {
  const scheduler = new TaskScheduler({ maxScheduled: 500, checkInterval: 2000 });
  assert.strictEqual(scheduler.maxScheduled, 500);
  assert.strictEqual(scheduler.checkInterval, 2000);
  assert.strictEqual(scheduler.isRunning, false);
  assert.strictEqual(scheduler.scheduled.size, 0);
});

test('Phase 8: Task Scheduler - Default Configuration', async (t) => {
  const scheduler = new TaskScheduler();
  assert.strictEqual(scheduler.maxScheduled, 1000);
  assert.strictEqual(scheduler.checkInterval, 1000);
  assert.strictEqual(scheduler.timezone, 'UTC');
});

test('Phase 8: Task Scheduler - Set Dependencies', async (t) => {
  const scheduler = new TaskScheduler();
  const queue = new TaskQueueManager();

  scheduler.setDependencies(queue, mockStateManager);
  assert.strictEqual(scheduler.taskQueueManager, queue);
  assert.strictEqual(scheduler.stateManager, mockStateManager);
});

test('Phase 8: Task Scheduler - Schedule Once', async (t) => {
  const scheduler = new TaskScheduler();
  const futureTime = Date.now() + 60000;

  const result = scheduler.scheduleOnce('myTask', ['arg1'], futureTime);
  assert.ok(result.id);
  assert.strictEqual(result.status, 'scheduled');
  assert.strictEqual(scheduler.scheduled.size, 1);

  const schedule = scheduler.getSchedule(result.id);
  assert.strictEqual(schedule.type, 'once');
  assert.strictEqual(schedule.taskName, 'myTask');
  assert.deepEqual(schedule.args, ['arg1']);
  assert.strictEqual(schedule.nextRun, futureTime);
});

test('Phase 8: Task Scheduler - Schedule Recurring', async (t) => {
  const scheduler = new TaskScheduler();

  const result = scheduler.scheduleRecurring('dailyTask', [], '0 9 * * *');
  assert.ok(result.id);
  assert.strictEqual(result.status, 'scheduled');

  const schedule = scheduler.getSchedule(result.id);
  assert.strictEqual(schedule.type, 'recurring');
  assert.strictEqual(schedule.cronExpression, '0 9 * * *');
  assert.ok(schedule.nextRun);
});

test('Phase 8: Task Scheduler - Schedule Interval', async (t) => {
  const scheduler = new TaskScheduler();

  const result = scheduler.scheduleInterval('repeatTask', [], 30000);
  assert.ok(result.id);
  assert.strictEqual(result.status, 'scheduled');

  const schedule = scheduler.getSchedule(result.id);
  assert.strictEqual(schedule.type, 'interval');
  assert.strictEqual(schedule.intervalMs, 30000);
  assert.ok(schedule.nextRun > Date.now());
});

test('Phase 8: Task Scheduler - Get All Schedules', async (t) => {
  const scheduler = new TaskScheduler();

  scheduler.scheduleOnce('task1', [], Date.now() + 10000);
  scheduler.scheduleOnce('task2', [], Date.now() + 20000);
  scheduler.scheduleOnce('task3', [], Date.now() + 30000);

  const all = scheduler.getAllSchedules();
  assert.strictEqual(all.length, 3);
  assert.ok(all.every(s => s.id && s.type === 'once'));
});

test('Phase 8: Task Scheduler - Cancel Schedule', async (t) => {
  const scheduler = new TaskScheduler();

  const result = scheduler.scheduleOnce('task', [], Date.now() + 10000);
  assert.strictEqual(scheduler.scheduled.get(result.id).enabled, true);

  scheduler.cancel(result.id);
  assert.strictEqual(scheduler.scheduled.get(result.id).enabled, false);
  assert.strictEqual(scheduler.stats.cancelled, 1);
});

test('Phase 8: Task Scheduler - Cancel Non-Existent Returns Error', async (t) => {
  const scheduler = new TaskScheduler();

  const result = scheduler.cancel('nonexistent');
  assert.strictEqual(result.success, false);
  assert.ok(result.error);
});

test('Phase 8: Task Scheduler - Update Schedule', async (t) => {
  const scheduler = new TaskScheduler();

  const result = scheduler.scheduleOnce('task', ['arg1'], Date.now() + 10000);
  scheduler.update(result.id, { args: ['arg2', 'arg3'] });

  const updated = scheduler.getSchedule(result.id);
  assert.deepEqual(updated.args, ['arg2', 'arg3']);
});

test('Phase 8: Task Scheduler - Cron Part Matches Wildcard', async (t) => {
  const scheduler = new TaskScheduler();

  assert.strictEqual(scheduler.cronPartMatches(5, '*'), true);
  assert.strictEqual(scheduler.cronPartMatches(10, '*'), true);
});

test('Phase 8: Task Scheduler - Cron Part Matches Exact', async (t) => {
  const scheduler = new TaskScheduler();

  assert.strictEqual(scheduler.cronPartMatches(9, '9'), true);
  assert.strictEqual(scheduler.cronPartMatches(10, '9'), false);
});

test('Phase 8: Task Scheduler - Cron Part Matches Range', async (t) => {
  const scheduler = new TaskScheduler();

  assert.strictEqual(scheduler.cronPartMatches(5, '0-10'), true);
  assert.strictEqual(scheduler.cronPartMatches(15, '0-10'), false);
  assert.strictEqual(scheduler.cronPartMatches(0, '0-10'), true);
});

test('Phase 8: Task Scheduler - Cron Part Matches List', async (t) => {
  const scheduler = new TaskScheduler();

  assert.strictEqual(scheduler.cronPartMatches(1, '1,3,5'), true);
  assert.strictEqual(scheduler.cronPartMatches(3, '1,3,5'), true);
  assert.strictEqual(scheduler.cronPartMatches(4, '1,3,5'), false);
});

test('Phase 8: Task Scheduler - Cron Part Matches Interval', async (t) => {
  const scheduler = new TaskScheduler();

  assert.strictEqual(scheduler.cronPartMatches(0, '*/5'), true);
  assert.strictEqual(scheduler.cronPartMatches(5, '*/5'), true);
  assert.strictEqual(scheduler.cronPartMatches(10, '*/5'), true);
  assert.strictEqual(scheduler.cronPartMatches(7, '*/5'), false);
});

test('Phase 8: Task Scheduler - Statistics Tracking', async (t) => {
  const scheduler = new TaskScheduler();

  scheduler.scheduleOnce('task1', [], Date.now() + 10000);
  scheduler.scheduleOnce('task2', [], Date.now() + 20000);
  scheduler.scheduleRecurring('task3', [], '0 9 * * *');

  const stats = scheduler.getStats();
  assert.strictEqual(stats.total, 3);
  assert.strictEqual(stats.scheduled, 3);
  assert.strictEqual(stats.isRunning, false);
  assert.strictEqual(stats.executed, 0);
  assert.strictEqual(stats.failed, 0);
});

test('Phase 8: Task Scheduler - Start and Stop', async (t) => {
  const scheduler = new TaskScheduler();
  const queue = new TaskQueueManager();

  scheduler.setDependencies(queue, mockStateManager);

  assert.strictEqual(scheduler.isRunning, false);

  let startedEvent = false;
  scheduler.on('scheduler:started', () => { startedEvent = true; });

  await scheduler.start();
  assert.strictEqual(scheduler.isRunning, true);
  assert.strictEqual(startedEvent, true);

  let stoppedEvent = false;
  scheduler.on('scheduler:stopped', () => { stoppedEvent = true; });

  await scheduler.stop();
  assert.strictEqual(scheduler.isRunning, false);
  assert.strictEqual(stoppedEvent, true);
});

test('Phase 8: Task Scheduler - Idempotent Start', async (t) => {
  const scheduler = new TaskScheduler();
  const queue = new TaskQueueManager();

  scheduler.setDependencies(queue, mockStateManager);

  await scheduler.start();
  assert.strictEqual(scheduler.isRunning, true);

  await scheduler.start();
  assert.strictEqual(scheduler.isRunning, true);

  await scheduler.stop();
});

test('Phase 8: Task Scheduler - Idempotent Stop', async (t) => {
  const scheduler = new TaskScheduler();
  const queue = new TaskQueueManager();

  scheduler.setDependencies(queue, mockStateManager);
  await scheduler.start();

  await scheduler.stop();
  assert.strictEqual(scheduler.isRunning, false);

  await scheduler.stop();
  assert.strictEqual(scheduler.isRunning, false);
});

test('Phase 8: Task Scheduler - Max Scheduled Limit', async (t) => {
  const scheduler = new TaskScheduler({ maxScheduled: 2 });

  scheduler.scheduleOnce('task1', [], Date.now() + 10000);
  scheduler.scheduleOnce('task2', [], Date.now() + 20000);

  assert.throws(
    () => {
      scheduler.scheduleOnce('task3', [], Date.now() + 30000);
    },
    /Cannot schedule: limit of 2 reached/
  );
});

test('Phase 8: Task Scheduler - Record Execution', async (t) => {
  const scheduler = new TaskScheduler();

  const id = 'test-schedule-id';
  scheduler.recordExecution(id, { status: 'enqueued', timestamp: Date.now() });
  scheduler.recordExecution(id, { status: 'completed', timestamp: Date.now() + 1000 });

  const history = scheduler.getExecutionHistory(id);
  assert.strictEqual(history.length, 2);
  assert.strictEqual(history[0].status, 'enqueued');
  assert.strictEqual(history[1].status, 'completed');
});

test('Phase 8: Task Scheduler - Execution History Limit', async (t) => {
  const scheduler = new TaskScheduler();
  const id = 'test-id';

  for (let i = 0; i < 1050; i++) {
    scheduler.recordExecution(id, { status: 'done', index: i });
  }

  const history = scheduler.getExecutionHistory(id, 1050);
  assert.ok(history.length <= 1000);
});

test('Phase 8: Task Scheduler - Get Execution History with Limit', async (t) => {
  const scheduler = new TaskScheduler();
  const id = 'test-id';

  for (let i = 0; i < 100; i++) {
    scheduler.recordExecution(id, { status: 'done', index: i });
  }

  const history = scheduler.getExecutionHistory(id, 10);
  assert.strictEqual(history.length, 10);
});

test('Phase 8: Task Scheduler - Event Emission on Schedule Creation', async (t) => {
  const scheduler = new TaskScheduler();

  let createdEvent = false;
  let eventData = null;

  scheduler.on('schedule:created', (data) => {
    createdEvent = true;
    eventData = data;
  });

  const result = scheduler.scheduleOnce('task', [], Date.now() + 10000);

  assert.strictEqual(createdEvent, true);
  assert.strictEqual(eventData.id, result.id);
  assert.strictEqual(eventData.type, 'once');
});

test('Phase 8: Task Scheduler - Event Emission on Schedule Cancel', async (t) => {
  const scheduler = new TaskScheduler();

  const result = scheduler.scheduleOnce('task', [], Date.now() + 10000);

  let cancelledEvent = false;
  scheduler.on('schedule:cancelled', () => { cancelledEvent = true; });

  scheduler.cancel(result.id);

  assert.strictEqual(cancelledEvent, true);
});

test('Phase 8: Task Scheduler - Should Execute Schedule When Due', async (t) => {
  const scheduler = new TaskScheduler();
  const now = Date.now();

  const schedule = {
    type: 'once',
    nextRun: now - 1000,
    enabled: true
  };

  assert.strictEqual(scheduler.shouldExecuteSchedule(schedule, now), true);
});

test('Phase 8: Task Scheduler - Should Not Execute Future Schedule', async (t) => {
  const scheduler = new TaskScheduler();
  const now = Date.now();

  const schedule = {
    type: 'once',
    nextRun: now + 10000,
    enabled: true
  };

  assert.strictEqual(scheduler.shouldExecuteSchedule(schedule, now), false);
});

test('Phase 8: Task Scheduler - Calculate Next Cron Run', async (t) => {
  const scheduler = new TaskScheduler();

  const nextRun = scheduler.calculateNextCronRun('0 9 * * *');
  assert.ok(nextRun);
  assert.ok(nextRun > Date.now());
});

test('Phase 8: Task Scheduler - Invalid Cron Expression Throws', async (t) => {
  const scheduler = new TaskScheduler();

  assert.throws(
    () => {
      scheduler.calculateNextCronRun('invalid cron');
    },
    /Invalid cron expression format/
  );
});

test('Phase 8: Task Scheduler - Calculate Next Run for Interval', async (t) => {
  const scheduler = new TaskScheduler();

  const schedule = {
    type: 'interval',
    intervalMs: 5000,
    nextRun: Date.now()
  };

  const before = schedule.nextRun;
  scheduler.calculateNextRun(schedule);

  assert.strictEqual(schedule.nextRun > before, true);
  assert.strictEqual(schedule.nextRun, before + 5000);
});

test('Phase 8: Task Scheduler - Get Non-Existent Schedule Returns Null', async (t) => {
  const scheduler = new TaskScheduler();

  const result = scheduler.getSchedule('nonexistent');
  assert.strictEqual(result, null);
});

test('Phase 8: Task Scheduler - Integration with Queue Manager', async (t) => {
  const scheduler = new TaskScheduler();
  const queue = new TaskQueueManager();

  queue.setStateManager(mockStateManager);
  scheduler.setDependencies(queue, mockStateManager);

  let executedEvent = false;
  scheduler.on('schedule:executed', () => { executedEvent = true; });

  const id = scheduler.scheduleOnce('testTask', ['arg1'], Date.now() - 1000).id;
  const schedule = scheduler.getSchedule(id);

  scheduler.executeSchedule(id, schedule, Date.now());

  assert.strictEqual(executedEvent, true);
});

test('Phase 8: Task Scheduler - Cron Expression Examples', async (t) => {
  const scheduler = new TaskScheduler();

  const examples = [
    '0 9 * * 1',      // 9am Mondays
    '0 */6 * * *',    // Every 6 hours
    '0 0 * * *',      // Daily at midnight
    '*/15 * * * *',   // Every 15 minutes
    '0 9 1 * *'       // 1st of month at 9am
  ];

  for (const expr of examples) {
    const nextRun = scheduler.calculateNextCronRun(expr);
    assert.ok(nextRun, `Should calculate next run for: ${expr}`);
  }
});
