/**
 * queue-operations.js - Queue operation methods
 *
 * Enqueue, dequeue, complete, and fail task operations
 */

export class QueueOperations {
  constructor(queue) {
    this.queue = queue;
  }

  createTask(id, taskName, args, options, maxRetries) {
    return {
      id,
      taskName,
      args,
      status: 'pending',
      retries: 0,
      maxRetries: options.maxRetries || maxRetries,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      error: null,
      result: null
    };
  }

  enqueue(id, taskName, args, options, maxRetries) {
    const task = this.createTask(id, taskName, args, options, maxRetries);
    this.queue.set(id, task);
    return task;
  }

  dequeue() {
    for (const [id, task] of this.queue) {
      if (task.status === 'pending') {
        task.status = 'processing';
        task.startedAt = Date.now();
        return { id, task };
      }
    }
    return null;
  }

  complete(id, result) {
    const task = this.queue.get(id);
    if (!task) return false;
    task.status = 'completed';
    task.result = result;
    task.completedAt = Date.now();
    return true;
  }

  fail(id, error, retryDelayMs, maxRetries) {
    const task = this.queue.get(id);
    if (!task) return false;
    task.error = error.message || String(error);
    task.retries++;
    if (task.retries < task.maxRetries) {
      task.status = 'pending';
      return { shouldRetry: true, delayMs: retryDelayMs };
    } else {
      task.status = 'failed';
      task.completedAt = Date.now();
      return { shouldRetry: false };
    }
  }

  status(id) {
    return this.queue.get(id) || null;
  }

  list(filter = {}) {
    const results = [];
    for (const [id, task] of this.queue) {
      if (filter.status && task.status !== filter.status) continue;
      if (filter.taskName && task.taskName !== filter.taskName) continue;
      results.push({ id, ...task });
    }
    return results;
  }

  getStats() {
    const stats = { total: this.queue.size, pending: 0, processing: 0, completed: 0, failed: 0, retriedCount: 0 };
    for (const task of this.queue.values()) {
      stats[task.status]++;
      if (task.retries > 0) stats.retriedCount++;
    }
    return stats;
  }

  clear() {
    this.queue.clear();
  }
}
