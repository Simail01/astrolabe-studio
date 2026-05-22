# Wiki 知识库 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 构建 Wiki 知识库系统——条目 CRUD、关系图谱、AI 提取 prompt、上下文查询 API，为 AI 创作管线提供知识注入能力。

**Architecture:** Main 进程 WikiService (文件 I/O) → IPC handlers → Renderer 侧 Zustand store + React UI 组件。条目以 JSON 文件存储在 `{project}/wiki/` 下，按 type 分目录。

**Tech Stack:** 已有技术栈 (Electron + React + Zustand + TypeScript)，无需新依赖。

---

### Task 23: Wiki 类型定义 + 共享类型扩展

**Files:**
- Create: `packages/shared/src/types/wiki.ts`
- Modify: `packages/shared/src/types/index.ts` — 添加 wiki 导出

- [ ] **Step 1: 编写 wiki 类型**

```typescript
export type WikiEntryType = 'person' | 'location' | 'faction' | 'item' | 'event' | 'rule';

export interface WikiEntry {
  id: string;
  type: WikiEntryType;
  title: string;
  aliases: string[];
  summary: string;
  content: string;
  attributes: Record<string, string | string[]>;
  relations: WikiRelation[];
  sourceChapters: string[];
  confidence: number;
  createdAt: string;
  updatedAt: string;
  confirmedByUser: boolean;
}

export interface WikiRelation {
  targetId: string;
  relationType: string;
  description: string;
}

export interface WikiIndex {
  entries: { id: string; type: WikiEntryType; title: string; aliases: string[] }[];
  updatedAt: string;
}
```

- [ ] **Step 2: 更新 types/index.ts** 添加 `export * from './wiki';`

- [ ] **Step 3: 编译验证**

```bash
cd packages/shared && npx tsc --noEmit
```

- [ ] **Step 4: 提交**

```bash
git add packages/shared/src/types/wiki.ts packages/shared/src/types/index.ts
git commit -m "feat(shared): add Wiki entry and relation type definitions"
```

---

### Task 24: WikiService — 条目文件 I/O (Main 侧)

**Files:**
- Create: `packages/core/src/main/services/wiki.service.ts`
- Create: `packages/core/__tests__/services/wiki.service.test.ts`

- [ ] **Step 1: 编写测试（TDD）**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WikiEntry } from '@astrolabe/shared';

const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockReadDir = vi.fn();
const mockExists = vi.fn();
const mockMkdir = vi.fn();

vi.mock('./file.service', () => ({
  fileService: {
    readFile: (p: string) => mockReadFile(p),
    writeFile: (p: string, d: string) => mockWriteFile(p, d),
    readDir: (p: string) => mockReadDir(p),
    exists: (p: string) => mockExists(p),
    mkdir: (p: string) => mockMkdir(p),
  },
}));

