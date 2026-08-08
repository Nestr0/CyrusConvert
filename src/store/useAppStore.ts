import { create } from 'zustand';
import type {
  ImageJob,
  ConversionProgress,
  CompletionSummary,
  ConversionSettings,
  JobStatus,
} from '../types';

interface AppState {
  // Queue
  jobs: ImageJob[];
  addJobs: (jobs: ImageJob[]) => void;
  removeJob: (id: string) => void;
  clearJobs: () => void;
  updateJobStatus: (id: string, status: JobStatus, progress: number, error?: string, outputPath?: string) => void;
  updateJobEstimatedSize: (id: string, estimatedSize: number | null) => void;
  updateAllJobsEstimatedSize: (estimates: Map<string, number | null>) => void;

  // Progress
  progress: ConversionProgress;
  setProgress: (progress: ConversionProgress) => void;

  // Completion
  summary: CompletionSummary | null;
  setSummary: (summary: CompletionSummary | null) => void;

  // Settings
  settings: ConversionSettings;
  setSettings: (settings: ConversionSettings) => void;
  updateSettings: (partial: Partial<ConversionSettings>) => void;

  // Output folder
  outputFolder: string;
  setOutputFolder: (folder: string) => void;

  // UI state
  isConverting: boolean;
  setIsConverting: (v: boolean) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

const defaultSettings: ConversionSettings = {
  outputFormat: 'webp',
  quality: 80,
  resize: {
    enabled: false,
    width: null,
    height: null,
    lockAspectRatio: true,
    mode: 'contain',
  },
  backgroundColor: 'transparent',
  rename: {
    mode: 'keep',
    suffix: '',
    prefix: '',
    pattern: '{name}',
  },
  overwritePolicy: 'auto-rename',
  concurrency: 0,
};

const defaultProgress: ConversionProgress = {
  totalFiles: 0,
  completedFiles: 0,
  failedFiles: 0,
  currentFile: null,
  elapsedMs: 0,
  estimatedRemainingMs: null,
  isConverting: false,
};

export const useAppStore = create<AppState>((set) => ({
  jobs: [],
  addJobs: (newJobs) =>
    set((state) => ({ jobs: [...state.jobs, ...newJobs] })),
  removeJob: (id) =>
    set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) })),
  clearJobs: () => set({ jobs: [] }),
  updateJobStatus: (id, status, progress, error, outputPath) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id ? { ...j, status, progress, error, outputPath } : j
      ),
    })),
  updateJobEstimatedSize: (id, estimatedSize) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id ? { ...j, estimatedOutputSize: estimatedSize } : j
      ),
    })),
  updateAllJobsEstimatedSize: (estimates) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        estimates.has(j.id) ? { ...j, estimatedOutputSize: estimates.get(j.id) } : j
      ),
    })),

  progress: defaultProgress,
  setProgress: (progress) => set({ progress }),

  summary: null,
  setSummary: (summary) => set({ summary }),

  settings: defaultSettings,
  setSettings: (settings) => set({ settings }),
  updateSettings: (partial) =>
    set((state) => ({ settings: { ...state.settings, ...partial } })),

  outputFolder: '',
  setOutputFolder: (folder) => set({ outputFolder: folder }),

  isConverting: false,
  setIsConverting: (v) => set({ isConverting: v }),
  isLoading: false,
  setIsLoading: (v) => set({ isLoading: v }),
}));