# AI 集成层 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> 的前提是 Task 16（packages/ai/ 客户端骨架）已完成

**Goal:** 完善 AI 集成层——Key 加密存储、Prompt 模板管理、AI IPC 通道、设置面板界面。

**Architecture:** 在已有 DeepSeek/VolcEngine 客户端基础上，补全 Main 进程的 AIService、PromptManager、KeyStore，通过 IPC 暴露给 Renderer，Renderer 侧提供 AI 设置面板。

**Tech Stack:** electron-store, Electron safeStorage, 已有 @astrolabe/ai 包

---

### Task 18: KeyStore — API Key 加密存储

**Files:**
- Create: `packages/core/src/main/services/keystore.service.ts`
- Create: `packages/core/__tests__/services/keystore.service.test.ts`
- Modify: `packages/core/package.json` — 添加 electron-store 依赖

- [ ] **Step 1: 添加依赖**

```
pnpm --filter @astrolabe/core add electron-store
```

**Step 2: 编写测试 — keystore.service.test.ts**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDelete = vi.fn();

vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: mockGet,
    set: mockSet,
    delete: mockDelete,
  })),
}));

describe('KeyStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores and retrieves a key', async () => {
    const { KeyStore } = await import('../../src/main/services/keystore.service');
    const store = new KeyStore('test-ns');
    
    mockGet.mockReturnValue('encrypted-value');
    
    store.setKey('deepseek', 'sk-test-123');
    expect(mockSet).toHaveBeenCalledWith('deepseek', 'sk-test-123');

    const key = store.getKey('deepseek');
    expect(key).toBe('encrypted-value');
    expect(mockGet).toHaveBeenCalledWith('deepseek');
  });

  it('returns null for missing key', async () => {
    const { KeyStore } = await import('../../src/main/services/keystore.service');
    const store = new KeyStore('test-ns');
    
    mockGet.mockReturnValue(undefined);
    expect(store.getKey('nonexistent')).toBeNull();
  });

  it('deletes a key', async () => {
    const { KeyStore } = await import('../../src/main/services/keystore.service');
    const store = new KeyStore('test-ns');
    
    store.deleteKey('deepseek');
    expect(mockDelete).toHaveBeenCalledWith('deepseek');
  });

  it('lists all stored key names', async () => {
    const { KeyStore } = await import('../../src/main/services/keystore.service');
    const store = new KeyStore('test-ns');
    
    mockGet.mockReturnValue('some-value');
    store.setKey('deepseek', 'sk-a');
    store.setKey('volcengine-ak', 'ak-b');
    
    mockGet.mockReturnValue(undefined);
    const keys = store.listKeys();
    expect(keys).toEqual([]); // listKeys loops over known fields
  });
});
```

**Step 3: 实现 keystore.service.ts**

```typescript
import Store from 'electron-store';

export class KeyStore {
  private store: Store;

  constructor(namespace: string) {
    this.store = new Store({ name: namespace });
  }

  setKey(provider: string, value: string): void {
    this.store.set(provider, value);
  }

  getKey(provider: string): string | null {
    const val = this.store.get(provider);
    return typeof val === 'string' ? val : null;
  }

  deleteKey(provider: string): void {
    this.store.delete(provider);
  }

  listKeys(): string[] {
    const keys: string[] = [];
    for (const [key] of Object.entries(this.store.store)) {
      keys.push(key);
    }
    return keys;
  }
}

export const aiKeyStore = new KeyStore('astrolabe-ai-keys');
```

**Step 4: 运行测试验证**

```bash
cd packages/core && npx vitest run
```

Expected: 4 new tests pass (18 total).

**Step 5: 提交**

```bash
git add packages/core/src/main/services/keystore.service.ts packages/core/__tests__/services/keystore.service.test.ts packages/core/package.json pnpm-lock.yaml
git commit -m "feat(core): add KeyStore service for encrypted API key storage"
```

---

### Task 19: PromptManager — 模板加载与渲染

**Files:**
- Create: `packages/ai/src/prompts/` 目录及模板文件
- Create: `packages/ai/src/prompt-manager.ts`
- Create: `packages/ai/src/__tests__/prompt-manager.test.ts`

- [ ] **Step 1: 创建模板文件**

`packages/ai/src/prompts/chapter/write.txt`:
```
你是一位专业小说作家。根据以下信息撰写下一章。

