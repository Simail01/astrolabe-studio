import { ipcMain } from 'electron';
import { wikiService } from '../services/wiki.service';

export function registerWikiHandlers(): void {
  ipcMain.handle('wiki:save', (_event, projectPath: string, entry) => {
    wikiService.saveEntry(projectPath, entry);
  });

  ipcMain.handle('wiki:get', (_event, projectPath: string, type: string, id: string) => {
    return wikiService.getEntry(projectPath, type, id);
  });

  ipcMain.handle('wiki:list', (_event, projectPath: string, type?: string) => {
    return wikiService.listEntries(projectPath, type);
  });

  ipcMain.handle('wiki:delete', (_event, projectPath: string, type: string, id: string) => {
    wikiService.deleteEntry(projectPath, type, id);
  });

  ipcMain.handle('wiki:search', (_event, projectPath: string, query: string) => {
    return wikiService.search(projectPath, query);
  });

  ipcMain.handle('wiki:related', (_event, projectPath: string, entryId: string) => {
    return wikiService.getRelatedEntries(projectPath, entryId);
  });
}
