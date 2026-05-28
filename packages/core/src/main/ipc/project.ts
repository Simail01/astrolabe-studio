import { ipcMain } from 'electron';
import { projectService } from '../services/project.service';

export function registerProjectHandlers(): void {
  ipcMain.handle('project:read', (_event, projectPath: string) => {
    return projectService.readProject(projectPath);
  });

  ipcMain.handle('project:create', (_event, projectPath: string, name: string) => {
    return projectService.createProject(projectPath, name);
  });

  ipcMain.handle('project:delete', (_event, projectPath: string) => {
    return projectService.deleteProject(projectPath);
  });
}
