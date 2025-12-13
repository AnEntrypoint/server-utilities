/**
 * queue-worker-pool.js - Queue Worker Pool Facade
 *
 * Delegates to focused modules:
 * - worker-lifecycle: Worker pool start/stop/loop management
 * - queue-loop-executor: Queue task dequeue and execution
 * - stats-tracker: Statistics tracking and reporting
 */

import { EventEmitter } from 'events';
import logger from '@sequentialos/sequential-logging';
import { WorkerLifecycle } from './worker-lifecycle.js';
import { QueueLoopExecutor } from './queue-loop-executor.js';
import { StatsTracker } from './stats-tracker.js';

export class QueueWorkerPool extends EventEmitter {
  constructor(options = {}) {
    super();
    this.numWorkers = options.numWorkers || 2;
    this.taskQueueManager = null;
    this.backgroundTaskManager = null;
    this.pollInterval = options.pollInterval || 1000;
    this.taskTimeout = options.taskTimeout || 30000;
    this.autoStart = options.autoStart !== false;

    this.workers = [];
    this.lifecycle = new WorkerLifecycle(this.numWorkers, this.pollInterval);
    this.executor = null;
    this.statsTracker = new StatsTracker();

    // Propagate events
    this.lifecycle.on('pool:started', (data) => this.emit('pool:started', data));
    this.lifecycle.on('pool:stopped', (data) => this.emit('pool:stopped', { totalProcessed: this.statsTracker.stats.processed }));
    this.lifecycle.on('worker:error', (data) => this.emit('worker:error', data));
  }

  setDependencies(taskQueueManager, backgroundTaskManager) {
    this.taskQueueManager = taskQueueManager;
    this.backgroundTaskManager = backgroundTaskManager;
    this.executor = new QueueLoopExecutor(taskQueueManager, backgroundTaskManager, this.taskTimeout);
  }

  async start() {
    const onLoop = async (workerId) => {
      const result = await this.executor.executeWorkerIteration(workerId, this.lifecycle.workerStatus, this.pollInterval);
      this.statsTracker.updateWorkerCounts(this.lifecycle.workerStatus);

      if (result?.success) {
        this.statsTracker.recordSucceed();
        this.emit('task:completed', { taskId: result.taskId, workerId, result: result.result });
      } else if (result?.error) {
        this.statsTracker.recordFailed();
        const status = this.taskQueueManager.status(result.taskId);
        if (status && status.retries < status.maxRetries) {
          this.statsTracker.recordRetried();
          this.emit('task:retrying', { taskId: result.taskId, workerId, attempt: status.retries });
        } else {
          this.emit('task:failed', { taskId: result.taskId, workerId, error: result.error.message });
        }
      }
    };

    return this.lifecycle.start(onLoop);
  }

  async stop() {
    return this.lifecycle.stop();
  }

  getStats() {
    return this.statsTracker.getStats(this.lifecycle.isRunning, this.numWorkers, this.lifecycle.workerStatus);
  }

  getWorkerStatus(workerId) {
    return this.lifecycle.getWorkerStatus(workerId);
  }

  getAllWorkerStatus() {
    return this.lifecycle.getAllWorkerStatus();
  }
}

export const queueWorkerPool = new QueueWorkerPool();
