import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import { BrowserWindow, app } from 'electron';
import { ipcMain } from 'electron';

let updateAvailable = false;
let updateDownloaded = false;

function sendToRenderer(channel: string, ...args: unknown[]): void {
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, ...args);
  }
}

export function initAutoUpdater(): void {
  // Disable auto-download; let user decide
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    sendToRenderer('update:status', 'checking');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    updateAvailable = true;
    sendToRenderer('update:status', 'available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: (info.releaseNotes as string) || '',
    });
  });

  autoUpdater.on('update-not-available', () => {
    sendToRenderer('update:status', 'not-available');
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    sendToRenderer('update:progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', () => {
    updateDownloaded = true;
    sendToRenderer('update:status', 'downloaded');
  });

  autoUpdater.on('error', (err: Error) => {
    sendToRenderer('update:status', 'error', err.message);
  });

  // Register IPC handlers for renderer to control updates
  ipcMain.handle('update:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { hasUpdate: !!result?.updateInfo };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle('update:install', () => {
    if (updateDownloaded) {
      autoUpdater.quitAndInstall(false, true);
    }
  });

  ipcMain.handle('update:status', () => ({
    updateAvailable,
    updateDownloaded,
    version: app.getVersion(),
  }));
}

export function checkForUpdatesOnStartup(): void {
  // Check 5s after startup to avoid slowing down initial load
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Silent fail on startup check
    });
  }, 5000);
}
