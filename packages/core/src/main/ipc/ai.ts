import { ipcMain } from 'electron';
import { createDeepSeekClient, createVolcEngineClient } from '@astrolabe/ai';
import type { StreamCallback } from '@astrolabe/ai';
import { aiKeyStore } from '../services/keystore.service';

function getDeepSeekClient() {
  const apiKey = aiKeyStore.getKey('deepseek');
  if (!apiKey) throw new Error('DeepSeek API Key 未配置');
  const model = aiKeyStore.getKey('deepseek-model') || undefined;
  const baseUrl = aiKeyStore.getKey('deepseek-baseurl') || undefined;
  return createDeepSeekClient({ apiKey, model, baseUrl });
}

function getVolcEngineClient() {
  const apiKey = aiKeyStore.getKey('volcengine');
  if (!apiKey) throw new Error('火山方舟 API Key 未配置');
  const baseUrl = aiKeyStore.getKey('volcengine-baseurl') || undefined;
  return createVolcEngineClient({ apiKey, baseUrl });
}

export function registerAIHandlers(): void {
  ipcMain.handle('ai:text:generate', async (_event, prompt: string, systemPrompt?: string) => {
    try {
      const client = getDeepSeekClient();
      return await client.generate(prompt, { systemPrompt });
    } catch (err) {
      throw new Error(`AI 生成失败: ${(err as Error).message}`);
    }
  });

  ipcMain.handle('ai:text:stream', async (event, prompt: string, systemPrompt?: string) => {
    const sender = event.sender;
    try {
      const client = getDeepSeekClient();

      const callbacks: StreamCallback = {
        onChunk: (text) => sender.send('ai:text:chunk', text),
        onDone: (fullText) => sender.send('ai:text:done', fullText),
        onError: (err) => sender.send('ai:text:error', err.message),
      };

      await client.generateStream(prompt, callbacks, { systemPrompt });
      return { started: true };
    } catch (err) {
      sender.send('ai:text:error', (err as Error).message);
      return { started: false };
    }
  });

  ipcMain.handle('ai:image:generate', async (_event, options: { prompt: string; model: string; size?: string; seed?: number; referenceImage?: string }) => {
    try {
      const client = getVolcEngineClient();
      if (options.referenceImage) {
        return await client.imageToImage({
          model: options.model,
          prompt: options.prompt,
          referenceImage: options.referenceImage,
          size: options.size,
        });
      }
      return await client.generateImage({
        model: options.model,
        prompt: options.prompt,
        size: options.size,
        seed: options.seed,
      });
    } catch (err) {
      throw new Error(`图像生成失败: ${(err as Error).message}`);
    }
  });

  ipcMain.handle('ai:volc:ping', async () => {
    try {
      const client = getVolcEngineClient();
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
