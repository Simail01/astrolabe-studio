import { ipcMain } from 'electron';
import { exportService } from '../services/export.service';

export function registerExportHandlers(): void {
  ipcMain.handle('export:novel', (_event, projectPath: string, format: string) => {
    return exportService.exportNovel(projectPath, format);
  });

  ipcMain.handle('export:chapter', (_event, projectPath: string, chapterId: string, format: string) => {
    return exportService.exportChapter(projectPath, chapterId, format);
  });

  ipcMain.handle('export:card', (_event, cardPath: string, format: string) => {
    return exportService.exportCard(cardPath, format);
  });

  ipcMain.handle('export:comic', (_event, projectPath: string, format: string) => {
    return exportService.exportComic(projectPath, format);
  });

  ipcMain.handle('export:comic:longImage', (_event, projectPath: string, html: string) => {
    return exportService.exportComicLongImage(projectPath, html);
  });
}
