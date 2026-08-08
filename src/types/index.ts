// Supported input/output formats
export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'tiff';

export const INPUT_FORMATS = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'tiff', 'bmp', 'gif', 'svg', 'heic'] as const;
export const OUTPUT_FORMATS: ImageFormat[] = ['png', 'jpeg', 'webp', 'avif', 'tiff'];

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
  pattern: string; // e.g., "product-{index}"
}

export interface ConversionSettings {
  outputFormat: ImageFormat;
  quality: number;
  resize: ResizeOptions;
  backgroundColor: BackgroundColor;
  rename: RenameOptions;
  overwritePolicy: OverwritePolicy;
  concurrency: number; // 0 = auto (CPU cores - 1)
}

export type JobStatus = 'waiting' | 'converting' | 'completed' | 'failed';

export interface ImageJob {
  id: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  status: JobStatus;
  progress: number;
  error?: string;
  outputPath?: string;
  thumbnail?: string;
  estimatedOutputSize?: number | null;
}

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

// IPC Channel names
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
  // Events from main to renderer
  ON_PROGRESS: 'on-progress',
  ON_JOB_UPDATE: 'on-job-update',
  ON_COMPLETE: 'on-complete',
} as const;

// Electron API exposed via preload
export interface ElectronAPI {
  selectImages(): Promise<string[]>;
  selectFolder(): Promise<string[]>;
  selectOutputFolder(): Promise<string | null>;
  getThumbnail(filePath: string): Promise<string>;
  estimateOutputSize(filePath: string, settings: ConversionSettings): Promise<number | null>;
  getFileSize(filePath: string): Promise<number>;
  startConversion(files: string[], settings: ConversionSettings, outputFolder: string): Promise<void>;
  cancelConversion(): Promise<void>;
  openOutputFolder(folderPath: string): Promise<void>;
  getSettings(): Promise<Partial<ConversionSettings> & { lastOutputFolder?: string; language?: string }>;
  saveSettings(settings: Partial<ConversionSettings> & { lastOutputFolder?: string; language?: string }): Promise<void>;
  getCpuCount(): Promise<number>;
  openExternal(url: string): Promise<void>;
  getAppVersion(): Promise<string>;
  onProgress(callback: (progress: ConversionProgress) => void): () => void;
  onJobUpdate(callback: (job: { id: string; status: JobStatus; progress: number; error?: string; outputPath?: string }) => void): () => void;
  onComplete(callback: (summary: CompletionSummary) => void): () => void;
  // Get file paths from File objects (for drag & drop with contextIsolation)
  getFilePathsFromFiles(files: File[]): string[];
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}