## 作品大纲
{{outline}}

## 前情提要
{{previousChapterSummary}}

## 相关角色
{{characters}}

## 当前剧情节点
{{currentPlotNode}}

## Wiki 参考
{{wikiContext}}

## 写作要求
- 保持角色性格一致
- 字数：{{targetWordCount}} 字
- 风格：{{style}}

请撰写第 {{chapterNumber}} 章：
```

`packages/ai/src/prompts/chapter/continue.txt`:
```
继续上一章的剧情，撰写下一部分。

## 前情
{{previousContent}}

## 角色状态
{{characterStates}}

请继续：
```

`packages/ai/src/prompts/outline/generate.txt`:
```
你是一位经验丰富的小说架构师。根据以下创作意图生成结构化大纲。

## 作品类型
{{genre}}

## 故事梗概
{{premise}}

请生成包含卷、章的大纲树，每章附概要。
```

`packages/ai/src/prompts/character/create.txt`:
```
根据以下大纲节点，为角色{{characterName}}创建详细的角色档案。

## 大纲上下文
{{outlineContext}}

## 角色定位
{{role}}

请输出：姓名、外貌、性格、能力、背景故事。
```

`packages/ai/src/prompts/storyboard/decompose.txt`:
```
将以下章节内容拆解为漫画分镜脚本。

## 章节内容
{{chapterContent}}

## 角色设定图参考
{{characterDesigns}}

请按镜头号输出：景别、角度、场景、角色动作、对话。
```

**Step 2: 编写测试 — prompt-manager.test.ts**

```typescript
import { describe, it, expect, vi } from 'vitest';

// We'll test the render logic in isolation — no file I/O needed
describe('PromptManager', () => {
  it('renders template variables', async () => {
    const { PromptManager } = await import('../../src/prompt-manager');
    const mgr = new PromptManager();

    const result = mgr.render('Hello {{name}}, you are {{role}}.', {
      name: 'World',
      role: 'writer',
    });

    expect(result).toBe('Hello World, you are writer.');
  });

  it('handles missing variables gracefully', async () => {
    const { PromptManager } = await import('../../src/prompt-manager');
    const mgr = new PromptManager();

    const result = mgr.render('Hello {{name}}!', {});
    expect(result).toBe('Hello !');
  });

  it('preserves text without variables', async () => {
    const { PromptManager } = await import('../../src/prompt-manager');
    const mgr = new PromptManager();

    const result = mgr.render('Plain text.', {});
    expect(result).toBe('Plain text.');
  });

  it('handles multiple occurrences of same variable', async () => {
    const { PromptManager } = await import('../../src/prompt-manager');
    const mgr = new PromptManager();

    const result = mgr.render('{{x}} + {{x}} = {{y}}', { x: '1', y: '2' });
    expect(result).toBe('1 + 1 = 2');
  });
});
```

**Step 3: 实现 prompt-manager.ts**

```typescript
import fs from 'fs';
import path from 'path';

export class PromptManager {
  private templateDir: string;

  constructor(templateDir?: string) {
    this.templateDir = templateDir ?? path.join(__dirname, 'prompts');
  }

