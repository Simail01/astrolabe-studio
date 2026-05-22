import { ipcMain } from 'electron';
import { pipelineService } from '../services/pipeline.service';

export function registerPipelineHandlers(): void {
  ipcMain.handle('pipeline:saveOutline', (_e, projectPath: string, outline) => { pipelineService.saveOutline(projectPath, outline); });
  ipcMain.handle('pipeline:getOutline', (_e, projectPath: string) => pipelineService.getOutline(projectPath));
  ipcMain.handle('pipeline:saveChapter', (_e, projectPath: string, chapter) => { pipelineService.saveChapter(projectPath, chapter); });
  ipcMain.handle('pipeline:getChapter', (_e, projectPath: string, chapterId: string) => pipelineService.getChapter(projectPath, chapterId));
  ipcMain.handle('pipeline:listChapters', (_e, projectPath: string) => pipelineService.listChapters(projectPath));
  ipcMain.handle('pipeline:saveStoryboard', (_e, projectPath: string, storyboard) => { pipelineService.saveStoryboard(projectPath, storyboard); });
  ipcMain.handle('pipeline:getStoryboard', (_e, projectPath: string, chapterId: string) => pipelineService.getStoryboard(projectPath, chapterId));
  ipcMain.handle('pipeline:saveState', (_e, projectPath: string, state) => { pipelineService.savePipelineState(projectPath, state); });
  ipcMain.handle('pipeline:getState', (_e, projectPath: string) => pipelineService.getPipelineState(projectPath));
}
