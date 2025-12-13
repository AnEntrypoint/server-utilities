import test from 'node:test';
import assert from 'node:assert';
import { QueueWorkerPool } from '../src/queue-worker-pool.js';
import { TaskQueueManager } from '../src/task-queue-manager.js';
import { BackgroundTaskManager } from '../src/background-task-manager.js';
import { nowISO, createTimestamps, updateTimestamp } from '@sequentialos/timestamp-utilities';

const mockStateManager = {
  set: async () => {},
  get: async () => null,
  getAll: async () => ({}),
  delete: async () => {},
  shutdown: async () => {}
};

test('Phase 7: Queue Worker Pool - Initialization', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 2 });
  assert.strictEqual(pool.numWorkers, 2);
  assert.strictEqual(pool.pollInterval, 1000);
  assert.strictEqual(pool.taskTimeout, 30000);
  assert.strictEqual(pool.isRunning, false);
  assert.strictEqual(pool.workers.length, 0);
});

test('Phase 7: Queue Worker Pool - Custom Configuration', async (t) => {
  const pool = new QueueWorkerPool({
    numWorkers: 4,
    pollInterval: 500,
    taskTimeout: 60000,
    autoStart: false
  });
  assert.strictEqual(pool.numWorkers, 4);
  assert.strictEqual(pool.pollInterval, 500);
  assert.strictEqual(pool.taskTimeout, 60000);
  assert.strictEqual(pool.autoStart, false);
});

test('Phase 7: Queue Worker Pool - Set Dependencies', async (t) => {
  const pool = new QueueWorkerPool();
  const queue = new TaskQueueManager();
  const bgTaskManager = new BackgroundTaskManager();

  pool.setDependencies(queue, bgTaskManager);
  assert.strictEqual(pool.taskQueueManager, queue);
  assert.strictEqual(pool.backgroundTaskManager, bgTaskManager);
});

test('Phase 7: Queue Worker Pool - Start Workers', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 2 });
  const queue = new TaskQueueManager();
  const bgTaskManager = new BackgroundTaskManager();

  pool.setDependencies(queue, bgTaskManager);
  await pool.start();

  assert.strictEqual(pool.isRunning, true);
  assert.strictEqual(pool.workerStatus.size, 2);

  const worker0 = pool.getWorkerStatus(0);
  const worker1 = pool.getWorkerStatus(1);
  assert.ok(worker0);
  assert.ok(worker1);
  assert.strictEqual(worker0.state, 'idle');
  assert.strictEqual(worker1.state, 'idle');

  await pool.stop();
});

test('Phase 7: Queue Worker Pool - Worker Status Tracking', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 1 });
  const queue = new TaskQueueManager();
  const bgTaskManager = new BackgroundTaskManager();

  pool.setDependencies(queue, bgTaskManager);
  await pool.start();

  const status = pool.getWorkerStatus(0);
  assert.ok(status);
  assert.strictEqual(status.processed, 0);
  assert.strictEqual(status.failed, 0);
  assert.strictEqual(status.currentTask, null);

  await pool.stop();
});

test('Phase 7: Queue Worker Pool - Get All Worker Status', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 3 });
  const queue = new TaskQueueManager();
  const bgTaskManager = new BackgroundTaskManager();

  pool.setDependencies(queue, bgTaskManager);
  await pool.start();

  const allWorkers = pool.getAllWorkerStatus();
  assert.strictEqual(allWorkers.length, 3);
  assert.ok(allWorkers.every(w => w.id >= 0 && w.id < 3));

  await pool.stop();
});

test('Phase 7: Queue Worker Pool - Statistics Tracking', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 2 });
  const queue = new TaskQueueManager();
  const bgTaskManager = new BackgroundTaskManager();

  pool.setDependencies(queue, bgTaskManager);
  await pool.start();

  const stats = pool.getStats();
  assert.strictEqual(stats.processed, 0);
  assert.strictEqual(stats.succeeded, 0);
  assert.strictEqual(stats.failed, 0);
  assert.strictEqual(stats.retried, 0);
  assert.strictEqual(stats.isRunning, true);
  assert.strictEqual(stats.numWorkers, 2);
  assert.ok(Array.isArray(stats.workers));

  await pool.stop();
});

