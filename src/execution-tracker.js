// Execution history tracking and statistics
export class ExecutionTracker {
  constructor() {
    this.executionHistory = new Map();
  }

  recordExecution(id, details) {
    if (!this.executionHistory.has(id)) {
      this.executionHistory.set(id, []);
    }

    const history = this.executionHistory.get(id);
    history.push(details);

    // Keep history bounded to 1000 entries per schedule
    if (history.length > 1000) {
      history.shift();
    }
  }

  getExecutionHistory(id, limit = 50) {
    const history = this.executionHistory.get(id) || [];
    return history.slice(-limit);
  }

  getStats(statsObj) {
    return {
      ...statsObj,
      totalHistorySize: Array.from(this.executionHistory.values())
        .reduce((sum, h) => sum + h.length, 0)
    };
  }

  clear() {
    this.executionHistory.clear();
  }
}
