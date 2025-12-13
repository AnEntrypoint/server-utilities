// Schedule CRUD operations
export class ScheduleOperations {
  constructor(scheduled, stats, emit) {
    this.scheduled = scheduled;
    this.stats = stats;
    this.emit = emit;
  }

  addSchedule(schedule, scheduleType, metadata = {}) {
    this.scheduled.set(schedule.id, schedule);
    this.stats.total++;

    const eventData = {
      id: schedule.id,
      type: scheduleType,
      ...metadata
    };

    this.emit('schedule:created', eventData);
    return { id: schedule.id, status: 'scheduled' };
  }

  cancel(id) {
    const schedule = this.scheduled.get(id);
    if (!schedule) {
      return { success: false, error: 'Schedule not found' };
    }

    schedule.enabled = false;
    this.stats.cancelled++;

    this.emit('schedule:cancelled', { id });
    return { success: true, id };
  }

  update(id, options) {
    const schedule = this.scheduled.get(id);
    if (!schedule) {
      return { success: false, error: 'Schedule not found' };
    }

    Object.assign(schedule, options);
    this.emit('schedule:updated', { id, options });
    return { success: true, id };
  }

  getSchedule(id) {
    return this.scheduled.get(id) || null;
  }

  getAllSchedules() {
    return Array.from(this.scheduled.values()).map(s => ({
      id: s.id,
      type: s.type,
      taskName: s.taskName,
      nextRun: s.nextRun,
      lastRun: s.lastRun,
      enabled: s.enabled,
      createdAt: s.createdAt
    }));
  }

  isAtCapacity(maxScheduled) {
    return this.scheduled.size >= maxScheduled;
  }

  getScheduleCount() {
    return this.scheduled.size;
  }
}
