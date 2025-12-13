// Check loop lifecycle management
export class CheckLoopManager {
  constructor(checkInterval = 1000) {
    this.checkInterval = checkInterval;
    this.checkLoop = null;
  }

  startCheckLoop(executor, scheduled) {
    this.checkLoop = setInterval(() => {
      executor.checkDueSchedules(scheduled);
    }, this.checkInterval);
  }

  stopCheckLoop() {
    if (this.checkLoop) {
      clearInterval(this.checkLoop);
      this.checkLoop = null;
    }
  }

  isRunning() {
    return this.checkLoop !== null;
  }

  updateInterval(newInterval) {
    this.checkInterval = newInterval;
    if (this.checkLoop) {
      this.stopCheckLoop();
    }
  }

  getCheckInterval() {
    return this.checkInterval;
  }
}