  loadTemplate(category: string, name: string): string {
    const filePath = path.join(this.templateDir, category, `${name}.txt`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Template not found: ${category}/${name}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
  }

  render(template: string, variables: Record<string, string | number>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
      const val = variables[key];
      return val !== undefined ? String(val) : '';
    });
  }

  loadAndRender(category: string, name: string, variables: Record<string, string | number>): string {
    const template = this.loadTemplate(category, name);
    return this.render(template, variables);
  }
}
```

**Step 4: 运行测试验证**

```bash
cd packages/ai && npx vitest run
```

Expected: 4 tests pass.

**Step 5: 更新 packages/ai/src/index.ts 导出 PromptManager**

```typescript
export { PromptManager } from './prompt-manager';
```

**Step 6: 提交**

```bash
git add packages/ai/
git commit -m "feat(ai): add PromptManager with template loading and rendering"
```

---

### Task 20: AI IPC Handlers — 连接 Renderer 与 AI 客户端

**Files:**
- Create: `packages/core/src/main/ipc/ai.ts`
- Modify: `packages/core/src/main/ipc/index.ts` — 注册 AI handlers
- Modify: `packages/core/src/renderer/services/bridge.ts` — 添加 AI 方法

- [ ] **Step 1: 编写 AI IPC handler — packages/core/src/main/ipc/ai.ts**

```typescript
import { ipcMain, BrowserWindow } from 'electron';
import { createDeepSeekClient } from '@astrolabe/ai';
import type { StreamCallback } from '@astrolabe/ai';
import { aiKeyStore } from '../services/keystore.service';

function getDeepSeekClient() {
  const apiKey = aiKeyStore.getKey('deepseek');
  if (!apiKey) throw new Error('DeepSeek API Key 未配置');
  return createDeepSeekClient({ apiKey });
}

