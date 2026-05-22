import { ipcMain } from 'electron';
import { exportService } from '../services/export.service';

export function registerExportHandlers(): void {
  ipcMain.handle('export:novel', (_event, projectPath: string, format: string) => {
    return exportService.exportNovel(projectPath, format);
  });

  ipcMain.handle('export:card', (_event, cardPath: string, format: string) => {
    return exportService.exportCard(cardPath, format);
  });

  ipcMain.handle('export:comic', (_event, projectPath: string, format: string) => {
    return exportService.exportComic(projectPath, format);
  });
}
