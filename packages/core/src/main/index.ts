import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './window';
import { registerAllHandlers } from './ipc';
import { initAutoUpdater, checkForUpdatesOnStartup } from './services/update.service';
import { initCrashReporter, checkForCrashOnStartup } from './services/crash.service';

// 固定 app 名称，确保 userData 路径在不同启动方式下一致
app.setName('astrolabe-studio');

// Initialize crash reporter before anything else
initCrashReporter();
checkForCrashOnStartup();

app.whenReady().then(() => {
  registerAllHandlers();
  initAutoUpdater();
  createMainWindow();

  // Check for updates after startup
  checkForUpdatesOnStartup();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
