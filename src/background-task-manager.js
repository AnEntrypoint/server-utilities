import { spawn } from 'child_process';
import path from 'path';
import { EventEmitter } from 'events';
import logger from '@sequentialos/sequential-logging';
import { nowISO, createTimestamps, updateTimestamp } from '@sequentialos/timestamp-utilities';

export class BackgroundTaskManager extends EventEmitter {
  constructor(maxTasks = 1000) {
    super();
    this.processes = new Map();
    this.nextId = 1;
    this.stateManager = null;
    this.maxTasks = maxTasks;
  }

  setStateManager(stateManager) {
    this.stateManager = stateManager;
  }

  spawn(command, args = [], options = {}) {
    if (this.processes.size >= this.maxTasks) {
      const oldest = Array.from(this.processes.values()).reduce((min, task) =>
        task.startTime < min.startTime ? task : min
      );
      this.processes.delete(oldest.id);
      logger.warn(`Removed oldest task ${oldest.id} to respect maxTasks limit`);
    }

    const id = this.nextId++;
    const startTime = Date.now();
    const cwd = options.cwd || process.cwd();
    const env = { ...process.env, ...options.env };

    const childProcess = spawn(command, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: options.detached !== false
    });

    let stdout = '';
    let stderr = '';

    if (childProcess.stdout) {
      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (childProcess.stderr) {
      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    const task = {
      id,
      pid: childProcess.pid,
      command,
      args,
      status: 'running',
      startTime,
      exitCode: null,
      signal: null,
      stdout,
      stderr,
      childProcess,
      progress: {
        percent: 0,
        stage: 'initializing',
        details: '',
        updatedAt: startTime
      }
    };

    childProcess.on('exit', (code, signal) => {
      task.status = code === 0 ? 'completed' : 'failed';
      task.exitCode = code;
      task.signal = signal;
      task.progress.percent = 100;
      task.progress.stage = code === 0 ? 'completed' : 'failed';
      task.progress.updatedAt = Date.now();

      const status = this.status(id);
      this.persistResult(id, status);

      const eventType = code === 0 ? 'task:complete' : 'task:failed';
      this.emit(eventType, status);
    });

    childProcess.on('error', (error) => {
      task.status = 'failed';
      task.error = error.message;
      this.emit('task:failed', this.status(id));
    });

    this.processes.set(id, task);
    this.emit('task:start', { id, pid: childProcess.pid, command, args, startTime });
    return { id, pid: childProcess.pid };
  }

  status(id) {
    const task = this.processes.get(id);
    if (!task) {
      return null;
    }

    const now = Date.now();
    const duration = now - task.startTime;

    return {
      id: task.id,
      pid: task.pid,
      command: task.command,
      args: task.args,
      status: task.status,
      startTime: task.startTime,
      duration,
      exitCode: task.exitCode,
      signal: task.signal,
      error: task.error || null,
      stdoutLength: task.stdout.length,
      stderrLength: task.stderr.length,
      progress: task.progress
    };
  }

  updateProgress(id, percent, stage, details) {
    const task = this.processes.get(id);
    if (!task) {
      return false;
    }

    const progress = {
      percent: Math.min(100, Math.max(0, percent)),
      stage: stage || task.progress.stage,
      details: details || task.progress.details,
      updatedAt: Date.now()
    };

    task.progress = progress;
    this.emit('task:progress', { id, progress });
    return true;
  }

  list() {
    const result = [];
    for (const [id, task] of this.processes) {
      const now = Date.now();
      const duration = now - task.startTime;
      result.push({
        id,
        pid: task.pid,
        command: task.command,
        status: task.status,
        duration,
        startTime: task.startTime,
        progress: task.progress
      });
    }
    return result;
  }

  getOutput(id) {
    const task = this.processes.get(id);
    if (!task) {
      return null;
    }
    return {
      stdout: task.stdout,
      stderr: task.stderr
    };
  }

  kill(id) {
    const task = this.processes.get(id);
    if (!task) {
      return false;
    }

    if (task.status === 'running') {
      try {
        process.kill(-task.pid);
      } catch (e) {
        try {
          task.childProcess.kill();
        } catch (e2) {
          logger.error(`Failed to kill process ${task.pid}:`, e2.message);
        }
      }
      this.emit('task:killed', { id, pid: task.pid, command: task.command });
      return true;
    }

    return false;
  }

  async waitFor(id) {
    const task = this.processes.get(id);
    if (!task) {
      return null;
    }

    if (task.status !== 'running') {
      return this.status(id);
    }

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const taskStatus = this.status(id);
        if (taskStatus && taskStatus.status !== 'running') {
          clearInterval(checkInterval);
          resolve(taskStatus);
        }
      }, 100);
    });
  }

  persistResult(id, status) {
    if (!this.stateManager) {
      return;
    }

    try {
      this.stateManager.set('background-tasks', `task-${id}`, {
        id: status.id,
        pid: status.pid,
        command: status.command,
        args: status.args,
        status: status.status,
        startTime: status.startTime,
        duration: status.duration,
        exitCode: status.exitCode,
        signal: status.signal,
        error: status.error,
        completedAt: Date.now()
      }).catch(err => {
        logger.error(`Failed to persist background task ${id}:`, err.message);
      });
    } catch (err) {
      logger.error(`Error persisting background task ${id}:`, err.message);
    }
  }

  async getHistory(limit = 100) {
    if (!this.stateManager) {
      return [];
    }

    try {
      const all = await this.stateManager.getAll('background-tasks');
      if (!all || typeof all !== 'object') {
        return [];
      }

      return Object.values(all)
        .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
        .slice(0, limit);
    } catch (err) {
      logger.error('Error retrieving background task history:', err.message);
      return [];
    }
  }

  cleanup() {
    for (const [id, task] of this.processes) {
      if (task.status === 'running') {
        this.kill(id);
      }
    }
    this.processes.clear();
  }
}

export const backgroundTaskManager = new BackgroundTaskManager();
