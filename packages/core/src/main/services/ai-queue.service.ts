import { ipcMain, BrowserWindow } from 'electron';

interface QueueItem {
  id: string;
  execute: () => Promise<void>;
  priority: number;
}

class AIRequestQueue {
  private queue: QueueItem[] = [];
  private running = 0;
  private readonly maxConcurrent = 3;
  private activeRequests = new Map<string, AbortController>();

  enqueue(item: QueueItem): void {
    this.queue.push(item);
    this.queue.sort((a, b) => b.priority - a.priority);
    this.processNext();
  }

  cancel(requestId: string): boolean {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
      return true;
    }
    // Remove from queue if not yet started
    const idx = this.queue.findIndex(item => item.id === requestId);
    if (idx >= 0) {
      this.queue.splice(idx, 1);
      return true;
    }
    return false;
  }

  cancelAll(): void {
    for (const controller of this.activeRequests.values()) {
      controller.abort();
    }
    this.activeRequests.clear();
    this.queue = [];
    this.running = 0;
  }

  private async processNext(): Promise<void> {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) return;

    const item = this.queue.shift()!;
    this.running++;
    const controller = new AbortController();
    this.activeRequests.set(item.id, controller);

    try {
      await item.execute();
    } finally {
      this.activeRequests.delete(item.id);
      this.running--;
      this.processNext();
    }
  }
}

export const aiQueue = new AIRequestQueue();

// Prompt cache: hash(prompt + systemPrompt) → result
const promptCache = new Map<string, { result: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function hashPrompt(prompt: string, systemPrompt?: string): string {
  const key = (systemPrompt || '') + '\x00' + prompt;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const ch = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return hash.toString(36);
}

export function getCachedPrompt(prompt: string, systemPrompt?: string): string | null {
  const hash = hashPrompt(prompt, systemPrompt);
  const cached = promptCache.get(hash);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  if (cached) promptCache.delete(hash);
  return null;
}

export function setCachedPrompt(prompt: string, systemPrompt: string | undefined, result: string): void {
  const hash = hashPrompt(prompt, systemPrompt);
  // Limit cache size
  if (promptCache.size > 100) {
    const oldest = promptCache.keys().next().value;
    if (oldest) promptCache.delete(oldest);
  }
  promptCache.set(hash, { result, timestamp: Date.now() });
}

export function clearPromptCache(): void {
  promptCache.clear();
}

export function registerAIQueueHandlers(): void {
  ipcMain.handle('ai:cancel', (_event, requestId: string) => {
    return aiQueue.cancel(requestId);
  });

  ipcMain.handle('ai:cancelAll', () => {
    aiQueue.cancelAll();
  });

  ipcMain.handle('ai:clearCache', () => {
    clearPromptCache();
  });
}
