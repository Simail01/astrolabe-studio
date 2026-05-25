import path from 'path';
import { fileService } from './file.service';
import type { Outline, Chapter, Storyboard, PipelineState } from '@astrolabe/shared';

function ensureDir(dir: string): void {
  if (!fileService.exists(dir)) fileService.mkdir(dir);
}

export const pipelineService = {
  // Outline
  saveOutline(projectPath: string, outline: Outline): void {
    const dir = path.join(projectPath, 'outline');
    ensureDir(dir);
    fileService.writeFile(path.join(dir, 'outline.json'), JSON.stringify(outline, null, 2));
  },

  getOutline(projectPath: string): Outline | null {
    const filePath = path.join(projectPath, 'outline', 'outline.json');
    if (!fileService.exists(filePath)) return null;
    return JSON.parse(fileService.readFile(filePath));
  },

  // Chapters
  saveChapter(projectPath: string, chapter: Chapter): void {
    const dir = path.join(projectPath, 'chapters');
    ensureDir(dir);
    fileService.writeFile(path.join(dir, `${chapter.id}.json`), JSON.stringify(chapter, null, 2));
  },

  getChapter(projectPath: string, chapterId: string): Chapter | null {
    const dir = path.join(projectPath, 'chapters');
    if (!fileService.exists(dir)) return null;
    const files = fileService.readDir(dir).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      const ch = JSON.parse(fileService.readFile(path.join(dir, f)));
      if (ch.id === chapterId) return ch;
    }
    return null;
  },

  listChapters(projectPath: string): string[] {
    const dir = path.join(projectPath, 'chapters');
    if (!fileService.exists(dir)) return [];
    return fileService.readDir(dir).filter((f) => f.endsWith('.json')).sort();
  },

  // Storyboards
  saveStoryboard(projectPath: string, storyboard: Storyboard): void {
    const dir = path.join(projectPath, 'storyboards');
    ensureDir(dir);
    fileService.writeFile(path.join(dir, `${storyboard.chapterId}.json`), JSON.stringify(storyboard, null, 2));
  },

  getStoryboard(projectPath: string, chapterId: string): Storyboard | null {
    const filePath = path.join(projectPath, 'storyboards', `${chapterId}.json`);
    if (!fileService.exists(filePath)) return null;
    return JSON.parse(fileService.readFile(filePath));
  },

  // Pipeline State
  savePipelineState(projectPath: string, state: PipelineState): void {
    fileService.writeFile(path.join(projectPath, 'pipeline-state.json'), JSON.stringify(state, null, 2));
  },

  getPipelineState(projectPath: string): PipelineState | null {
    const filePath = path.join(projectPath, 'pipeline-state.json');
    if (!fileService.exists(filePath)) return null;
    return JSON.parse(fileService.readFile(filePath));
  },
};
