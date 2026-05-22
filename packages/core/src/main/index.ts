import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './window';
import { registerAllHandlers } from './ipc';

// 固定 app 名称，确保 userData 路径在不同启动方式下一致
app.setName('astrolabe-studio');

app.whenReady().then(() => {
  registerAllHandlers();
  createMainWindow();

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
