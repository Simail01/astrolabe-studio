import path from 'path';
import { fileService } from './file.service';
import { aiKeyStore } from './keystore.service';
import { randomUUID } from 'crypto';
import type { TimelineData, TimelineEvent } from '@astrolabe/shared';

const TIMELINE_FILE = 'timeline.json';

function getTimelinePath(projectPath: string): string {
  return path.join(projectPath, 'timeline.json');
}

export const timelineService = {
  getTimeline(projectPath: string): TimelineData {
    const filePath = getTimelinePath(projectPath);
    if (!fileService.exists(filePath)) {
      return { events: [], updatedAt: new Date().toISOString() };
    }
    return JSON.parse(fileService.readFile(filePath)) as TimelineData;
  },

  saveTimeline(projectPath: string, data: TimelineData): void {
    data.updatedAt = new Date().toISOString();
    fileService.writeFile(getTimelinePath(projectPath), JSON.stringify(data, null, 2));
  },

  async extractEvents(
    projectPath: string,
    chapterId: string,
    chapterContent: string,
    chapterTitle: string
  ): Promise<TimelineEvent[]> {
    const existing = timelineService.getTimeline(projectPath);
    const existingStr = existing.events
      .filter((e) => e.chapterId === chapterId)
      .map((e) => `[${e.type}] ${e.title}`)
      .join('\n');

    const { PromptManager } = await import('@astrolabe/ai');
    const mgr = new PromptManager();
    const prompt = mgr.loadAndRender('timeline', 'extract', {
      chapterTitle: chapterTitle || '（未命名）',
      chapterContent,
      existingEvents: existingStr || '（暂无已有事件）',
    });

    const apiKey = aiKeyStore.getKey('deepseek');
    if (!apiKey) throw new Error('DeepSeek API Key 未配置');
    const { createDeepSeekClient } = await import('@astrolabe/ai');
    const client = createDeepSeekClient({ apiKey });
    const raw = await client.generate(prompt, {
      systemPrompt: '你是一个 JSON 输出引擎。只输出 JSON 数组，不要任何其他文字。',
      temperature: 0.3,
      maxTokens: 4096,
    });

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI 未返回有效的 JSON');
    const parsed = JSON.parse(jsonMatch[0]) as Omit<TimelineEvent, 'id' | 'chapterId' | 'chapterTitle' | 'order'>[];

    const baseOrder = existing.events.length;
    return parsed.map((item, i) => ({
      ...item,
      id: randomUUID(),
      chapterId,
      chapterTitle,
      order: baseOrder + i,
    }));
  },
};
