import { parentPort } from 'worker_threads';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import type { ConversionSettings, ImageFormat, BackgroundColor } from '../shared-types';

export interface WorkerJob {
  id: string;
  filePath: string;
  outputFolder: string;
  settings: ConversionSettings;
  index: number;
}

interface WorkerResult {
  id: string;
  success: boolean;
  outputPath?: string;
  error?: string;
}

function getOutputFilename(
  originalName: string,
  format: ImageFormat,
  rename: ConversionSettings['rename'],
  index: number
): string {
  const ext = format === 'jpeg' ? 'jpg' : format;
  const baseName = path.basename(originalName, path.extname(originalName));

  switch (rename.mode) {
    case 'suffix':
      return `${baseName}${rename.suffix}.${ext}`;
    case 'prefix':
      return `${rename.prefix}${baseName}.${ext}`;
    case 'pattern': {
      const pattern = rename.pattern
        .replace('{name}', baseName)
        .replace('{index}', String(index + 1).padStart(3, '0'))
        .replace('{ext}', ext);
      return pattern.endsWith(`.${ext}`) ? pattern : `${pattern}.${ext}`;
    }
    case 'keep':
    default:
      return `${baseName}.${ext}`;
  }
}

function resolveBackground(bg: BackgroundColor): { background: sharp.Color } | undefined {
  if (bg === 'transparent') return undefined;
  if (bg === 'white') return { background: { r: 255, g: 255, b: 255, alpha: 1 } };
  if (bg === 'black') return { background: { r: 0, g: 0, b: 0, alpha: 1 } };
  // Custom hex color
  if (typeof bg === 'string' && bg.startsWith('#')) {
    const hex = bg.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { background: { r, g, b, alpha: 1 } };
  }
  return undefined;
}

async function processImage(job: WorkerJob): Promise<WorkerResult> {
  try {
    const { filePath, outputFolder, settings, index } = job;
    const outputFilename = getOutputFilename(
      path.basename(filePath),
      settings.outputFormat,
      settings.rename,
      index
    );

    let outputPath = path.join(outputFolder, outputFilename);

    // Handle overwrite policy
    if (fs.existsSync(outputPath)) {
      switch (settings.overwritePolicy) {
        case 'skip':
          return { id: job.id, success: true, outputPath };
        case 'auto-rename': {
          const ext = path.extname(outputFilename);
          const base = path.basename(outputFilename, ext);
          let counter = 1;
          while (fs.existsSync(outputPath)) {
            outputPath = path.join(outputFolder, `${base}_${counter}${ext}`);
            counter++;
          }
          break;
        }
        case 'replace':
          // Just overwrite
          break;
        case 'ask':
        default:
          // Default to replace for batch processing
          break;
      }
    }

    let pipeline = sharp(filePath, { failOn: 'none', density: 300 });

    // Apply resize if enabled
    if (settings.resize.enabled && (settings.resize.width || settings.resize.height)) {
      const resizeOpts: sharp.ResizeOptions = {
        fit: settings.resize.mode,
        withoutEnlargement: false,
      };

      if (settings.resize.width) resizeOpts.width = settings.resize.width;
      if (settings.resize.height) resizeOpts.height = settings.resize.height;

      const bgOpts = resolveBackground(settings.backgroundColor);
      if (bgOpts) resizeOpts.background = bgOpts.background;

      pipeline = pipeline.resize(resizeOpts);
    }

    // Flatten with background color for formats that don't support transparency
    const needsFlatten = ['jpeg', 'tiff'].includes(settings.outputFormat);
    if (needsFlatten && settings.backgroundColor !== 'transparent') {
      const bgOpts = resolveBackground(settings.backgroundColor);
      if (bgOpts) {
        pipeline = pipeline.flatten(bgOpts);
      } else {
        pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255, alpha: 1 } });
      }
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
        pipeline = pipeline.webp({ quality: settings.quality, effort: 4 });
        break;
      case 'avif':
        pipeline = pipeline.avif({ quality: settings.quality, effort: 4 });
        break;
      case 'tiff':
        pipeline = pipeline.tiff({ quality: settings.quality, compression: 'lzw' });
        break;
    }

    await pipeline.toFile(outputPath);

    return { id: job.id, success: true, outputPath };
  } catch (err) {
    return {
      id: job.id,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error during conversion',
    };
  }
}

// Listen for messages from the main thread
parentPort?.on('message', async (job: WorkerJob) => {
  const result = await processImage(job);
  parentPort?.postMessage(result);
});