test('Phase 7: Queue Worker Pool - Update Stats with Active Workers', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 2 });
  const queue = new TaskQueueManager();
  const bgTaskManager = new BackgroundTaskManager();

  pool.setDependencies(queue, bgTaskManager);

  pool.workerStatus.set(0, { state: 'active', currentTask: 'task1', processed: 5, failed: 0 });
  pool.workerStatus.set(1, { state: 'idle', currentTask: null, processed: 3, failed: 0 });
  pool.updateStats();

  assert.strictEqual(pool.stats.workersActive, 1);
  assert.strictEqual(pool.stats.workersIdle, 1);
});

test('Phase 7: Queue Worker Pool - Idempotent Start', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 1 });
  const queue = new TaskQueueManager();
  const bgTaskManager = new BackgroundTaskManager();

  pool.setDependencies(queue, bgTaskManager);

  await pool.start();
  assert.strictEqual(pool.isRunning, true);

  await pool.start();
  assert.strictEqual(pool.isRunning, true);

  await pool.stop();
});

test('Phase 7: Queue Worker Pool - Idempotent Stop', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 1 });
  const queue = new TaskQueueManager();
  const bgTaskManager = new BackgroundTaskManager();

  pool.setDependencies(queue, bgTaskManager);
  await pool.start();

  await pool.stop();
  assert.strictEqual(pool.isRunning, false);

  await pool.stop();
  assert.strictEqual(pool.isRunning, false);
});

test('Phase 7: Queue Worker Pool - Event Emission on Start', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 2 });
  const queue = new TaskQueueManager();
  const bgTaskManager = new BackgroundTaskManager();

  pool.setDependencies(queue, bgTaskManager);

  let eventFired = false;
  let eventData = null;

  pool.on('pool:started', (data) => {
    eventFired = true;
    eventData = data;
  });

  await pool.start();

  assert.strictEqual(eventFired, true);
  assert.strictEqual(eventData.numWorkers, 2);

  await pool.stop();
});

test('Phase 7: Queue Worker Pool - Event Emission on Stop', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 1 });
  const queue = new TaskQueueManager();
  const bgTaskManager = new BackgroundTaskManager();

  pool.setDependencies(queue, bgTaskManager);
  await pool.start();

  let eventFired = false;
  let eventData = null;

  pool.on('pool:stopped', (data) => {
    eventFired = true;
    eventData = data;
  });

  await pool.stop();

  assert.strictEqual(eventFired, true);
  assert.strictEqual(eventData.totalProcessed, 0);
});

test('Phase 7: Queue Worker Pool - Invalid Worker ID Returns Null', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 2 });
  const queue = new TaskQueueManager();
  const bgTaskManager = new BackgroundTaskManager();

  pool.setDependencies(queue, bgTaskManager);
  await pool.start();

  const status = pool.getWorkerStatus(999);
  assert.strictEqual(status, null);

  await pool.stop();
});

test('Phase 7: Queue Worker Pool - Worker Status Per-Worker Metrics', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 1 });
  const queue = new TaskQueueManager();
  const bgTaskManager = new BackgroundTaskManager();

  pool.setDependencies(queue, bgTaskManager);

  pool.workerStatus.set(0, {
    state: 'active',
    currentTask: 'abc123',
    taskName: 'myTask',
    processed: 10,
    failed: 2,
    lastActivity: Date.now()
  });

  const stats = pool.getStats();
  assert.strictEqual(stats.workers.length, 1);
  assert.strictEqual(stats.workers[0].id, 0);
  assert.strictEqual(stats.workers[0].state, 'active');
  assert.strictEqual(stats.workers[0].currentTask, 'abc123');
  assert.strictEqual(stats.workers[0].taskName, 'myTask');
  assert.strictEqual(stats.workers[0].processed, 10);
  assert.strictEqual(stats.workers[0].failed, 2);
});

test('Phase 7: Queue Worker Pool - Multiple Workers Stats Include All', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 3 });
  const queue = new TaskQueueManager();
  const bgTaskManager = new BackgroundTaskManager();

  pool.setDependencies(queue, bgTaskManager);

  pool.workerStatus.set(0, { state: 'active', processed: 5, failed: 0 });
  pool.workerStatus.set(1, { state: 'idle', processed: 3, failed: 1 });
  pool.workerStatus.set(2, { state: 'active', processed: 7, failed: 0 });

  const stats = pool.getStats();
  assert.strictEqual(stats.workers.length, 3);
  assert.strictEqual(stats.workers[0].processed, 5);
  assert.strictEqual(stats.workers[1].failed, 1);
  assert.strictEqual(stats.workers[2].processed, 7);
});