describe('WikiService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a wiki entry', async () => {
    mockExists.mockReturnValue(true);
    mockReadFile.mockReturnValue(JSON.stringify({ entries: [], updatedAt: '' }));

    const { wikiService } = await import('../../src/main/services/wiki.service');
    const entry: WikiEntry = {
      id: 'w1', type: 'person', title: '诸葛亮', aliases: ['孔明'],
      summary: '蜀汉丞相', content: '详细描述...', attributes: { 身份: '丞相' },
      relations: [], sourceChapters: ['ch-001'], confidence: 1,
      createdAt: '', updatedAt: '', confirmedByUser: true,
    };
    mockExists.mockReturnValueOnce(false); // entry file doesn't exist yet

    wikiService.saveEntry('/project', entry);
    expect(mockWriteFile).toHaveBeenCalled();
    expect(mockMkdir).toHaveBeenCalled();
  });

  it('reads a wiki entry by id', async () => {
    const entryData = { id: 'w1', type: 'person', title: '诸葛亮', aliases: [], summary: '', content: '', attributes: {}, relations: [], sourceChapters: [], confidence: 1, createdAt: '', updatedAt: '', confirmedByUser: true };
    mockExists.mockReturnValue(true);
    mockReadFile.mockReturnValue(JSON.stringify(entryData));

    const { wikiService } = await import('../../src/main/services/wiki.service');
    const entry = wikiService.getEntry('/project', 'person', 'w1');
    expect(entry?.title).toBe('诸葛亮');
  });

  it('lists entries by type', async () => {
    mockReadDir.mockReturnValue(['w1.json', 'w2.json']);
    const { wikiService } = await import('../../src/main/services/wiki.service');
    const list = wikiService.listEntries('/project', 'person');
    expect(list).toHaveLength(2);
  });

  it('deletes an entry', async () => {
    mockExists.mockReturnValue(true);
    mockReadFile.mockReturnValue(JSON.stringify({ entries: [{ id: 'w1', type: 'person', title: '诸葛亮', aliases: [] }], updatedAt: '' }));
    
    const { wikiService } = await import('../../src/main/services/wiki.service');
    wikiService.deleteEntry('/project', 'person', 'w1');
    // verify index was updated
    expect(mockWriteFile).toHaveBeenCalled();
  });

  it('searches entries by keyword', async () => {
    mockReadDir.mockReturnValue(['w1.json', 'w2.json']);
    mockExists.mockReturnValue(true);
    mockReadFile
      .mockReturnValueOnce(JSON.stringify({ id: 'w1', type: 'person', title: '诸葛亮', aliases: ['孔明'], summary: '蜀汉丞相' }))
      .mockReturnValueOnce(JSON.stringify({ id: 'w2', type: 'person', title: '曹操', aliases: ['孟德'], summary: '魏王' }));

    const { wikiService } = await import('../../src/main/services/wiki.service');
    const results = wikiService.search('/project', '丞相');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('诸葛亮');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
cd packages/core && npx vitest run
```

- [ ] **Step 3: 实现 wiki.service.ts**

```typescript
import path from 'path';
import { fileService } from './file.service';
import type { WikiEntry, WikiIndex } from '@astrolabe/shared';
import { randomUUID } from 'crypto';

const INDEX_FILE = 'wiki-index.json';

function getWikiDir(projectPath: string): string {
  return path.join(projectPath, 'wiki');
}

function getTypeDir(projectPath: string, type: string): string {
  return path.join(getWikiDir(projectPath), type);
}

function loadIndex(projectPath: string): WikiIndex {
  const indexPath = path.join(getWikiDir(projectPath), INDEX_FILE);
  if (!fileService.exists(indexPath)) {
    return { entries: [], updatedAt: new Date().toISOString() };
  }
  return JSON.parse(fileService.readFile(indexPath)) as WikiIndex;
}

function saveIndex(projectPath: string, index: WikiIndex): void {
  index.updatedAt = new Date().toISOString();
  fileService.writeFile(
    path.join(getWikiDir(projectPath), INDEX_FILE),
    JSON.stringify(index, null, 2)
  );
}

export const wikiService = {
  saveEntry(projectPath: string, entry: WikiEntry): void {
    const typeDir = getTypeDir(projectPath, entry.type);
    fileService.mkdir(typeDir);

    entry.updatedAt = new Date().toISOString();
    if (!entry.createdAt) entry.createdAt = entry.updatedAt;
    if (!entry.id) entry.id = randomUUID();

    const filePath = path.join(typeDir, `${entry.id}.json`);
    fileService.writeFile(filePath, JSON.stringify(entry, null, 2));

    const index = loadIndex(projectPath);
    const existing = index.entries.findIndex((e) => e.id === entry.id);
    const idxEntry = { id: entry.id, type: entry.type, title: entry.title, aliases: entry.aliases };
    if (existing >= 0) {
      index.entries[existing] = idxEntry;
    } else {
      index.entries.push(idxEntry);
    }
    saveIndex(projectPath, index);
  },

  getEntry(projectPath: string, type: string, id: string): WikiEntry | null {
    const filePath = path.join(getTypeDir(projectPath, type), `${id}.json`);
    if (!fileService.exists(filePath)) return null;
    return JSON.parse(fileService.readFile(filePath)) as WikiEntry;
  },

  listEntries(projectPath: string, type?: string): { id: string; type: string; title: string; aliases: string[] }[] {
    const index = loadIndex(projectPath);
    if (type) return index.entries.filter((e) => e.type === type);
    return index.entries;
  },

  deleteEntry(projectPath: string, type: string, id: string): void {
    const filePath = path.join(getTypeDir(projectPath, type), `${id}.json`);
    if (fileService.exists(filePath)) {
      // Remove file (can't use fs.unlinkSync directly since it's in fileService)
      fileService.writeFile(filePath, ''); // mark as deleted
    }
    const index = loadIndex(projectPath);
    index.entries = index.entries.filter((e) => e.id !== id);
    saveIndex(projectPath, index);
  },

  search(projectPath: string, query: string): WikiEntry[] {
    const q = query.toLowerCase();
    const results: WikiEntry[] = [];
    const index = loadIndex(projectPath);

    for (const idxEntry of index.entries) {
      if (
        idxEntry.title.toLowerCase().includes(q) ||
        idxEntry.aliases.some((a) => a.toLowerCase().includes(q))
      ) {
        const entry = wikiService.getEntry(projectPath, idxEntry.type, idxEntry.id);
        if (entry) results.push(entry);
      }
    }

    return results;
  },

  getRelatedEntries(projectPath: string, entryId: string): WikiEntry[] {
    const index = loadIndex(projectPath);
    const related: WikiEntry[] = [];

    for (const idxEntry of index.entries) {
      const entry = wikiService.getEntry(projectPath, idxEntry.type, idxEntry.id);
      if (!entry) continue;
      if (entry.relations.some((r) => r.targetId === entryId)) {
        related.push(entry);
      }
    }

    return related;
  },
};
```

- [ ] **Step 4: 运行测试验证通过**

```bash
cd packages/core && npx vitest run
```

- [ ] **Step 5: 编译验证**

```bash
cd packages/core && npx tsc -p tsconfig.main.json --noEmit
```

- [ ] **Step 6: 提交**

```bash
git add packages/core/src/main/services/wiki.service.ts packages/core/__tests__/services/wiki.service.test.ts
git commit -m "feat(core): add WikiService for entry CRUD and search"
```

---

### Task 25: Wiki IPC Handlers + Bridge 更新

**Files:**
- Create: `packages/core/src/main/ipc/wiki.ts`
- Modify: `packages/core/src/main/ipc/index.ts` — 注册 wiki handlers
- Modify: `packages/core/src/renderer/services/bridge.ts` — 添加 wiki 方法

- [ ] **Step 1: 编写 wiki IPC handler**

```typescript
import { ipcMain } from 'electron';
import { wikiService } from '../services/wiki.service';

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
}
```

- [ ] **Step 2: 更新 ipc/index.ts**

```typescript
import { registerWikiHandlers } from './wiki';
// 在 registerAllHandlers 中添加:
registerWikiHandlers();
```

- [ ] **Step 3: 更新 bridge.ts** 添加 wiki 方法

```typescript
  // Wiki
  wikiSave: (projectPath: string, entry: unknown) => api.invoke('wiki:save', projectPath, entry) as Promise<void>,
  wikiGet: (projectPath: string, type: string, id: string) => api.invoke('wiki:get', projectPath, type, id) as Promise<unknown>,
  wikiList: (projectPath: string, type?: string) => api.invoke('wiki:list', projectPath, type) as Promise<unknown[]>,
  wikiDelete: (projectPath: string, type: string, id: string) => api.invoke('wiki:delete', projectPath, type, id) as Promise<void>,
  wikiSearch: (projectPath: string, query: string) => api.invoke('wiki:search', projectPath, query) as Promise<unknown[]>,
  wikiRelated: (projectPath: string, entryId: string) => api.invoke('wiki:related', projectPath, entryId) as Promise<unknown[]>,
```

- [ ] **Step 4: 编译验证**

```bash
cd packages/core && npx tsc -p tsconfig.main.json --noEmit && npx tsc -p tsconfig.renderer.json --noEmit
```

- [ ] **Step 5: 提交**

```bash
git add packages/core/src/main/ipc/wiki.ts packages/core/src/main/ipc/index.ts packages/core/src/renderer/services/bridge.ts
git commit -m "feat(core): add Wiki IPC handlers and bridge methods"
```

---

### Task 26: Wiki Zustand Store (Renderer 侧)

**Files:**
- Create: `packages/core/src/renderer/stores/wiki.store.ts`
- Create: `packages/core/__tests__/stores/wiki.store.test.ts`

- [ ] **Step 1: 编写测试**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useWikiStore } from '../../src/renderer/stores/wiki.store';

describe('useWikiStore', () => {
  beforeEach(() => {
    useWikiStore.setState({ entries: [], selectedEntryId: null, searchQuery: '' });
  });

  it('starts with empty entries', () => {
    expect(useWikiStore.getState().entries).toHaveLength(0);
  });

  it('sets entries and selects one', () => {
    const entries = [
      { id: 'w1', type: 'person' as const, title: '诸葛亮', aliases: [], summary: '', content: '', attributes: {}, relations: [], sourceChapters: [], confidence: 1, createdAt: '', updatedAt: '', confirmedByUser: true },
    ];
    useWikiStore.getState().setEntries(entries);
    expect(useWikiStore.getState().entries).toHaveLength(1);

    useWikiStore.getState().selectEntry('w1');
    expect(useWikiStore.getState().selectedEntryId).toBe('w1');
  });

  it('filters entries by search query', () => {
    const entries = [
      { id: 'w1', type: 'person' as const, title: '诸葛亮', aliases: ['孔明'], summary: '蜀汉', content: '', attributes: {}, relations: [], sourceChapters: [], confidence: 1, createdAt: '', updatedAt: '', confirmedByUser: true },
      { id: 'w2', type: 'person' as const, title: '曹操', aliases: [], summary: '魏', content: '', attributes: {}, relations: [], sourceChapters: [], confidence: 1, createdAt: '', updatedAt: '', confirmedByUser: true },
    ];
    useWikiStore.getState().setEntries(entries);
    useWikiStore.getState().setSearchQuery('孔明');
    expect(useWikiStore.getState().filteredEntries).toHaveLength(1);
    expect(useWikiStore.getState().filteredEntries[0].id).toBe('w1');
  });
});
```

- [ ] **Step 2: 实现 wiki.store.ts**

```typescript
import { create } from 'zustand';
import type { WikiEntry } from '@astrolabe/shared';

interface WikiState {
  entries: WikiEntry[];
  selectedEntryId: string | null;
  searchQuery: string;
  filteredEntries: WikiEntry[];
  setEntries: (entries: WikiEntry[]) => void;
  addOrUpdateEntry: (entry: WikiEntry) => void;
  removeEntry: (id: string) => void;
  selectEntry: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useWikiStore = create<WikiState>((set) => ({
  entries: [],
  selectedEntryId: null,
  searchQuery: '',
  filteredEntries: [],

  setEntries: (entries) => set({ entries, filteredEntries: entries }),

  addOrUpdateEntry: (entry) =>
    set((state) => {
      const idx = state.entries.findIndex((e) => e.id === entry.id);
      const entries = idx >= 0
        ? [...state.entries.slice(0, idx), entry, ...state.entries.slice(idx + 1)]
        : [...state.entries, entry];
      return { entries, filteredEntries: entries };
    }),

  removeEntry: (id) =>
    set((state) => {
      const entries = state.entries.filter((e) => e.id !== id);
      return {
        entries,
        filteredEntries: entries,
        selectedEntryId: state.selectedEntryId === id ? null : state.selectedEntryId,
      };
    }),

  selectEntry: (id) => set({ selectedEntryId: id }),

  setSearchQuery: (query) =>
    set((state) => {
      const q = query.toLowerCase();
      return {
        searchQuery: query,
        filteredEntries: q
          ? state.entries.filter(
              (e) =>
                e.title.toLowerCase().includes(q) ||
                e.aliases.some((a) => a.toLowerCase().includes(q)) ||
                e.summary.toLowerCase().includes(q)
            )
          : state.entries,
      };
    }),
}));
```

- [ ] **Step 3: 运行测试验证通过**

```bash
cd packages/core && npx vitest run
```

- [ ] **Step 4: 提交**

```bash
git add packages/core/src/renderer/stores/wiki.store.ts packages/core/__tests__/stores/wiki.store.test.ts
git commit -m "feat(core): add Wiki Zustand store with search filtering"
```

---

### Task 27: Wiki UI 组件

**Files:**
- Create: `packages/core/src/renderer/components/Wiki/WikiPanel.tsx`
- Create: `packages/core/src/renderer/components/Wiki/WikiEntryEditor.tsx`

- [ ] **Step 1: 编写 WikiPanel.tsx**

```typescript
import React, { useEffect } from 'react';
import { useWikiStore } from '../../stores/wiki.store';
import { WikiEntryEditor } from './WikiEntryEditor';

const panel: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: '#1e1e1e',
};

const header: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #3c3c3c',
  display: 'flex',
  gap: 8,
};

const searchInput: React.CSSProperties = {
  flex: 1,
  padding: '4px 8px',
  fontSize: 13,
  backgroundColor: '#3c3c3c',
  border: '1px solid #555',
  color: '#fff',
  borderRadius: 3,
  outline: 'none',
};

const list: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
};

const listItem: React.CSSProperties = {
  padding: '8px 12px',
  cursor: 'pointer',
  fontSize: 13,
  borderBottom: '1px solid #2d2d2d',
  color: '#ccc',
};

const listItemActive: React.CSSProperties = {
  ...listItem,
  backgroundColor: '#094771',
  color: '#fff',
};

const typeLabels: Record<string, string> = {
  person: '角色', location: '地点', faction: '势力',
  item: '物品', event: '事件', rule: '规则',
};

export const WikiPanel: React.FC = () => {
  const { filteredEntries, selectedEntryId, searchQuery, setSearchQuery, selectEntry } =
    useWikiStore();

  return (
    <div style={panel}>
      <div style={header}>
        <input
          style={searchInput}
          placeholder="搜索 Wiki 条目…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div style={list}>
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            style={entry.id === selectedEntryId ? listItemActive : listItem}
            onClick={() => selectEntry(entry.id)}
          >
            <span style={{ marginRight: 8, color: '#888', fontSize: 11 }}>
              [{typeLabels[entry.type] ?? entry.type}]
            </span>
            {entry.title}
            {!entry.confirmedByUser && (
              <span style={{ color: '#d4a72c', marginLeft: 6, fontSize: 11 }}>待确认</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: 编写 WikiEntryEditor.tsx**

```typescript
import React from 'react';
import { useWikiStore } from '../../stores/wiki.store';

const container: React.CSSProperties = {
  padding: 16,
  color: '#ccc',
  height: '100%',
  overflow: 'auto',
};

const title: React.CSSProperties = {
  fontSize: 18,
  color: '#fff',
  marginBottom: 4,
};

const field: React.CSSProperties = {
  marginBottom: 12,
};

const fieldLabel: React.CSSProperties = {
  fontSize: 12,
  color: '#999',
  marginBottom: 4,
};

const textArea: React.CSSProperties = {
  width: '100%',
  minHeight: 80,
  padding: '8px',
  fontSize: 13,
  backgroundColor: '#2d2d2d',
  border: '1px solid #555',
  color: '#ccc',
  borderRadius: 3,
  outline: 'none',
  resize: 'vertical',
  fontFamily: 'inherit',
};

const relationItem: React.CSSProperties = {
  padding: '6px 8px',
  marginBottom: 4,
  backgroundColor: '#2d2d2d',
  borderRadius: 3,
  fontSize: 13,
};

const placeholder: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: '#666',
  fontSize: 14,
};

