import { ipcMain } from 'electron';
import { createDeepSeekClient, createVolcEngineClient } from '@astrolabe/ai';
import type { StreamCallback, ImageGenerateOptions, VideoGenerateOptions } from '@astrolabe/ai';
import { aiKeyStore } from '../services/keystore.service';

function getDeepSeekClient() {
  const apiKey = aiKeyStore.getKey('deepseek');
  if (!apiKey) throw new Error('DeepSeek API Key 未配置');
  return createDeepSeekClient({ apiKey });
}

function getVolcEngineClient() {
  const apiKey = aiKeyStore.getKey('volcengine');
  if (!apiKey) throw new Error('火山方舟 API Key 未配置');
  return createVolcEngineClient({ apiKey });
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

  ipcMain.handle('ai:image:generate', async (_event, options: ImageGenerateOptions) => {
    try {
      const client = getVolcEngineClient();
      return await client.generateImage(options);
    } catch (err) {
      throw new Error(`图像生成失败: ${(err as Error).message}`);
    }
  });

  ipcMain.handle('ai:video:generate', async (_event, options: VideoGenerateOptions) => {
    try {
      const client = getVolcEngineClient();
      return await client.generateVideo(options);
    } catch (err) {
      throw new Error(`视频生成失败: ${(err as Error).message}`);
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
