import { ipcMain } from 'electron';
import { randomUUID } from 'crypto';
import { createDeepSeekClient, createVolcEngineClient } from '@astrolabe/ai';
import type { StreamCallback } from '@astrolabe/ai';
import { aiKeyStore } from '../services/keystore.service';
import { promptLogService } from '../services/prompt-log.service';
import { getCachedPrompt, setCachedPrompt } from '../services/ai-queue.service';
import type { PromptLogEntry } from '@astrolabe/shared';

function getDeepSeekClient() {
  const apiKey = aiKeyStore.getKey('deepseek');
  if (!apiKey) throw new Error('DeepSeek API Key 未配置');
  const model = aiKeyStore.getKey('deepseek-model') || undefined;
  const baseUrl = aiKeyStore.getKey('deepseek-baseurl') || undefined;
  return createDeepSeekClient({ apiKey, model, baseUrl });
}

function getVolcEngineClient(apiKeyOverride?: string) {
  const apiKey = apiKeyOverride || aiKeyStore.getKey('volcengine');
  if (!apiKey) throw new Error('火山方舟 API Key 未配置，请先在设置中填写并保存');
  const baseUrl = aiKeyStore.getKey('volcengine-baseurl') || undefined;
  return createVolcEngineClient({ apiKey, baseUrl });
}

function getModelName(): string {
  return aiKeyStore.getKey('deepseek-model') || 'deepseek';
}

export function registerAIHandlers(): void {
  ipcMain.handle('ai:text:generate', async (_event, prompt: string, systemPrompt?: string, workspacePath?: string, stage?: string) => {
    // Check prompt cache for non-streaming requests
    const cached = getCachedPrompt(prompt, systemPrompt);
    if (cached) {
      if (workspacePath) {
        promptLogService.appendLog(workspacePath, {
          id: randomUUID(),
          timestamp: new Date().toISOString(),
          type: 'text',
          model: getModelName() + ' (cached)',
          prompt,
          systemPrompt: systemPrompt || '',
          result: cached,
          duration: 0,
          success: true,
          stage,
        });
      }
      return cached;
    }

    const start = Date.now();
    try {
      const client = getDeepSeekClient();
      const result = await client.generate(prompt, { systemPrompt });
      // Cache the result
      setCachedPrompt(prompt, systemPrompt, result);
      if (workspacePath) {
        promptLogService.appendLog(workspacePath, {
          id: randomUUID(),
          timestamp: new Date().toISOString(),
          type: 'text',
          model: getModelName(),
          prompt,
          systemPrompt: systemPrompt || '',
          result,
          duration: Date.now() - start,
          success: true,
          stage,
        });
      }
      return result;
    } catch (err) {
      if (workspacePath) {
        promptLogService.appendLog(workspacePath, {
          id: randomUUID(),
          timestamp: new Date().toISOString(),
          type: 'text',
          model: getModelName(),
          prompt,
          systemPrompt: systemPrompt || '',
          result: '',
          duration: Date.now() - start,
          success: false,
          error: (err as Error).message,
          stage,
        });
      }
      throw new Error(`AI 生成失败: ${(err as Error).message}`);
    }
  });

  ipcMain.handle('ai:text:stream', async (event, prompt: string, systemPrompt?: string, workspacePath?: string, stage?: string) => {
    const sender = event.sender;
    const start = Date.now();
    const chunks: string[] = [];
    try {
      const client = getDeepSeekClient();

      const callbacks: StreamCallback = {
        onChunk: (text) => {
          chunks.push(text);
          sender.send('ai:text:chunk', text);
        },
        onDone: (fullText) => {
          sender.send('ai:text:done', fullText);
          if (workspacePath) {
            promptLogService.appendLog(workspacePath, {
              id: randomUUID(),
              timestamp: new Date().toISOString(),
              type: 'stream',
              model: getModelName(),
              prompt,
              systemPrompt: systemPrompt || '',
              result: fullText,
              duration: Date.now() - start,
              success: true,
              stage,
            });
          }
        },
        onError: (err) => {
          sender.send('ai:text:error', err.message);
          if (workspacePath) {
            promptLogService.appendLog(workspacePath, {
              id: randomUUID(),
              timestamp: new Date().toISOString(),
              type: 'stream',
              model: getModelName(),
              prompt,
              systemPrompt: systemPrompt || '',
              result: chunks.join(''),
              duration: Date.now() - start,
              success: false,
              error: err.message,
              stage,
            });
          }
        },
      };

      await client.generateStream(prompt, callbacks, { systemPrompt });
      return { started: true };
    } catch (err) {
      sender.send('ai:text:error', (err as Error).message);
      if (workspacePath) {
        promptLogService.appendLog(workspacePath, {
          id: randomUUID(),
          timestamp: new Date().toISOString(),
          type: 'stream',
          model: getModelName(),
          prompt,
          systemPrompt: systemPrompt || '',
          result: chunks.join(''),
          duration: Date.now() - start,
          success: false,
          error: (err as Error).message,
          stage,
        });
      }
      return { started: false };
    }
  });

  ipcMain.handle('ai:image:generate', async (_event, options: { prompt: string; model: string; size?: string; seed?: number; referenceImage?: string; workspacePath?: string; stage?: string }) => {
    const start = Date.now();
    try {
      const client = getVolcEngineClient();
      let result: string[];
      if (options.referenceImage) {
        result = await client.imageToImage({
          model: options.model,
          prompt: options.prompt,
          referenceImage: options.referenceImage,
          size: options.size,
        });
      } else {
        result = await client.generateImage({
          model: options.model,
          prompt: options.prompt,
          size: options.size,
          seed: options.seed,
        });
      }
      if (options.workspacePath) {
        promptLogService.appendLog(options.workspacePath, {
          id: randomUUID(),
          timestamp: new Date().toISOString(),
          type: 'image',
          model: options.model,
          prompt: options.prompt,
          systemPrompt: '',
          result: result.join(', '),
          duration: Date.now() - start,
          success: true,
          stage: options.stage,
        });
      }
      return result;
    } catch (err) {
      if (options.workspacePath) {
        promptLogService.appendLog(options.workspacePath, {
          id: randomUUID(),
          timestamp: new Date().toISOString(),
          type: 'image',
          model: options.model,
          prompt: options.prompt,
          systemPrompt: '',
          result: '',
          duration: Date.now() - start,
          success: false,
          error: (err as Error).message,
          stage: options.stage,
        });
      }
      throw new Error(`图像生成失败: ${(err as Error).message}`);
    }
  });

  ipcMain.handle('ai:volc:ping', async (_event, apiKey?: string) => {
    try {
      const client = getVolcEngineClient(apiKey);
      return await client.ping();
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  });

  ipcMain.handle('ai:keys:set', (_event, provider: string, key: string) => {
    aiKeyStore.setKey(provider, key);
  });

  ipcMain.handle('ai:keys:get', (_event, provider: string) => {
    return aiKeyStore.getKey(provider);
  });

  ipcMain.handle('ai:keys:list', () => {
    return aiKeyStore.listKeys();
  });

  ipcMain.handle('ai:keys:delete', (_event, provider: string) => {
    aiKeyStore.deleteKey(provider);
  });
}
