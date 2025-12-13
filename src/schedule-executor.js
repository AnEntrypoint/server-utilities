// Schedule execution and checking logic
export class ScheduleExecutor {
  constructor(taskQueueManager, stats, recordExecutionFn, emit) {
    this.taskQueueManager = taskQueueManager;
    this.stats = stats;
    this.recordExecutionFn = recordExecutionFn;
    this.emit = emit;
  }

  checkDueSchedules(scheduledMap) {
    const now = Date.now();

    for (const [id, schedule] of scheduledMap.entries()) {
      if (!schedule.enabled) continue;

      if (this.shouldExecuteSchedule(schedule, now)) {
        this.executeSchedule(id, schedule, now, scheduledMap);
      }
    }
  }

  shouldExecuteSchedule(schedule, now) {
    if (!schedule.nextRun) return false;
    if (schedule.nextRun > now) return false;
    return true;
  }

  async executeSchedule(id, schedule, now, scheduledMap) {
    try {
      if (!this.taskQueueManager) return;

      const queueResult = this.taskQueueManager.enqueue(
        schedule.taskName,
        schedule.args || [],
        {
          scheduledId: id,
          scheduledAt: schedule.createdAt,
          executedAt: now
        }
      );

      schedule.lastRun = now;
      schedule.lastQueueId = queueResult.id;

      this.recordExecutionFn(id, { status: 'enqueued', queueId: queueResult.id, timestamp: now });

      if (schedule.type === 'once') {
        schedule.enabled = false;
      }

      this.stats.executed++;
      this.emit('schedule:executed', { id, taskName: schedule.taskName, timestamp: now });

    } catch (error) {
      this.stats.failed++;
      this.recordExecutionFn(id, { status: 'failed', error: error.message, timestamp: now });
      this.emit('schedule:error', { id, error: error.message });
    }
  }

  calculateNextRun(schedule, calculateNextCronRunFn) {
    if (schedule.type === 'interval') {
      schedule.nextRun = Date.now() + schedule.intervalMs;
    } else if (schedule.type === 'recurring') {
      schedule.nextRun = calculateNextCronRunFn(schedule.cronExpression);
    }
  }
}
