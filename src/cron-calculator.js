// Cron expression parsing and calculation
import cron from 'node-cron';

export class CronCalculator {
  calculateNextCronRun(cronExpression) {
    if (!cron.validate(cronExpression)) {
      throw new Error('Invalid cron expression format');
    }

    const parts = cronExpression.split(' ');
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setSeconds(0, 0);
    nextRun.setMinutes(nextRun.getMinutes() + 1);

    let found = false;
    let iterations = 0;
    const maxIterations = 1440 * 32;

    while (!found && iterations < maxIterations) {
      if (this.matchesCronExpression(nextRun, minute, hour, dayOfMonth, month, dayOfWeek)) {
        found = true;
      } else {
        nextRun.setMinutes(nextRun.getMinutes() + 1);
      }
      iterations++;
    }

    return found ? nextRun.getTime() : null;
  }

  matchesCronExpression(date, minute, hour, dayOfMonth, month, dayOfWeek) {
    const d = date.getDate();
    const m = date.getMonth() + 1;
    const h = date.getHours();
    const min = date.getMinutes();
    const dow = date.getDay();

    return this.cronPartMatches(min, minute) && this.cronPartMatches(h, hour) &&
           this.cronPartMatches(d, dayOfMonth) && this.cronPartMatches(m, month) &&
           this.cronPartMatches(dow, dayOfWeek);
  }

  cronPartMatches(value, pattern) {
    if (pattern === '*' || pattern === '?') return true;

    if (pattern.includes('/')) {
      const [start, step] = pattern.split('/');
      const startVal = start === '*' ? 0 : parseInt(start);
      const stepVal = parseInt(step);
      return (value - startVal) % stepVal === 0;
    }

    if (pattern.includes(',')) {
      return pattern.split(',').some(p => parseInt(p) === value);
    }

    if (pattern.includes('-')) {
      const [min, max] = pattern.split('-').map(Number);
      return value >= min && value <= max;
    }

    return parseInt(pattern) === value;
  }
}
