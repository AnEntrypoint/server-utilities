// Facade maintaining 100% backward compatibility with task scheduler
import { EventEmitter } from 'events';
import { createOnceSchedule, createRecurringSchedule, createIntervalSchedule } from './schedule-creator.js';
import { CronCalculator } from './cron-calculator.js';
import { ScheduleExecutor } from './schedule-executor.js';
import { ScheduleStorage } from './schedule-storage.js';
import { ScheduleOperations } from './schedule-operations.js';
import { ExecutionTracker } from './execution-tracker.js';
import { CheckLoopManager } from './check-loop-manager.js';

export class TaskScheduler extends EventEmitter {
  constructor(options = {}) {
    super();
    this.taskQueueManager = null;
    this.stateManager = null;
    this.maxScheduled = options.maxScheduled || 1000;
    this.timezone = options.timezone || 'UTC';

    this.scheduled = new Map();
    this.isRunning = false;
    this.stats = {
      total: 0,
      executed: 0,
      failed: 0,
      active: 0,
      cancelled: 0
    };

    this.cronCalculator = new CronCalculator();
    this.scheduleStorage = new ScheduleStorage(this.stateManager);
    this.scheduleExecutor = new ScheduleExecutor(
      this.taskQueueManager,
      this.stats,
      this.recordExecution.bind(this),
      this.emit.bind(this)
    );

    // Delegate operations to focused modules
    this.operations = new ScheduleOperations(this.scheduled, this.stats, this.emit.bind(this));
    this.tracker = new ExecutionTracker();
    this.checkLoopManager = new CheckLoopManager(options.checkInterval || 1000);
  }

  setDependencies(taskQueueManager, stateManager) {
    this.taskQueueManager = taskQueueManager;
    this.stateManager = stateManager;
    this.scheduleStorage = new ScheduleStorage(stateManager);
    this.scheduleExecutor = new ScheduleExecutor(
      taskQueueManager,
      this.stats,
      this.recordExecution.bind(this),
      this.emit.bind(this)
    );
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    if (this.stateManager) {
      await this.loadFromStorage();
    }

    this.checkLoopManager.startCheckLoop(this.scheduleExecutor, this.scheduled);
    this.emit('scheduler:started', { total: this.scheduled.size });
  }

  async stop() {
    if (!this.isRunning) return;
    this.isRunning = false;

    this.checkLoopManager.stopCheckLoop();

    if (this.stateManager) {
      await this.persistToStorage();
    }

    this.emit('scheduler:stopped', { totalExecuted: this.stats.executed });
  }

  scheduleOnce(taskName, args, executeAt, options = {}) {
    if (this.operations.isAtCapacity(this.maxScheduled)) {
      throw new Error(`Cannot schedule: limit of ${this.maxScheduled} reached`);
    }

    const schedule = createOnceSchedule(taskName, args, executeAt, options);
    return this.operations.addSchedule(schedule, 'once', { executeAt });
  }

  scheduleRecurring(taskName, args, cronExpression, options = {}) {
    if (this.operations.isAtCapacity(this.maxScheduled)) {
      throw new Error(`Cannot schedule: limit of ${this.maxScheduled} reached`);
    }

    const nextRun = this.cronCalculator.calculateNextCronRun(cronExpression);
    const schedule = createRecurringSchedule(taskName, args, cronExpression, nextRun, options);
    return this.operations.addSchedule(schedule, 'recurring', { cronExpression });
  }

  scheduleInterval(taskName, args, intervalMs, options = {}) {
    if (this.operations.isAtCapacity(this.maxScheduled)) {
      throw new Error(`Cannot schedule: limit of ${this.maxScheduled} reached`);
    }

    const schedule = createIntervalSchedule(taskName, args, intervalMs, options);
    return this.operations.addSchedule(schedule, 'interval', { intervalMs });
  }

  cancel(id) {
    return this.operations.cancel(id);
  }

  update(id, options) {
    return this.operations.update(id, options);
  }

  getSchedule(id) {
    return this.operations.getSchedule(id);
  }

  getAllSchedules() {
    return this.operations.getAllSchedules();
  }

  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      checkInterval: this.checkLoopManager.getCheckInterval(),
      maxScheduled: this.maxScheduled,
      scheduled: this.operations.getScheduleCount()
    };
  }

  recordExecution(id, details) {
    return this.tracker.recordExecution(id, details);
  }

  getExecutionHistory(id, limit = 50) {
    return this.tracker.getExecutionHistory(id, limit);
  }

  async persistToStorage() {
    await this.scheduleStorage.persistToStorage(this.scheduled);
  }

  async loadFromStorage() {
    const loaded = await this.scheduleStorage.loadFromStorage();
    this.scheduled = loaded;
  }
}

export const taskScheduler = new TaskScheduler();
