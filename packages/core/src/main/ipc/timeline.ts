import { ipcMain } from 'electron';
import { timelineService } from '../services/timeline.service';
import type { TimelineData } from '@astrolabe/shared';

export function registerTimelineHandlers(): void {
  ipcMain.handle('timeline:get', (_event, projectPath: string) => {
    return timelineService.getTimeline(projectPath);
  });

  ipcMain.handle('timeline:save', (_event, projectPath: string, data: TimelineData) => {
    timelineService.saveTimeline(projectPath, data);
  });

  ipcMain.handle(
    'timeline:extract',
    async (_event, projectPath: string, chapterId: string, chapterContent: string, chapterTitle: string) => {
      return timelineService.extractEvents(projectPath, chapterId, chapterContent, chapterTitle);
    }
  );
}
