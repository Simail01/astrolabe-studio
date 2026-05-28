import { ipcMain } from 'electron';
import { promptLogService } from '../services/prompt-log.service';

export function registerPromptLogHandlers(): void {
  ipcMain.handle('prompt-log:list', (_event, workspacePath: string, limit?: number) => {
    return promptLogService.getLogs(workspacePath, limit);
  });
}
