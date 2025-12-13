/**
 * queue-loop-executor.js
 *
 * Queue task execution and dequeue operations
 */

export class QueueLoopExecutor {
  constructor(taskQueueManager, backgroundTaskManager, taskTimeout) {
    this.taskQueueManager = taskQueueManager;
    this.backgroundTaskManager = backgroundTaskManager;
    this.taskTimeout = taskTimeout;
  }

  async executeWorkerIteration(workerId, workerStatus, pollInterval) {
    const status = workerStatus.get(workerId);
    if (!status) return;

    // Mark as active
    workerStatus.set(workerId, {
      ...status,
      state: 'active',
      lastActivity: Date.now()
    });

    const dequeued = this.taskQueueManager.dequeue();

    if (!dequeued) {
      // Mark as idle
      workerStatus.set(workerId, {
        ...status,
        state: 'idle'
      });
      await new Promise(r => setTimeout(r, pollInterval));
      return;
    }

    const { id, task } = dequeued;
    workerStatus.set(workerId, {
      ...status,
      currentTask: id,
      taskName: task.taskName
    });

    try {
      const result = await this.backgroundTaskManager.executeTask(
        task.taskName,
        task.args,
        { taskId: id, timeout: this.taskTimeout }
      );

      this.taskQueueManager.complete(id, result);
      const updatedStatus = workerStatus.get(workerId);
      workerStatus.set(workerId, {
        ...updatedStatus,
        currentTask: null,
        processed: (updatedStatus.processed || 0) + 1
      });

      return { success: true, taskId: id, result };
    } catch (error) {
      this.taskQueueManager.fail(id, error);
      const updatedStatus = workerStatus.get(workerId);
      workerStatus.set(workerId, {
        ...updatedStatus,
        currentTask: null,
        failed: (updatedStatus.failed || 0) + 1
      });

      return { success: false, taskId: id, error };
    }
  }
}
