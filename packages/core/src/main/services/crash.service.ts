import { crashReporter, app, dialog, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';

export function initCrashReporter(): void {
  const crashesDir = path.join(app.getPath('userData'), 'crashes');
  if (!fs.existsSync(crashesDir)) {
    fs.mkdirSync(crashesDir, { recursive: true });
  }

  crashReporter.start({
    submitURL: '', // No remote submission; store locally
    productName: '星盘工坊',
    companyName: 'AstrolabeStudio',
    uploadToServer: false,
    compress: true,
  });
}

export function checkForCrashOnStartup(): void {
  const crashesDir = path.join(app.getPath('userData'), 'crashes');
  if (!fs.existsSync(crashesDir)) return;

  try {
    const files = fs.readdirSync(crashesDir);
    const crashFiles = files.filter(f => f.endsWith('.dmp') || f.endsWith('.txt'));
    if (crashFiles.length === 0) return;

    // Show crash notification after main window is ready
    app.whenReady().then(() => {
      setTimeout(() => {
        const win = BrowserWindow.getAllWindows()[0];
        if (!win || win.isDestroyed()) return;

        dialog.showMessageBox(win, {
          type: 'info',
          title: '崩溃报告',
          message: '检测到上次运行时发生了崩溃',
          detail: `发现 ${crashFiles.length} 个崩溃日志，保存在:\n${crashesDir}\n\n您可以将此目录打包发送给开发者以帮助修复问题。`,
          buttons: ['打开崩溃目录', '关闭'],
          defaultId: 0,
        }).then(({ response }) => {
          if (response === 0) {
            const { shell } = require('electron');
            shell.openPath(crashesDir);
          }
        });
      }, 3000);
    });
  } catch {
    // Ignore errors reading crash directory
  }
}
