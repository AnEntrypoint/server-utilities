/**
 * worker-lifecycle.js
 *
 * Worker pool lifecycle management (start, stop, loops)
 */

import { EventEmitter } from 'events';
import logger from '@sequentialos/sequential-logging';

export class WorkerLifecycle extends EventEmitter {
  constructor(numWorkers, pollInterval) {
    super();
    this.numWorkers = numWorkers;
    this.pollInterval = pollInterval;
    this.isRunning = false;
    this.workerStatus = new Map();
  }

  async start(onLoop) {
    if (this.isRunning) return;
    this.isRunning = true;

    for (let i = 0; i < this.numWorkers; i++) {
      this.workerStatus.set(i, { state: 'idle', currentTask: null, processed: 0, failed: 0 });
      this.startWorkerLoop(i, onLoop);
    }

    this.emit('pool:started', { numWorkers: this.numWorkers });
  }

  async stop() {
    if (!this.isRunning) return;
    this.isRunning = false;

    await new Promise(resolve => {
      if (!this.workerStatus.size) return resolve();

      let completed = 0;
      this.workerStatus.forEach(() => {
        setImmediate(() => {
          completed++;
          if (completed === this.workerStatus.size) resolve();
        });
      });
    });

    this.emit('pool:stopped', {});
  }

  startWorkerLoop(workerId, onLoop) {
    const loop = async () => {
      if (!this.isRunning) return;

      try {
        await onLoop(workerId, this.workerStatus);
        return loop();
      } catch (error) {
        logger.error(`[WorkerPool] Worker ${workerId} error:`, error.message);
        this.emit('worker:error', { workerId, error: error.message });
        await new Promise(r => setTimeout(r, this.pollInterval));
        return loop();
      }
    };

    loop();
  }

  getWorkerStatus(workerId) {
    return this.workerStatus.get(workerId) || null;
  }

  getAllWorkerStatus() {
    return Array.from(this.workerStatus.entries()).map(([id, status]) => ({
      id,
      ...status
    }));
  }

  setWorkerStatus(workerId, status) {
    const current = this.workerStatus.get(workerId);
    this.workerStatus.set(workerId, { ...current, ...status });
  }
}
