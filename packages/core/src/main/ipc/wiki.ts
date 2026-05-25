import { ipcMain } from 'electron';
import path from 'path';
import { wikiService } from '../services/wiki.service';
import { aiKeyStore } from '../services/keystore.service';
import { fileService } from '../services/file.service';

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
      chapterTitle: chapterTitle || '（未命名）',
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

  // P1: Enrich existing entry
  ipcMain.handle('wiki:enrich', async (_event, projectPath: string, entryId: string, entryTitle: string, entryType: string) => {
    const chaptersDir = path.join(projectPath, 'chapters');
    let allChapters = '';
    if (fileService.exists(chaptersDir)) {
      const files = fileService.readDir(chaptersDir).filter((f: string) => f.endsWith('.json'));
      for (const f of files) {
        const ch = JSON.parse(fileService.readFile(path.join(chaptersDir, f)));
        allChapters += `\n## ${ch.title}\n${ch.content}\n`;
      }
    }

    const entry = wikiService.getEntry(projectPath, entryType, entryId);
    const existingAttrs = entry ? JSON.stringify(entry.attributes) : '{}';

    const { PromptManager } = await import('@astrolabe/ai');
    const mgr = new PromptManager();
    const prompt = mgr.loadAndRender('wiki', 'enrich', {
      entryTitle, entryType, existingAttributes: existingAttrs, allChapters,
    });

    const apiKey = aiKeyStore.getKey('deepseek');
    if (!apiKey) throw new Error('DeepSeek API Key 未配置');
    const { createDeepSeekClient } = await import('@astrolabe/ai');
    const client = createDeepSeekClient({ apiKey });
    const raw = await client.generate(prompt, {
      systemPrompt: '你是一个 JSON 输出引擎。只输出 JSON 数组。',
      temperature: 0.3, maxTokens: 4096,
    });

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI 未返回有效的 JSON');
    return JSON.parse(jsonMatch[0]);
  });

  // P2: Consistency check
  ipcMain.handle('wiki:consistency', async (_event, projectPath: string) => {
    const entries = wikiService.search(projectPath, '');
    const entriesStr = entries.map(e => `[${e.type}] ${e.title}: ${JSON.stringify(e.attributes)}`).join('\n');

    const chaptersDir = path.join(projectPath, 'chapters');
    let allChapters = '';
    if (fileService.exists(chaptersDir)) {
      const files = fileService.readDir(chaptersDir).filter((f: string) => f.endsWith('.json'));
      for (const f of files) {
        const ch = JSON.parse(fileService.readFile(path.join(chaptersDir, f)));
        allChapters += `\n## ${ch.title}\n${ch.content}\n`;
      }
    }

    const { PromptManager } = await import('@astrolabe/ai');
    const mgr = new PromptManager();
    const prompt = mgr.loadAndRender('wiki', 'consistency', { wikiEntries: entriesStr, allChapters });

    const apiKey = aiKeyStore.getKey('deepseek');
    if (!apiKey) throw new Error('DeepSeek API Key 未配置');
    const { createDeepSeekClient } = await import('@astrolabe/ai');
    const client = createDeepSeekClient({ apiKey });
    const raw = await client.generate(prompt, {
      systemPrompt: '你是一个 JSON 输出引擎。只输出 JSON 数组。',
      temperature: 0.3, maxTokens: 4096,
    });

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI 未返回有效的 JSON');
    return JSON.parse(jsonMatch[0]);
  });

  // P3: Relation discovery
  ipcMain.handle('wiki:relations', async (_event, projectPath: string) => {
    const index = wikiService.listEntries(projectPath);
    const entriesStr = index.map(e => `${e.id}|[${e.type}] ${e.title}`).join('\n');

    const chaptersDir = path.join(projectPath, 'chapters');
    let allChapters = '';
    if (fileService.exists(chaptersDir)) {
      const files = fileService.readDir(chaptersDir).filter((f: string) => f.endsWith('.json'));
      for (const f of files) {
        const ch = JSON.parse(fileService.readFile(path.join(chaptersDir, f)));
        allChapters += `\n## ${ch.title}\n${ch.content}\n`;
      }
    }

    const { PromptManager } = await import('@astrolabe/ai');
    const mgr = new PromptManager();
    const prompt = mgr.loadAndRender('wiki', 'relations', { wikiEntries: entriesStr, allChapters });

    const apiKey = aiKeyStore.getKey('deepseek');
    if (!apiKey) throw new Error('DeepSeek API Key 未配置');
    const { createDeepSeekClient } = await import('@astrolabe/ai');
    const client = createDeepSeekClient({ apiKey });
    const raw = await client.generate(prompt, {
      systemPrompt: '你是一个 JSON 输出引擎。只输出 JSON 数组。',
      temperature: 0.3, maxTokens: 4096,
    });

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI 未返回有效的 JSON');
    return JSON.parse(jsonMatch[0]);
  });
}
