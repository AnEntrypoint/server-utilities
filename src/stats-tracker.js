/**
 * stats-tracker.js
 *
 * Worker pool statistics tracking and reporting
 */

export class StatsTracker {
  constructor() {
    this.stats = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      retried: 0,
      workersActive: 0,
      workersIdle: 0
    };
  }

  recordSucceed() {
    this.stats.succeeded++;
    this.stats.processed++;
  }

  recordFailed() {
    this.stats.failed++;
    this.stats.processed++;
  }

  recordRetried() {
    this.stats.retried++;
  }

  updateWorkerCounts(workerStatus) {
    let active = 0;
    let idle = 0;

    for (const status of workerStatus.values()) {
      if (status.state === 'active') active++;
      else idle++;
    }

    this.stats.workersActive = active;
    this.stats.workersIdle = idle;
  }

  getStats(isRunning, numWorkers, workerStatus) {
    return {
      ...this.stats,
      isRunning,
      numWorkers,
      workers: Array.from(workerStatus.entries()).map(([id, status]) => ({
        id,
        ...status
      }))
    };
  }

  reset() {
    this.stats = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      retried: 0,
      workersActive: 0,
      workersIdle: 0
    };
  }
}
