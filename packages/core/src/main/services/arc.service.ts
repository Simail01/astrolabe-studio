import fs from 'fs';
import path from 'path';
import { fileService } from './file.service';
import type { CharacterArc, CharacterArcState } from '@astrolabe/shared';
import { randomUUID } from 'crypto';

const ARC_DIR = 'arcs';

function getArcDir(projectPath: string): string {
  return path.join(projectPath, ARC_DIR);
}

function getArcPath(projectPath: string, entryId: string): string {
  return path.join(getArcDir(projectPath), `${entryId}.json`);
}

export const arcService = {
  getArc(projectPath: string, entryId: string): CharacterArc | null {
    const filePath = getArcPath(projectPath, entryId);
    if (!fileService.exists(filePath)) return null;
    return JSON.parse(fileService.readFile(filePath)) as CharacterArc;
  },

  saveArc(projectPath: string, arc: CharacterArc): void {
    const arcDir = getArcDir(projectPath);
    fileService.mkdir(arcDir);
    const filePath = path.join(arcDir, `${arc.entryId}.json`);
    fileService.writeFile(filePath, JSON.stringify(arc, null, 2));
  },

  addState(projectPath: string, entryId: string, state: CharacterArcState): CharacterArc {
    let arc = arcService.getArc(projectPath, entryId);
    if (!arc) {
      arc = { entryId, entryTitle: '', states: [], aiSummary: '' };
    }
    const existingIdx = arc.states.findIndex(s => s.chapterId === state.chapterId);
    if (existingIdx >= 0) {
      arc.states[existingIdx] = state;
    } else {
      arc.states.push(state);
    }
    arc.states.sort((a, b) => a.chapterId.localeCompare(b.chapterId));
    arcService.saveArc(projectPath, arc);
    return arc;
  },

  updateAiSummary(projectPath: string, entryId: string, summary: string): CharacterArc | null {
    const arc = arcService.getArc(projectPath, entryId);
    if (!arc) return null;
    arc.aiSummary = summary;
    arcService.saveArc(projectPath, arc);
    return arc;
  },

  async summarizeArc(projectPath: string, entryId: string, entryTitle: string): Promise<string> {
    const arc = arcService.getArc(projectPath, entryId);
    if (!arc || arc.states.length === 0) {
      return '暂无角色状态数据';
    }

    const chaptersDir = path.join(projectPath, 'chapters');
    let allChapters = '';
    if (fileService.exists(chaptersDir)) {
      const files = fileService.readDir(chaptersDir).filter((f: string) => f.endsWith('.json'));
      for (const f of files) {
        const ch = JSON.parse(fileService.readFile(path.join(chaptersDir, f)));
        allChapters += `\n## ${ch.title}\n${ch.content}\n`;
      }
    }

    const statesStr = arc.states.map(s =>
      `[${s.chapterTitle}] 目标: ${s.goals?.join(', ') || '无'} | 心态: ${s.mentalState} | 能力: ${s.abilities?.join(', ') || '无'} | 关系: ${s.relationships?.map(r => `${r.target}(${r.relation})`).join(', ') || '无'} | 摘要: ${s.summary}`
    ).join('\n');

    const { PromptManager } = await import('@astrolabe/ai');
    const mgr = new PromptManager();
    const prompt = mgr.loadAndRender('arc', 'summarize', {
      entryTitle,
      states: statesStr,
      allChapters,
    });

    const { aiKeyStore } = await import('./keystore.service');
    const apiKey = aiKeyStore.getKey('deepseek');
    if (!apiKey) throw new Error('DeepSeek API Key 未配置');
    const { createDeepSeekClient } = await import('@astrolabe/ai');
    const client = createDeepSeekClient({ apiKey });
    const summary = await client.generate(prompt, {
      systemPrompt: '你是一个角色弧光分析专家。请根据角色在各章节的状态变化，总结其成长轨迹和当前状态。',
      temperature: 0.5,
      maxTokens: 2048,
    });

    arcService.updateAiSummary(projectPath, entryId, summary);
    return summary;
  },
};
