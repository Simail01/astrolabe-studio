import { ipcMain } from 'electron';
import { fanlibService } from '../services/fanlib.service';

export function registerFanlibHandlers(): void {
  ipcMain.handle('fanlib:save', (_event, workspacePath: string, card) => {
    fanlibService.saveCard(workspacePath, card);
  });

  ipcMain.handle('fanlib:get', (_event, workspacePath: string, type: string, id: string) => {
    return fanlibService.getCard(workspacePath, type, id);
  });

  ipcMain.handle('fanlib:list', (_event, workspacePath: string, type?: string) => {
    return fanlibService.listCards(workspacePath, type);
  });

  ipcMain.handle('fanlib:delete', (_event, workspacePath: string, type: string, id: string) => {
    fanlibService.deleteCard(workspacePath, type, id);
  });

  ipcMain.handle('fanlib:search', (_event, workspacePath: string, query: string) => {
    return fanlibService.search(workspacePath, query);
  });
}
