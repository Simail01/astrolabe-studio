import { ipcMain } from 'electron';
import { sessionService } from '../services/session.service';

export function registerSessionHandlers(): void {
  ipcMain.handle('session:save', (_event, session) => {
    sessionService.saveSession(session);
  });

  ipcMain.handle('session:load', () => {
    return sessionService.loadSession();
  });

  ipcMain.handle('session:checkDrafts', () => {
    return sessionService.checkDrafts();
  });
}
