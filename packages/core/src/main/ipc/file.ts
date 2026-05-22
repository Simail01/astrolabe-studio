import { ipcMain } from 'electron';
import { fileService } from '../services/file.service';

export function registerFileHandlers(): void {
  ipcMain.handle('fs:readFile', (_event, filePath: string) => {
    return fileService.readFile(filePath);
  });

  ipcMain.handle('fs:writeFile', (_event, filePath: string, data: string) => {
    fileService.writeFile(filePath, data);
  });

  ipcMain.handle('fs:readDir', (_event, dirPath: string) => {
    return fileService.readDir(dirPath);
  });

  ipcMain.handle('fs:exists', (_event, filePath: string) => {
    return fileService.exists(filePath);
  });

  ipcMain.handle('fs:mkdir', (_event, dirPath: string) => {
    fileService.mkdir(dirPath);
  });
}
