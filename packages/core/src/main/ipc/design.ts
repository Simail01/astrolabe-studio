import { ipcMain } from 'electron';
import { fileService } from '../services/file.service';
import path from 'path';
import type { CharacterDesign } from '@astrolabe/shared';

function getDesignPath(projectPath: string, characterId: string): string {
  return path.join(projectPath, 'characters', characterId);
}

export function registerDesignHandlers(): void {
  ipcMain.handle('design:save', (_event, projectPath: string, characterId: string, design: CharacterDesign) => {
    const dir = getDesignPath(projectPath, characterId);
    fileService.mkdir(dir);
    const designPath = path.join(dir, 'design.json');
    fileService.writeFile(designPath, JSON.stringify(design, null, 2));
  });

  ipcMain.handle('design:get', (_event, projectPath: string, characterId: string) => {
    const designPath = path.join(getDesignPath(projectPath, characterId), 'design.json');
    if (!fileService.exists(designPath)) return null;
    return JSON.parse(fileService.readFile(designPath));
  });

  ipcMain.handle('design:list', (_event, projectPath: string, characterId: string) => {
    const dir = getDesignPath(projectPath, characterId);
    if (!fileService.exists(dir)) return [];
    return fileService.readDir(dir);
  });
}
