import { ipcMain } from 'electron';
import path from 'path';
import { fileService } from '../services/file.service';
import { aiKeyStore } from '../services/keystore.service';
import { wikiService } from '../services/wiki.service';
import { templateService } from '../services/template.service';
import { PromptManager } from '@astrolabe/ai';

function parseJsonArray(raw: string): unknown[] {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  // Try direct parse first
  try { return JSON.parse(cleaned); } catch { /* continue */ }

  // Try to extract JSON array from surrounding text
  const arrStart = cleaned.indexOf('[');
  const arrEnd = cleaned.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd > arrStart) {
    const candidate = cleaned.slice(arrStart, arrEnd + 1);
    try { return JSON.parse(candidate); } catch { /* continue */ }
  }

  throw new Error('AI 返回内容无法解析为 JSON 数组。原始内容: ' + raw.slice(0, 200));
}

export function registerStoryboardHandlers(): void {
  ipcMain.handle('storyboard:decompose', async (_event, projectPath: string, chapterId: string, templateId?: string, workspacePath?: string) => {
    // Read chapter content
    const chapterPath = path.join(projectPath, 'chapters');
    let chapterContent = '';
    let chapterTitle = '';
    if (fileService.exists(chapterPath)) {
      const files = fileService.readDir(chapterPath).filter((f: string) => f.endsWith('.json'));
      for (const f of files) {
        try {
          const ch = JSON.parse(fileService.readFile(path.join(chapterPath, f)));
          if (ch.id === chapterId) {
            chapterContent = ch.content || '';
            chapterTitle = ch.title || '';
            break;
          }
        } catch { /* skip malformed files */ }
      }
    }
    if (!chapterContent) throw new Error(`章节内容为空（chapterId: ${chapterId}）。请先在写作模式中为该章节撰写内容。`);

    // Gather character design info from wiki
    let characterDesigns = '（无角色设定信息）';
    const wikiPath = path.join(projectPath, 'wiki');
    if (fileService.exists(wikiPath)) {
      try {
        const entries = wikiService.search(projectPath, '');
        const persons = entries.filter((e) => e.type === 'person');
        if (persons.length > 0) {
          characterDesigns = persons
            .map((e) => `${e.title}：${e.summary || ''}`)
            .join('\n');
        }
      } catch {
        // wiki might not exist yet
      }
    }

    // Load template — use custom if provided, otherwise built-in
    let prompt: string;
    if (templateId && workspacePath) {
      const template = templateService.getTemplate(workspacePath, templateId);
      if (template) {
        const mgr = new PromptManager();
        prompt = mgr.render(template.content, { chapterContent, characterDesigns });
      } else {
        const mgr = new PromptManager();
        prompt = mgr.loadAndRender('storyboard', 'decompose', { chapterContent, characterDesigns });
      }
    } else {
      const mgr = new PromptManager();
      prompt = mgr.loadAndRender('storyboard', 'decompose', { chapterContent, characterDesigns });
    }

    const apiKey = aiKeyStore.getKey('deepseek');
    if (!apiKey) throw new Error('DeepSeek API Key 未配置。请在设置中配置 API Key。');
    const { createDeepSeekClient } = await import('@astrolabe/ai');
    const client = createDeepSeekClient({ apiKey });
    const raw = await client.generate(prompt, {
      systemPrompt: '你是一个 JSON 输出引擎。只输出合法的 JSON 数组，不要包含任何解释、说明或 markdown 标记。',
      maxTokens: 8192,
    });

    if (!raw || !raw.trim()) throw new Error('AI 返回了空内容，请重试。');

    const shots = parseJsonArray(raw);
    if (!Array.isArray(shots) || shots.length === 0) {
      throw new Error('AI 未返回有效的镜头数据。请重试。');
    }

    // Ensure each shot has required fields
    return shots.map((s: any, i: number) => ({
      id: s.id || `shot-${Date.now()}-${i}`,
      order: s.order ?? i + 1,
      scene: s.scene || '',
      framing: s.framing || 'medium',
      angle: s.angle || 'eye-level',
      characters: Array.isArray(s.characters) ? s.characters : [],
      dialogue: Array.isArray(s.dialogue) ? s.dialogue : [],
      props: Array.isArray(s.props) ? s.props : [],
      mood: s.mood || '',
      notes: s.notes || '',
    }));
  });
}
