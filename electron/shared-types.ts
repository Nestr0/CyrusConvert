// Shared types between electron main process and renderer
// This file mirrors src/types/index.ts for electron-side usage

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'tiff';

export type ResizeMode = 'contain' | 'cover' | 'fill' | 'inside' | 'outside';

export type OverwritePolicy = 'ask' | 'skip' | 'replace' | 'auto-rename';

export type BackgroundColor = 'transparent' | 'white' | 'black' | string;

export interface ResizeOptions {
  enabled: boolean;
  width: number | null;
  height: number | null;
  lockAspectRatio: boolean;
  mode: ResizeMode;
}

export interface RenameOptions {
  mode: 'keep' | 'suffix' | 'prefix' | 'pattern';
  suffix: string;
  prefix: string;
  pattern: string;
}

export interface ConversionSettings {
  outputFormat: ImageFormat;
  quality: number;
  resize: ResizeOptions;
  backgroundColor: BackgroundColor;
  rename: RenameOptions;
  overwritePolicy: OverwritePolicy;
  concurrency: number;
}

export type JobStatus = 'waiting' | 'converting' | 'completed' | 'failed';

export interface ConversionProgress {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  currentFile: string | null;
  elapsedMs: number;
  estimatedRemainingMs: number | null;
  isConverting: boolean;
}

export interface CompletionSummary {
  totalConverted: number;
  totalFailed: number;
  elapsedMs: number;
  outputFolder: string;
}

export const IPC_CHANNELS = {
  SELECT_IMAGES: 'select-images',
  SELECT_FOLDER: 'select-folder',
  SELECT_OUTPUT_FOLDER: 'select-output-folder',
  GET_THUMBNAIL: 'get-thumbnail',
  ESTIMATE_OUTPUT_SIZE: 'estimate-output-size',
  GET_FILE_SIZE: 'get-file-size',
  START_CONVERSION: 'start-conversion',
  CANCEL_CONVERSION: 'cancel-conversion',
  OPEN_OUTPUT_FOLDER: 'open-output-folder',
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',
  GET_CPU_COUNT: 'get-cpu-count',
  OPEN_EXTERNAL: 'open-external',
  GET_APP_VERSION: 'get-app-version',
  ON_PROGRESS: 'on-progress',
  ON_JOB_UPDATE: 'on-job-update',
  ON_COMPLETE: 'on-complete',
} as const;