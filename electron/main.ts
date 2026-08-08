import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import Store from 'electron-store';
import { ConversionService } from './services/conversion';
import { IPC_CHANNELS } from './shared-types';
import type { ConversionSettings } from './shared-types';

// Persistent settings store
const store = new Store<{
  settings: Partial<ConversionSettings> & { lastOutputFolder?: string };
}>({
  defaults: {
    settings: {
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
      lastOutputFolder: '',
    },
  },
});

let mainWindow: BrowserWindow | null = null;
const conversionService = new ConversionService();

function createWindow(): void {
  // Determine icon path based on environment and platform
  const isDev = !!process.env.VITE_DEV_SERVER_URL;
  let iconPath: string;
  if (process.platform === 'win32') {
    iconPath = isDev
      ? path.join(__dirname, '..', 'resources', 'icons', 'win', 'icon.ico')
      : path.join(process.resourcesPath || path.join(__dirname, '..', 'resources'), 'icons', 'win', 'icon.ico');
  } else if (process.platform === 'darwin') {
    iconPath = isDev
      ? path.join(__dirname, '..', 'resources', 'icons', 'mac', 'icon.icns')
      : path.join(process.resourcesPath || path.join(__dirname, '..', 'resources'), 'icons', 'mac', 'icon.icns');
  } else {
    iconPath = isDev
      ? path.join(__dirname, '..', 'resources', 'icons', 'png', '256x256.png')
      : path.join(process.resourcesPath || path.join(__dirname, '..', 'resources'), 'icons', 'png', '256x256.png');
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'CyrusConvert',
    backgroundColor: '#0a0a0b',
    icon: iconPath,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load dev server or production build
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Supported image extensions for filtering
const IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.avif', '.tiff', '.tif',
  '.bmp', '.gif', '.svg', '.heic', '.heif',
]);

function collectImageFiles(dirPath: string): string[] {
  const files: string[] = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectImageFiles(fullPath));
      } else if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(fullPath);
      }
    }
  } catch {
    // Skip unreadable directories
  }
  return files;
}

function registerIpcHandlers(): void {
  // Select images via file dialog
  ipcMain.handle(IPC_CHANNELS.SELECT_IMAGES, async () => {
    if (!mainWindow) return [];
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'webp', 'avif', 'tiff', 'tif', 'bmp', 'gif', 'svg', 'heic', 'heif'],
        },
      ],
    });
    return result.canceled ? [] : result.filePaths;
  });

  // Select folder and collect all images recursively
  ipcMain.handle(IPC_CHANNELS.SELECT_FOLDER, async () => {
    if (!mainWindow) return [];
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return [];
    return collectImageFiles(result.filePaths[0]);
  });

  // Select output folder
  ipcMain.handle(IPC_CHANNELS.SELECT_OUTPUT_FOLDER, async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Output Folder',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // Get thumbnail for an image
  ipcMain.handle(IPC_CHANNELS.GET_THUMBNAIL, async (_event, filePath: string) => {
    return conversionService.getThumbnail(filePath);
  });

  // Estimate output size for an image with given settings
  ipcMain.handle(
    IPC_CHANNELS.ESTIMATE_OUTPUT_SIZE,
    async (_event, filePath: string, settings: ConversionSettings) => {
      return conversionService.estimateOutputSize(filePath, settings);
    }
  );

  // Get file size
  ipcMain.handle(IPC_CHANNELS.GET_FILE_SIZE, async (_event, filePath: string) => {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  });

  // Start batch conversion
  ipcMain.handle(
    IPC_CHANNELS.START_CONVERSION,
    async (_event, files: string[], settings: ConversionSettings, outputFolder: string) => {
      if (!mainWindow) return;
      // Save last output folder
      store.set('settings.lastOutputFolder', outputFolder);
      await conversionService.startBatch(files, settings, outputFolder, mainWindow);
    }
  );

  // Cancel conversion
  ipcMain.handle(IPC_CHANNELS.CANCEL_CONVERSION, async () => {
    conversionService.cancel();
  });

  // Open output folder in explorer
  ipcMain.handle(IPC_CHANNELS.OPEN_OUTPUT_FOLDER, async (_event, folderPath: string) => {
    shell.openPath(folderPath);
  });

  // Get saved settings
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => {
    return store.get('settings', {});
  });

  // Save settings
  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, async (_event, settings) => {
    store.set('settings', settings);
  });

  // Get CPU count
  ipcMain.handle(IPC_CHANNELS.GET_CPU_COUNT, async () => {
    return os.cpus().length;
  });

  // Open external URL
  ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL, async (_event, url: string) => {
    shell.openExternal(url);
  });

  // Get app version
  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, async () => {
    return app.getVersion();
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  conversionService.cancel();
});