export const WikiEntryEditor: React.FC = () => {
  const { entries, selectedEntryId } = useWikiStore();
  const entry = entries.find((e) => e.id === selectedEntryId);

  if (!entry) {
    return <div style={placeholder}>选择一个条目查看详情</div>;
  }

  return (
    <div style={container}>
      <div style={title}>{entry.title}</div>
      {entry.aliases.length > 0 && (
        <div style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
          别名: {entry.aliases.join('、')}
        </div>
      )}

      <div style={field}>
        <div style={fieldLabel}>摘要</div>
        <div style={{ fontSize: 13 }}>{entry.summary || '暂无摘要'}</div>
      </div>

      <div style={field}>
        <div style={fieldLabel}>详细描述</div>
        <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{entry.content || '暂无详细描述'}</div>
      </div>

      {Object.keys(entry.attributes).length > 0 && (
        <div style={field}>
          <div style={fieldLabel}>属性</div>
          {Object.entries(entry.attributes).map(([key, val]) => (
            <div key={key} style={{ fontSize: 13, marginBottom: 2 }}>
              <span style={{ color: '#888' }}>{key}:</span>{' '}
              {Array.isArray(val) ? val.join('、') : val}
            </div>
          ))}
        </div>
      )}

      {entry.relations.length > 0 && (
        <div style={field}>
          <div style={fieldLabel}>关联条目</div>
          {entry.relations.map((r, i) => (
            <div key={i} style={relationItem}>
              <span style={{ color: '#4ec9b0' }}>{r.relationType}</span>
              {' → '}
              <span style={{ color: '#dcdcaa' }}>{r.targetId}</span>
              {r.description && <span style={{ color: '#888', marginLeft: 8 }}>{r.description}</span>}
            </div>
          ))}
        </div>
      )}

      {entry.sourceChapters.length > 0 && (
        <div style={field}>
          <div style={fieldLabel}>信息来源</div>
          <div style={{ fontSize: 12, color: '#888' }}>{entry.sourceChapters.join('、')}</div>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: 编译验证**

```bash
cd packages/core && npx tsc -p tsconfig.renderer.json --noEmit
```

- [ ] **Step 4: 提交**

```bash
git add packages/core/src/renderer/components/Wiki/
git commit -m "feat(core): add Wiki panel and entry editor components"
```

---

### Task 28: Wiki 集成验证

- [ ] **Step 1: 运行全部测试**

```bash
cd packages/core && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: 全量编译**

```bash
cd packages/core && npx tsc -p tsconfig.main.json --noEmit && npx tsc -p tsconfig.renderer.json --noEmit
cd packages/shared && npx tsc --noEmit
cd packages/ai && npx tsc --noEmit
```

Expected: All packages compile clean.

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "chore: finalize Wiki knowledge base subsystem"
```

---

## 规格覆盖自审

| 规格需求 | 覆盖任务 |
|---------|---------|
| Wiki 条目类型 (6种) | Task 23 (类型定义) |
| WikiEntry 数据模型 | Task 23 |
| WikiRelation 关系模型 | Task 23 |
| 文件存储 (wiki/ 目录) | Task 24 (WikiService) |
| 条目 CRUD | Task 24 + Task 25 (IPC) |
| 搜索/检索 | Task 24 (search) + Task 26 (store filter) |
| 关系图谱查询 | Task 24 (getRelatedEntries) |
| Wiki 面板 UI | Task 27 |
| 条目编辑器 UI | Task 27 |
| 待确认标记 | Task 27 (confirmedByUser badge) |
| AI 提取接口 (预留) | 由子系统 #4 集成 |
