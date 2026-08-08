import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { ConversionSettings, ConversionProgress, CompletionSummary, JobStatus } from './shared-types';
import { IPC_CHANNELS } from './shared-types';

contextBridge.exposeInMainWorld('electronAPI', {
  selectImages: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_IMAGES),
  selectFolder: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_FOLDER),
  selectOutputFolder: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_OUTPUT_FOLDER),
  getThumbnail: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_THUMBNAIL, filePath),
  estimateOutputSize: (filePath: string, settings: ConversionSettings) =>
    ipcRenderer.invoke(IPC_CHANNELS.ESTIMATE_OUTPUT_SIZE, filePath, settings),
  getFileSize: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_FILE_SIZE, filePath),
  startConversion: (files: string[], settings: ConversionSettings, outputFolder: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.START_CONVERSION, files, settings, outputFolder),
  cancelConversion: () => ipcRenderer.invoke(IPC_CHANNELS.CANCEL_CONVERSION),
  openOutputFolder: (folderPath: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_OUTPUT_FOLDER, folderPath),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  saveSettings: (settings: Partial<ConversionSettings> & { lastOutputFolder?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, settings),
  getCpuCount: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CPU_COUNT),
  openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL, url),
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION),

  onProgress: (callback: (progress: ConversionProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: ConversionProgress) => callback(progress);
    ipcRenderer.on(IPC_CHANNELS.ON_PROGRESS, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_PROGRESS, listener);
  },

  onJobUpdate: (callback: (job: { id: string; status: JobStatus; progress: number; error?: string; outputPath?: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, job: { id: string; status: JobStatus; progress: number; error?: string; outputPath?: string }) => callback(job);
    ipcRenderer.on(IPC_CHANNELS.ON_JOB_UPDATE, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_JOB_UPDATE, listener);
  },

  onComplete: (callback: (summary: CompletionSummary) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, summary: CompletionSummary) => callback(summary);
    ipcRenderer.on(IPC_CHANNELS.ON_COMPLETE, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_COMPLETE, listener);
  },

  // Get file paths from File objects (for drag & drop support with contextIsolation)
  getFilePathsFromFiles: (files: File[]): string[] => {
    return files
      .map((file) => webUtils.getPathForFile(file))
      .filter((path) => path !== '');
  },
});
