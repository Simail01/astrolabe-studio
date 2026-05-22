import chokidar from 'chokidar';
import type { FSWatcher } from 'chokidar';
import { getMainWindow } from '../window';

let watcher: FSWatcher | null = null;

export function startWatching(projectPath: string): void {
  stopWatching();
  watcher = chokidar.watch(projectPath, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
  });
  watcher.on('change', (filePath: string) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('fs:fileChanged', filePath);
    }
  });
}

export function stopWatching(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}
