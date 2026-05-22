import { ipcMain } from 'electron';
import { fileService } from '../services/file.service';
import path from 'path';
import type { Workspace } from '@astrolabe/shared';
import { randomUUID } from 'crypto';

const WORKSPACE_CONFIG = 'astrolabe-workspace.json';
const PROJECT_CONFIG = 'astrolabe.json';

export function registerWorkspaceHandlers(): void {
  ipcMain.handle('workspace:open', async (_event, folderPath: string) => {
    const configPath = path.join(folderPath, WORKSPACE_CONFIG);

    let workspace: Workspace;
    if (fileService.exists(configPath)) {
      workspace = JSON.parse(fileService.readFile(configPath));
    } else {
      workspace = {
        id: randomUUID(),
        name: path.basename(folderPath),
        path: folderPath,
        projects: [],
        fanlibPath: path.join(folderPath, 'fanlib'),
      };
      fileService.writeFile(configPath, JSON.stringify(workspace, null, 2));
      // Create fanlib directory
      fileService.mkdir(path.join(folderPath, 'fanlib'));
    }

    // Scan for existing projects
    const entries = fileService.readDir(folderPath);
    const projects: string[] = [];
    for (const entry of entries) {
      const projectConfig = path.join(folderPath, entry, PROJECT_CONFIG);
      if (fileService.exists(projectConfig)) {
        projects.push(entry);
      }
    }
    workspace.projects = projects;

    return workspace;
  });
}
