/**
 * queue-persistence.js - Queue storage and persistence
 *
 * Load and save queue state to storage
 */

import logger from '@sequentialos/sequential-logging';

export class QueuePersistence {
  constructor(queue, stateManager) {
    this.queue = queue;
    this.stateManager = stateManager;
  }

  async loadFromStorage() {
    if (!this.stateManager) return;

    try {
      const saved = await this.stateManager.get('queue', 'tasks');
      if (!saved) return;

      let maxId = 0;
      for (const [id, task] of Object.entries(saved)) {
        this.queue.set(parseInt(id), task);
        maxId = Math.max(maxId, parseInt(id));
      }

      return { count: this.queue.size, maxId };
    } catch (e) {
      logger.error('[TaskQueueManager] Error loading queue from storage:', e.message);
    }
  }

  persistTask(id) {
    if (!this.stateManager) return;

    try {
      const task = this.queue.get(id);
      if (task) {
        this.stateManager.set('queue', 'tasks', Object.fromEntries(this.queue));
      }
    } catch (e) {
      logger.error(`[TaskQueueManager] Error persisting task ${id}:`, e.message);
    }
  }
}
