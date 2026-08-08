import { Worker } from 'worker_threads';
import path from 'path';
import os from 'os';
import type { ConversionSettings } from '../shared-types';
import type { WorkerJob } from './image-worker';

interface WorkerResult {
  id: string;
  success: boolean;
  outputPath?: string;
  error?: string;
}

interface PoolWorker {
  worker: Worker;
  busy: boolean;
}

export class WorkerPool {
  private workers: PoolWorker[] = [];
  private jobQueue: Array<{ job: WorkerJob; resolve: (result: WorkerResult) => void }> = [];
  private concurrency: number;
  private cancelled = false;

  constructor(concurrency?: number) {
    const cpuCount = os.cpus().length;
    this.concurrency = concurrency && concurrency > 0 ? Math.min(concurrency, cpuCount) : Math.max(1, cpuCount - 1);
  }

  async initialize(): Promise<void> {
    const workerPath = path.join(__dirname, 'image-worker.js');

    for (let i = 0; i < this.concurrency; i++) {
      this.spawnWorker(workerPath);
    }
  }

  private spawnWorker(workerPath: string): void {
    const worker = new Worker(workerPath);
    const poolWorker: PoolWorker = { worker, busy: false };

    worker.on('message', (result: WorkerResult) => {
      poolWorker.busy = false;
      this.processNext();
      // Find and resolve the pending promise for this worker
      // We track via the job assignment
    });

    worker.on('error', () => {
      // Respawn crashed worker
      const idx = this.workers.indexOf(poolWorker);
      if (idx !== -1) {
        this.workers.splice(idx, 1);
        this.spawnWorker(workerPath);
      }
    });

    worker.on('exit', (code) => {
      if (code !== 0 && !this.cancelled) {
        const idx = this.workers.indexOf(poolWorker);
        if (idx !== -1) {
          this.workers.splice(idx, 1);
          this.spawnWorker(workerPath);
        }
      }
    });

    this.workers.push(poolWorker);
  }

  async processJob(job: WorkerJob): Promise<WorkerResult> {
    return new Promise((resolve) => {
      this.jobQueue.push({ job, resolve });
      this.processNext();
    });
  }

  private processNext(): void {
    if (this.cancelled || this.jobQueue.length === 0) return;

    const availableWorker = this.workers.find((w) => !w.busy);
    if (!availableWorker) return;

    const next = this.jobQueue.shift();
    if (!next) return;

    availableWorker.busy = true;

    const messageHandler = (result: WorkerResult) => {
      availableWorker.worker.removeListener('message', messageHandler);
      availableWorker.worker.removeListener('error', errorHandler);
      availableWorker.busy = false;
      next.resolve(result);
      // Process next job after resolving
      setImmediate(() => this.processNext());
    };

    const errorHandler = (err: Error) => {
      availableWorker.worker.removeListener('message', messageHandler);
      availableWorker.worker.removeListener('error', errorHandler);
      availableWorker.busy = false;
      next.resolve({
        id: next.job.id,
        success: false,
        error: err.message || 'Worker crashed',
      });
      setImmediate(() => this.processNext());
    };

    availableWorker.worker.once('message', messageHandler);
    availableWorker.worker.once('error', errorHandler);
    availableWorker.worker.postMessage(next.job);
  }

  cancel(): void {
    this.cancelled = true;
    this.jobQueue = [];
  }

  async destroy(): Promise<void> {
    this.cancelled = true;
    this.jobQueue = [];
    for (const pw of this.workers) {
      await pw.worker.terminate();
    }
    this.workers = [];
  }

  getConcurrency(): number {
    return this.concurrency;
  }
}