test('Phase 7: Queue Worker Pool - Stats Include IsRunning', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 1 });
  const queue = new TaskQueueManager();
  const bgTaskManager = new BackgroundTaskManager();

  pool.setDependencies(queue, bgTaskManager);

  let stats = pool.getStats();
  assert.strictEqual(stats.isRunning, false);

  await pool.start();
  stats = pool.getStats();
  assert.strictEqual(stats.isRunning, true);

  await pool.stop();
  stats = pool.getStats();
  assert.strictEqual(stats.isRunning, false);
});

test('Phase 7: Queue Worker Pool - Stats Are Aggregated Across Workers', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 2 });
  const queue = new TaskQueueManager();
  const bgTaskManager = new BackgroundTaskManager();

  pool.setDependencies(queue, bgTaskManager);

  pool.stats.processed = 15;
  pool.stats.succeeded = 12;
  pool.stats.failed = 2;
  pool.stats.retried = 1;

  const stats = pool.getStats();
  assert.strictEqual(stats.processed, 15);
  assert.strictEqual(stats.succeeded, 12);
  assert.strictEqual(stats.failed, 2);
  assert.strictEqual(stats.retried, 1);
});

test('Phase 7: Queue Worker Pool - Worker Configuration Immutable After Start', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 1 });
  const queue = new TaskQueueManager();
  const bgTaskManager = new BackgroundTaskManager();

  pool.setDependencies(queue, bgTaskManager);
  await pool.start();

  const numWorkersBefore = pool.numWorkers;

  await pool.stop();

  const numWorkersAfter = pool.numWorkers;
  assert.strictEqual(numWorkersBefore, numWorkersAfter);
});

test('Phase 7: Queue Worker Pool - Graceful Stop Waits for Workers', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 2, pollInterval: 100 });
  const queue = new TaskQueueManager();
  const bgTaskManager = new BackgroundTaskManager();

  pool.setDependencies(queue, bgTaskManager);
  await pool.start();

  assert.strictEqual(pool.isRunning, true);

  const stopPromise = pool.stop();

  assert.strictEqual(pool.isRunning, false);

  await stopPromise;

  assert.strictEqual(pool.workerStatus.size, 2);
});

test('Phase 7: Queue Worker Pool - Worker Status Maps Initialized on Start', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 3 });
  const queue = new TaskQueueManager();
  const bgTaskManager = new BackgroundTaskManager();

  pool.setDependencies(queue, bgTaskManager);

  assert.strictEqual(pool.workerStatus.size, 0);

  await pool.start();

  assert.strictEqual(pool.workerStatus.size, 3);

  for (let i = 0; i < 3; i++) {
    const status = pool.workerStatus.get(i);
    assert.ok(status);
    assert.strictEqual(status.state, 'idle');
    assert.strictEqual(status.currentTask, null);
    assert.strictEqual(status.processed, 0);
    assert.strictEqual(status.failed, 0);
  }

  await pool.stop();
});

test('Phase 7: Queue Worker Pool - Worker Loop Requires Dependencies', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 1 });

  let startWorkerLoopCalled = false;
  const originalStartWorkerLoop = pool.startWorkerLoop.bind(pool);

  pool.startWorkerLoop = (workerId) => {
    startWorkerLoopCalled = true;
    if (!pool.taskQueueManager || !pool.backgroundTaskManager) {
      throw new Error('Dependencies not set');
    }
    return originalStartWorkerLoop(workerId);
  };

  assert.throws(
    () => {
      pool.startWorkerLoop(0);
    },
    /Dependencies not set/
  );
});

test('Phase 7: Queue Worker Pool - Integration: Start and Stop Lifecycle', async (t) => {
  const pool = new QueueWorkerPool({ numWorkers: 2 });
  const queue = new TaskQueueManager();
  const bgTaskManager = new BackgroundTaskManager();

  queue.setStateManager(mockStateManager);
  pool.setDependencies(queue, bgTaskManager);

  assert.strictEqual(pool.isRunning, false);

  let startedEvent = false;
  pool.on('pool:started', () => { startedEvent = true; });

  await pool.start();
  assert.strictEqual(pool.isRunning, true);
  assert.strictEqual(startedEvent, true);
  assert.strictEqual(pool.workerStatus.size, 2);

  let stoppedEvent = false;
  pool.on('pool:stopped', () => { stoppedEvent = true; });

  await pool.stop();
  assert.strictEqual(pool.isRunning, false);
  assert.strictEqual(stoppedEvent, true);
});
