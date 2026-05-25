import { ipcMain } from 'electron';
import { templateService } from '../services/template.service';
import type { TemplateStage } from '@astrolabe/shared';

export function registerTemplateHandlers(): void {
  ipcMain.handle('template:listBuiltIn', () => templateService.getBuiltInTemplates());

  ipcMain.handle('template:listByStage', (_e, workspacePath: string, stage: TemplateStage) =>
    templateService.getTemplatesByStage(workspacePath, stage));

  ipcMain.handle('template:get', (_e, workspacePath: string, templateId: string) =>
    templateService.getTemplate(workspacePath, templateId));

  ipcMain.handle('template:save', (_e, workspacePath: string, template) => {
    templateService.saveTemplate(workspacePath, template);
  });

  ipcMain.handle('template:delete', (_e, workspacePath: string, templateId: string) => {
    templateService.deleteTemplate(workspacePath, templateId);
  });

  ipcMain.handle('template:createFromBuiltIn', (_e, workspacePath: string, builtInId: string, name: string, content: string) =>
    templateService.createFromBuiltIn(workspacePath, builtInId, name, content));
}
