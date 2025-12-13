/**
 * task-queue-manager.js - Task Queue Manager Facade
 *
 * Delegates to queue operations and persistence modules
 */

import { EventEmitter } from 'events';
import { QueueOperations } from './queue-operations.js';
import { QueuePersistence } from './queue-persistence.js';

export class TaskQueueManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.queue = new Map();
    this.nextId = 1;
    this.stateManager = null;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelayMs = options.retryDelayMs || 5000;
    this.autoStart = options.autoStart !== false;

    this.operations = new QueueOperations(this.queue);
    this.persistence = null;
  }

  setStateManager(stateManager) {
    this.stateManager = stateManager;
    this.persistence = new QueuePersistence(this.queue, stateManager);
  }

  enqueue(taskName, args = [], options = {}) {
    const id = this.nextId++;
    const task = this.operations.enqueue(id, taskName, args, options, this.maxRetries);
    this.emit('task:enqueued', { id, taskName });
    if (this.autoStart && this.persistence) {
      this.persistence.persistTask(id);
    }
    return { id, status: 'enqueued' };
  }

  dequeue() {
    const result = this.operations.dequeue();
    if (result) {
      this.emit('task:dequeued', { id: result.id });
      if (this.persistence) this.persistence.persistTask(result.id);
    }
    return result;
  }

  complete(id, result) {
    const success = this.operations.complete(id, result);
    if (success) {
      this.emit('task:completed', { id, result });
      if (this.persistence) this.persistence.persistTask(id);
    }
    return success;
  }

  fail(id, error) {
    const failResult = this.operations.fail(id, error, this.retryDelayMs, this.maxRetries);
    if (failResult) {
      if (failResult.shouldRetry) {
        const task = this.queue.get(id);
        setTimeout(() => {
          this.emit('task:retry', { id, retries: task.retries, maxRetries: task.maxRetries });
        }, failResult.delayMs);
      } else {
        const task = this.queue.get(id);
        this.emit('task:failed', { id, error: task.error, retries: task.retries });
      }
      if (this.persistence) this.persistence.persistTask(id);
    }
    return !!failResult;
  }

  status(id) {
    return this.operations.status(id);
  }

  list(filter = {}) {
    return this.operations.list(filter);
  }

  getStats() {
    return this.operations.getStats();
  }

  async loadFromStorage() {
    if (!this.persistence) return;
    const result = await this.persistence.loadFromStorage();
    if (result) {
      this.nextId = result.maxId + 1;
      this.emit('queue:loaded', { count: result.count });
    }
  }

  clear() {
    this.operations.clear();
  }
}

export const taskQueueManager = new TaskQueueManager();
