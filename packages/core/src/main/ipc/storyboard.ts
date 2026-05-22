import { ipcMain } from 'electron';
import path from 'path';
import { fileService } from '../services/file.service';
import { aiKeyStore } from '../services/keystore.service';
import { wikiService } from '../services/wiki.service';

export function registerStoryboardHandlers(): void {
  ipcMain.handle('storyboard:decompose', async (_event, projectPath: string, chapterId: string) => {
    // Read chapter content
    const chapterPath = path.join(projectPath, 'chapters');
    let chapterContent = '';
    let chapterTitle = '';
    if (fileService.exists(chapterPath)) {
      const files = fileService.readDir(chapterPath).filter((f: string) => f.endsWith('.json'));
      for (const f of files) {
        const ch = JSON.parse(fileService.readFile(path.join(chapterPath, f)));
        if (ch.id === chapterId) {
          chapterContent = ch.content || '';
          chapterTitle = ch.title || '';
          break;
        }
      }
    }
    if (!chapterContent) throw new Error('章节内容为空');

    // Gather character design info from wiki
    let characterDesigns = '';
    const wikiPath = path.join(projectPath, 'wiki');
    if (fileService.exists(wikiPath)) {
      try {
        const entries = wikiService.search(projectPath, '');
        characterDesigns = entries
          .filter((e) => e.type === 'person')
          .map((e) => `${e.title}：${e.summary || ''}。${JSON.stringify(e.attributes || {})}`)
          .join('\n');
      } catch {
        // wiki might not exist yet
      }
    }

    const { PromptManager } = await import('@astrolabe/ai');
    const mgr = new PromptManager();
    const prompt = mgr.loadAndRender('storyboard', 'decompose', { chapterContent, characterDesigns });

    const apiKey = aiKeyStore.getKey('deepseek');
    if (!apiKey) throw new Error('DeepSeek API Key 未配置');
    const { createDeepSeekClient } = await import('@astrolabe/ai');
    const client = createDeepSeekClient({ apiKey });
    const raw = await client.generate(prompt, {
      systemPrompt: '你是一个 JSON 输出引擎。只输出 JSON 数组。',
      maxTokens: 4096,
    });

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI 未返回有效的 JSON');
    const shots = JSON.parse(jsonMatch[0]);
    // Ensure each shot has required fields
    return shots.map((s: any, i: number) => ({
      id: s.id || `shot-${Date.now()}-${i}`,
      order: s.order ?? i + 1,
      scene: s.scene || '',
      framing: s.framing || 'medium',
      angle: s.angle || 'eye-level',
      characters: s.characters || [],
      dialogue: s.dialogue || [],
      props: s.props || [],
      mood: s.mood || '',
      notes: s.notes || '',
    }));
  });
}
