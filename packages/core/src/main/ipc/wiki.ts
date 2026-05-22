import { ipcMain } from 'electron';
import { wikiService } from '../services/wiki.service';
import { aiKeyStore } from '../services/keystore.service';

export function registerWikiHandlers(): void {
  ipcMain.handle('wiki:save', (_event, projectPath: string, entry) => {
    wikiService.saveEntry(projectPath, entry);
  });

  ipcMain.handle('wiki:get', (_event, projectPath: string, type: string, id: string) => {
    return wikiService.getEntry(projectPath, type, id);
  });

  ipcMain.handle('wiki:list', (_event, projectPath: string, type?: string) => {
    return wikiService.listEntries(projectPath, type);
  });

  ipcMain.handle('wiki:delete', (_event, projectPath: string, type: string, id: string) => {
    wikiService.deleteEntry(projectPath, type, id);
  });

  ipcMain.handle('wiki:search', (_event, projectPath: string, query: string) => {
    return wikiService.search(projectPath, query);
  });

  ipcMain.handle('wiki:related', (_event, projectPath: string, entryId: string) => {
    return wikiService.getRelatedEntries(projectPath, entryId);
  });

  ipcMain.handle('wiki:extract', async (_event, projectPath: string, chapterContent: string, chapterTitle: string) => {
    const index = wikiService.listEntries(projectPath);
    const existingStr = index.map(e => `[${e.type}] ${e.title}`).join('\n');

    const { PromptManager } = await import('@astrolabe/ai');
    const mgr = new PromptManager();
    const prompt = mgr.loadAndRender('wiki', 'extract', {
      existingEntries: existingStr || '（暂无已有条目）',
      chapterContent,
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
    return JSON.parse(jsonMatch[0]);
  });
}
