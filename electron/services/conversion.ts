import { BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import crypto from 'crypto';
import { WorkerPool } from '../workers/pool';
import type { ConversionSettings, ConversionProgress, CompletionSummary, JobStatus } from '../shared-types';
import { IPC_CHANNELS } from '../shared-types';
import type { WorkerJob } from '../workers/image-worker';

interface JobInfo {
  id: string;
  filePath: string;
  status: JobStatus;
}

export class ConversionService {
  private pool: WorkerPool | null = null;
  private cancelled = false;
  private jobs: Map<string, JobInfo> = new Map();
  private startTime = 0;
  private completedCount = 0;
  private failedCount = 0;
  private totalFiles = 0;
  private outputFolder = '';

  async startBatch(
    files: string[],
    settings: ConversionSettings,
    outputFolder: string,
    window: BrowserWindow
  ): Promise<void> {
    this.cancelled = false;
    this.jobs.clear();
    this.completedCount = 0;
    this.failedCount = 0;
    this.totalFiles = files.length;
    this.startTime = Date.now();
    this.outputFolder = outputFolder;

    // Ensure output folder exists
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    // Initialize worker pool
    this.pool = new WorkerPool(settings.concurrency);
    await this.pool.initialize();

    // Create job entries
    const jobEntries: Array<{ id: string; filePath: string }> = [];
    for (const filePath of files) {
      const id = crypto.randomUUID();
      this.jobs.set(id, { id, filePath, status: 'waiting' });
      jobEntries.push({ id, filePath });
    }

    // Send initial progress
    this.sendProgress(window);

    // Process all jobs concurrently via the pool
    const promises = jobEntries.map(async (entry, index) => {
      if (this.cancelled) return;

      // Mark as converting
      this.updateJobStatus(entry.id, 'converting', 0, window);

      const job: WorkerJob = {
        id: entry.id,
        filePath: entry.filePath,
        outputFolder,
        settings,
        index,
      };

      try {
        const result = await this.pool!.processJob(job);

        if (result.success) {
          this.completedCount++;
          this.updateJobStatus(entry.id, 'completed', 100, window, undefined, result.outputPath);
        } else {
          this.failedCount++;
          this.updateJobStatus(entry.id, 'failed', 0, window, result.error);
        }
      } catch (err) {
        this.failedCount++;
        this.updateJobStatus(
          entry.id,
          'failed',
          0,
          window,
          err instanceof Error ? err.message : 'Unknown error'
        );
      }

      this.sendProgress(window);
    });

    await Promise.allSettled(promises);

    // Send completion summary
    if (!this.cancelled) {
      const summary: CompletionSummary = {
        totalConverted: this.completedCount,
        totalFailed: this.failedCount,
        elapsedMs: Date.now() - this.startTime,
        outputFolder,
      };

      if (!window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.ON_COMPLETE, summary);
      }
    }

    // Cleanup pool
    await this.pool?.destroy();
    this.pool = null;
  }

  cancel(): void {
    this.cancelled = true;
    this.pool?.cancel();
  }

  private updateJobStatus(
    id: string,
    status: JobStatus,
    progress: number,
    window: BrowserWindow,
    error?: string,
    outputPath?: string
  ): void {
    const job = this.jobs.get(id);
    if (job) {
      job.status = status;
    }

    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.ON_JOB_UPDATE, {
        id,
        status,
        progress,
        error,
        outputPath,
      });
    }
  }

  private sendProgress(window: BrowserWindow): void {
    const elapsed = Date.now() - this.startTime;
    const processed = this.completedCount + this.failedCount;
    const remaining = this.totalFiles - processed;

    let estimatedRemaining: number | null = null;
    if (processed > 0 && remaining > 0) {
      const avgTimePerFile = elapsed / processed;
      estimatedRemaining = Math.round(avgTimePerFile * remaining);
    }

    const currentJob = Array.from(this.jobs.values()).find((j) => j.status === 'converting');

    const progress: ConversionProgress = {
      totalFiles: this.totalFiles,
      completedFiles: this.completedCount,
      failedFiles: this.failedCount,
      currentFile: currentJob ? path.basename(currentJob.filePath) : null,
      elapsedMs: elapsed,
      estimatedRemainingMs: estimatedRemaining,
      isConverting: !this.cancelled && processed < this.totalFiles,
    };

    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.ON_PROGRESS, progress);
    }
  }

  async getThumbnail(filePath: string): Promise<string> {
    try {
      const buffer = await sharp(filePath, { failOn: 'none', density: 72 })
        .resize(150, 150, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 60 })
        .toBuffer();
      return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    } catch {
      return '';
    }
  }

  async getImageMetadata(filePath: string): Promise<{ width: number; height: number } | null> {
    try {
      const metadata = await sharp(filePath, { failOn: 'none' }).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
      };
    } catch {
      return null;
    }
  }

  async estimateOutputSize(filePath: string, settings: ConversionSettings): Promise<number | null> {
    try {
      // Get original image metadata
      const metadata = await sharp(filePath, { failOn: 'none' }).metadata();
      if (!metadata.width || !metadata.height) return null;

      let pipeline = sharp(filePath, { failOn: 'none', density: 72 });

      // Apply resize if enabled (use smaller dimensions for faster estimation)
      if (settings.resize.enabled && (settings.resize.width || settings.resize.height)) {
        const resizeOpts: sharp.ResizeOptions = {
          fit: settings.resize.mode,
          withoutEnlargement: false,
        };

        if (settings.resize.width) resizeOpts.width = settings.resize.width;
        if (settings.resize.height) resizeOpts.height = settings.resize.height;

        pipeline = pipeline.resize(resizeOpts);
      } else {
        // For estimation, resize to a small sample size to speed up processing
        pipeline = pipeline.resize(200, 200, { fit: 'inside', withoutEnlargement: true });
      }

      // Apply format-specific options
      switch (settings.outputFormat) {
        case 'png':
          pipeline = pipeline.png({ quality: settings.quality, compressionLevel: 9 });
          break;
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality: settings.quality, mozjpeg: true });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality: settings.quality, effort: 1 });
          break;
        case 'avif':
          pipeline = pipeline.avif({ quality: settings.quality, effort: 1 });
          break;
        case 'tiff':
          pipeline = pipeline.tiff({ quality: settings.quality, compression: 'lzw' });
          break;
      }

      const buffer = await pipeline.toBuffer();
      const sampleSize = buffer.length;

      // Calculate scaling factor based on actual vs sample dimensions
      let targetWidth = metadata.width;
      let targetHeight = metadata.height;

      if (settings.resize.enabled && (settings.resize.width || settings.resize.height)) {
        if (settings.resize.width) targetWidth = settings.resize.width;
        if (settings.resize.height) targetHeight = settings.resize.height;
        
        // Account for aspect ratio preservation
        if (settings.resize.lockAspectRatio) {
          const aspectRatio = metadata.width / metadata.height;
          if (settings.resize.width && !settings.resize.height) {
            targetHeight = Math.round(settings.resize.width / aspectRatio);
          } else if (!settings.resize.width && settings.resize.height) {
            targetWidth = Math.round(settings.resize.height * aspectRatio);
          } else if (settings.resize.width && settings.resize.height) {
            // Use the limiting dimension based on mode
            const widthRatio = settings.resize.width / metadata.width;
            const heightRatio = settings.resize.height / metadata.height;
            if (settings.resize.mode === 'contain' || settings.resize.mode === 'inside') {
              const ratio = Math.min(widthRatio, heightRatio);
              targetWidth = Math.round(metadata.width * ratio);
              targetHeight = Math.round(metadata.height * ratio);
            } else if (settings.resize.mode === 'cover' || settings.resize.mode === 'outside') {
              const ratio = Math.max(widthRatio, heightRatio);
              targetWidth = Math.round(metadata.width * ratio);
              targetHeight = Math.round(metadata.height * ratio);
            }
          }
        }
      }

      // Estimate based on pixel ratio and compression characteristics
      const samplePixels = 200 * 200; // Approximate sample pixels
      const targetPixels = targetWidth * targetHeight;
      const pixelRatio = targetPixels / samplePixels;

      // Apply format-specific compression estimation factors
      let compressionFactor = 1.0;
      switch (settings.outputFormat) {
        case 'png':
          compressionFactor = 0.8 + (settings.quality / 500); // PNG is less affected by quality
          break;
        case 'jpeg':
          compressionFactor = 0.3 + (settings.quality / 150);
          break;
        case 'webp':
          compressionFactor = 0.25 + (settings.quality / 200);
          break;
        case 'avif':
          compressionFactor = 0.2 + (settings.quality / 250);
          break;
        case 'tiff':
          compressionFactor = 1.2; // TIFF with LZW can be larger
          break;
      }

      // Calculate estimated size
      const estimatedSize = Math.round(sampleSize * pixelRatio * compressionFactor);

      return Math.max(estimatedSize, 1024); // Minimum 1KB
    } catch {
      return null;
    }
  }
}