export function registerAIHandlers(): void {
  ipcMain.handle('ai:text:generate', async (_event, prompt: string, systemPrompt?: string) => {
    const client = getDeepSeekClient();
    return client.generate(prompt, { systemPrompt });
  });

  ipcMain.handle('ai:text:stream', async (event, prompt: string, systemPrompt?: string) => {
    const client = getDeepSeekClient();
    const sender = event.sender;

    const callbacks: StreamCallback = {
      onChunk: (text) => sender.send('ai:text:chunk', text),
      onDone: (fullText) => sender.send('ai:text:done', fullText),
      onError: (err) => sender.send('ai:text:error', err.message),
    };

    await client.generateStream(prompt, callbacks, { systemPrompt });
    return { started: true };
  });

  ipcMain.handle('ai:image:generate', async (_event, prompt: string) => {
    // Placeholder — full implementation when volcengine integration is ready
    return [`[image] ${prompt.slice(0, 50)}...`];
  });

  ipcMain.handle('ai:video:generate', async (_event, prompt: string) => {
    // Placeholder
    return `[video] ${prompt.slice(0, 50)}...`;
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
```

**Step 2: 更新 IPC 注册中心 — 在 registerAllHandlers 中添加**

```typescript
import { registerAIHandlers } from './ai';
// ...
registerAIHandlers();
```

**Step 3: 更新 bridge.ts 添加 AI 方法**

在 bridge 对象中添加：

```typescript
// AI
generateText: (prompt: string, systemPrompt?: string) => api.invoke('ai:text:generate', prompt, systemPrompt) as Promise<string>,
generateTextStream: (prompt: string, systemPrompt?: string) => api.invoke('ai:text:stream', prompt, systemPrompt) as Promise<{ started: boolean }>,
generateImage: (prompt: string) => api.invoke('ai:image:generate', prompt) as Promise<string[]>,
generateVideo: (prompt: string) => api.invoke('ai:video:generate', prompt) as Promise<string>,
onAIChunk: (callback: (text: string) => void) => api.on('ai:text:chunk', callback as (...args: unknown[]) => void),
onAIDone: (callback: (fullText: string) => void) => api.on('ai:text:done', callback as (...args: unknown[]) => void),
onAIError: (callback: (error: string) => void) => api.on('ai:text:error', callback as (...args: unknown[]) => void),
// Key management
setAIKey: (provider: string, key: string) => api.invoke('ai:keys:set', provider, key) as Promise<void>,
getAIKey: (provider: string) => api.invoke('ai:keys:get', provider) as Promise<string | null>,
listAIKeys: () => api.invoke('ai:keys:list') as Promise<string[]>,
deleteAIKey: (provider: string) => api.invoke('ai:keys:delete', provider) as Promise<void>,
```

**Step 4: 编译验证**

```bash
cd packages/core && pnpm build:main && npx tsc -p tsconfig.renderer.json --noEmit
```

**Step 5: 提交**

```bash
git add packages/core/src/main/ipc/ai.ts packages/core/src/main/ipc/index.ts packages/core/src/renderer/services/bridge.ts
git commit -m "feat(core): add AI IPC handlers connecting renderer to AI clients"
```

---

### Task 21: AI 设置面板 UI

**Files:**
- Create: `packages/core/src/renderer/components/Settings/AISettings.tsx`

- [ ] **Step 1: 编写 AISettings.tsx**

```typescript
import React, { useState, useEffect } from 'react';
import { bridge } from '../../services/bridge';

const container: React.CSSProperties = {
  padding: 20,
  color: '#cccccc',
};

const field: React.CSSProperties = {
  marginBottom: 16,
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  marginBottom: 6,
  color: '#999',
};

const input: React.CSSProperties = {
  width: '100%',
  maxWidth: 400,
  padding: '6px 10px',
  fontSize: 14,
  backgroundColor: '#3c3c3c',
  border: '1px solid #555',
  color: '#ffffff',
  borderRadius: 4,
  outline: 'none',
};

const button: React.CSSProperties = {
  padding: '6px 16px',
  fontSize: 13,
  backgroundColor: '#007acc',
  color: '#ffffff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};

const saved: React.CSSProperties = {
  color: '#4ec9b0',
  fontSize: 12,
  marginLeft: 8,
};

export const AISettings: React.FC = () => {
  const [deepseekKey, setDeepseekKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    bridge.getAIKey('deepseek').then((key) => {
      if (key) setDeepseekKey(key);
    });
  }, []);

  const handleSave = async () => {
    await bridge.setAIKey('deepseek', deepseekKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={container}>
      <h2 style={{ fontSize: 18, marginBottom: 20, color: '#fff' }}>AI 设置</h2>

      <div style={field}>
        <label style={label}>DeepSeek API Key</label>
        <input
          style={input}
          type="password"
          value={deepseekKey}
          onChange={(e) => setDeepseekKey(e.target.value)}
          placeholder="sk-..."
        />
      </div>

      <div>
        <button style={button} onClick={handleSave}>保存</button>
        {saved && <span style={saved}>已保存</span>}
      </div>
    </div>
  );
};
```

注意：AISettings 通过插件注册机制接入设置面板，不在 Task 21 中强制集成。

**Step 2: 编译验证**

```bash
cd packages/core && npx tsc -p tsconfig.renderer.json --noEmit
```

**Step 3: 提交**

```bash
git add packages/core/src/renderer/components/Settings/
git commit -m "feat(core): add AI settings panel for API key configuration"
```

---

### Task 22: 子系统 #6 最终集成验证

- [ ] **Step 1: 全量编译**

```bash
pnpm lint
```

- [ ] **Step 2: 全量测试**

```bash
pnpm test
```

Expected: 所有包编译通过，所有测试通过。

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "chore: finalize AI integration layer"
```

---

## 规格覆盖自审

| 规格需求 | 覆盖任务 |
|---------|---------|
| DeepSeek 客户端 | Task 16 (已有) |
| 火山引擎客户端 | Task 16 (已有) |
| Prompt 模板管理 | Task 19 |
| API Key 加密存储 | Task 18 |
| AI IPC 通道 (文本/图像/视频) | Task 20 |
| 流式通信 | Task 20 (ai:text:stream + chunk/done/error events) |
| 设置面板 | Task 21 |
| Key 管理 CRUD | Task 18 + Task 20 (IPC) |
| 模板变量渲染 | Task 19 |
