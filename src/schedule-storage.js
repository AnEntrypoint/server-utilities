// Schedule persistence and loading
import logger from '@sequentialos/sequential-logging';

export class ScheduleStorage {
  constructor(stateManager) {
    this.stateManager = stateManager;
  }

  async persistToStorage(scheduledMap) {
    if (!this.stateManager) return;

    try {
      for (const [id, schedule] of scheduledMap.entries()) {
        await this.stateManager.set('schedules', id, schedule);
      }
    } catch (error) {
      logger.error('[TaskScheduler] Error persisting to storage:', error.message);
    }
  }

  async loadFromStorage() {
    if (!this.stateManager) return new Map();

    try {
      const schedules = await this.stateManager.getAll('schedules');
      const scheduledMap = new Map();

      if (schedules && typeof schedules === 'object') {
        for (const [id, schedule] of Object.entries(schedules)) {
          if (schedule && schedule.id) {
            scheduledMap.set(id, schedule);
          }
        }
      }

      return scheduledMap;
    } catch (error) {
      logger.error('[TaskScheduler] Error loading from storage:', error.message);
      return new Map();
    }
  }
}
