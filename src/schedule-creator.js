// Schedule creation builders for once, recurring, and interval types
export function createOnceSchedule(taskName, args, executeAt, options = {}) {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    type: 'once',
    taskName,
    args: args || [],
    nextRun: executeAt,
    lastRun: null,
    enabled: true,
    createdAt: Date.now(),
    ...options
  };
}

export function createRecurringSchedule(taskName, args, cronExpression, nextCronRun, options = {}) {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    type: 'recurring',
    taskName,
    args: args || [],
    cronExpression,
    nextRun: nextCronRun,
    lastRun: null,
    enabled: true,
    createdAt: Date.now(),
    ...options
  };
}

export function createIntervalSchedule(taskName, args, intervalMs, options = {}) {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();
  return {
    id,
    type: 'interval',
    taskName,
    args: args || [],
    intervalMs,
    nextRun: now + intervalMs,
    lastRun: null,
    enabled: true,
    createdAt: now,
    ...options
  };
}
