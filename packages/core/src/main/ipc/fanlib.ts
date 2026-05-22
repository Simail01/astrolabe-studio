import { ipcMain } from 'electron';
import path from 'path';
import { fanlibService } from '../services/fanlib.service';
import { fileService } from '../services/file.service';
import { aiKeyStore } from '../services/keystore.service';

export function registerFanlibHandlers(): void {
  ipcMain.handle('fanlib:save', (_event, workspacePath: string, card) => {
    fanlibService.saveCard(workspacePath, card);
  });

  ipcMain.handle('fanlib:get', (_event, workspacePath: string, type: string, id: string) => {
    return fanlibService.getCard(workspacePath, type, id);
  });

  ipcMain.handle('fanlib:list', (_event, workspacePath: string, type?: string) => {
    return fanlibService.listCards(workspacePath, type);
  });

  ipcMain.handle('fanlib:delete', (_event, workspacePath: string, type: string, id: string) => {
    fanlibService.deleteCard(workspacePath, type, id);
  });

  ipcMain.handle('fanlib:search', (_event, workspacePath: string, query: string) => {
    return fanlibService.search(workspacePath, query);
  });

  ipcMain.handle('fanlib:adapt', async (_event, workspacePath: string, cardId: string, projectPath: string) => {
    // Get the card
    const card = fanlibService.getCard(workspacePath, 'character', cardId)
      || fanlibService.getCard(workspacePath, 'worldview', cardId)
      || fanlibService.getCard(workspacePath, 'item', cardId)
      || fanlibService.getCard(workspacePath, 'faction', cardId);
    if (!card) throw new Error('卡片未找到');

    // Get project context
    let premise = '', tags = '', wikiContext = '';
    try {
      const outlinePath = path.join(projectPath, 'outline', 'outline.json');
      if (fileService.exists(outlinePath)) {
        const outline = JSON.parse(fileService.readFile(outlinePath));
        premise = outline.premise || '';
        tags = (outline.genre || []).join(', ');
      }
      const { wikiService } = await import('../services/wiki.service');
      const entries = wikiService.search(projectPath, '');
      wikiContext = entries.map(e => `[${e.type}] ${e.title}: ${e.summary}`).join('\n');
    } catch {}

    const cardData: Record<string, string> = { cardName: card.name, sourceTitle: card.source?.title || '' };
    if (card.type === 'character') {
      const c = card as any;
      cardData.appearance = c.appearance || ''; cardData.personality = c.personality || '';
      cardData.abilities = (c.abilities || []).join(', '); cardData.background = c.background || '';
    } else {
      cardData.appearance = ''; cardData.personality = ''; cardData.abilities = ''; cardData.background = '';
    }

    const { PromptManager } = await import('@astrolabe/ai');
    const mgr = new PromptManager();
    const prompt = mgr.loadAndRender('fanlib', 'adapt', { ...cardData, projectPremise: premise, projectTags: tags, wikiContext });

    const apiKey = aiKeyStore.getKey('deepseek');
    if (!apiKey) throw new Error('DeepSeek API Key 未配置');
    const { createDeepSeekClient } = await import('@astrolabe/ai');
    const client = createDeepSeekClient({ apiKey });
    const raw = await client.generate(prompt, {
      systemPrompt: '你是一个 JSON 输出引擎。只输出 JSON 数组。',
      temperature: 0.5,
      maxTokens: 2048,
    });

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI 未返回有效的 JSON');
    return JSON.parse(jsonMatch[0]);
  });
}
