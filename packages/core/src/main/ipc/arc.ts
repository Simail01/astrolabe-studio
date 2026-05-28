import { ipcMain } from 'electron';
import { arcService } from '../services/arc.service';

export function registerArcHandlers(): void {
  ipcMain.handle('arc:get', (_event, projectPath: string, entryId: string) => {
    return arcService.getArc(projectPath, entryId);
  });

  ipcMain.handle('arc:save', (_event, projectPath: string, arc) => {
    arcService.saveArc(projectPath, arc);
  });

  ipcMain.handle('arc:addState', (_event, projectPath: string, entryId: string, state) => {
    return arcService.addState(projectPath, entryId, state);
  });

  ipcMain.handle('arc:summarize', async (_event, projectPath: string, entryId: string, entryTitle: string) => {
    return arcService.summarizeArc(projectPath, entryId, entryTitle);
  });
}
