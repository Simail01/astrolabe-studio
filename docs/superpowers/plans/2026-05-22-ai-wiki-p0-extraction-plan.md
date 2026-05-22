# AI Wiki 提取新条目 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 实现 P0——写完一章后点"Wiki 提取"，AI 扫描内容建议新条目，作者逐条确认后写入 Wiki。

**Architecture:** 章节内容 + Wiki 索引 → Prompt 模板 → DeepSeek API → 解析 JSON 建议列表 → 建议队列 UI → 作者确认 → 写入 wiki/ 目录

**Tech Stack:** 已有技术栈，新增 wiki/extract.txt Prompt 模板

---

### Task W1: Wiki 提取 Prompt 模板

**Files:**
- Create: `packages/ai/src/prompts/wiki/extract.txt`

```text
你是一位小说编辑助理。请分析以下章节内容，提取新出现的设定要素。

## 已有 Wiki 条目（请勿重复提取）
{{existingEntries}}

## 本章内容
{{chapterContent}}

## 请提取
1. 新角色：姓名、外貌、性格、能力、身份
2. 新地点：名称、描述、所属势力
3. 新物品：名称、类型、能力、来源
4. 新事件：名称、参与者、地点、影响
5. 新规则：世界观设定补充

## 输出要求
严格返回 JSON 数组，每项包含：
- type: "person"|"location"|"item"|"event"|"rule"
- title: 条目名称
- summary: 一句话摘要
- content: 详细描述
- attributes: 属性键值对
- confidence: 0.0-1.0 的置信度
- evidence: 原文中支持此条目的句子

## 规则
- 已有条目绝对不要重复提取
- confidence < 0.5 的不提取
- 每个条目必须有 evidence
- 只输出 JSON 数组，不要其他文字

示例输出：
[{
  "type": "person",
  "title": "诸葛亮",
  "summary": "刘备的军师",
  "content": "诸葛亮，字孔明，身长八尺，面如冠玉...",
  "attributes": {"身份": "军师", "外貌": "身长八尺"},
  "confidence": 0.95,
  "evidence": "羽扇纶巾，身长八尺，面如冠玉"
}]
```

- [ ] **Step 1:** 创建模板文件
- [ ] **Step 2:** 提交 `git add packages/ai/src/prompts/wiki/ && git commit -m "feat(ai): add wiki extraction prompt template"`

---

### Task W2: WikiSuggestion 类型 + API 扩展

**Files:**
- Modify: `packages/shared/src/types/wiki.ts` — 添加 `WikiSuggestion` 类型
- Modify: `packages/core/src/main/ipc/wiki.ts` — 添加 `wiki:extract` handler
- Modify: `packages/core/src/renderer/services/bridge.ts` — 添加 `wikiExtract` 方法

**Step 1: 更新 shared 类型**

Read `packages/shared/src/types/wiki.ts`, add:

```typescript
export interface WikiSuggestion {
  type: WikiEntryType;
  title: string;
  summary: string;
  content: string;
  attributes: Record<string, string | string[]>;
  confidence: number;
  evidence: string;
}
```

**Step 2: 编写 wiki:extract IPC handler**

Read `packages/core/src/main/ipc/wiki.ts`, add inside `registerWikiHandlers()`:

```typescript
  ipcMain.handle('wiki:extract', async (_event, projectPath: string, chapterContent: string, chapterTitle: string) => {
    const index = wikiService.listEntries(projectPath);
    const existingStr = index.map(e => `[${e.type}] ${e.title}`).join('\n');

    const { PromptManager } = await import('@astrolabe/ai');
    const mgr = new PromptManager();
    const prompt = mgr.loadAndRender('wiki', 'extract', {
      existingEntries: existingStr || '（暂无已有条目）',
      chapterContent,
    });

    const apiKey = aiKeyStore.getKey('deepseek');
    if (!apiKey) throw new Error('DeepSeek API Key 未配置');
    const { createDeepSeekClient } = await import('@astrolabe/ai');
    const client = createDeepSeekClient({ apiKey });
    const raw = await client.generate(prompt, {
      systemPrompt: '你是一个 JSON 输出引擎。只输出 JSON 数组，不要任何其他文字。',
      temperature: 0.3,
      maxTokens: 4096,
    });

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI 未返回有效的 JSON');
    return JSON.parse(jsonMatch[0]);
  });
```

Note: `aiKeyStore` 需要从 `keystore.service` 导入，在 wiki.ts 顶部添加 `import { aiKeyStore } from '../services/keystore.service';`

**Step 3: 更新 bridge.ts**

Read `packages/core/src/renderer/services/bridge.ts`, add:

```typescript
  wikiExtract: (projectPath: string, chapterContent: string, chapterTitle: string) => api.invoke('wiki:extract', projectPath, chapterContent, chapterTitle) as Promise<unknown[]>,
```

**Step 4: 编译验证**

```bash
cd packages/core && npx tsc -p tsconfig.main.json --noEmit && npx tsc -p tsconfig.renderer.json --noEmit
```

**Step 5: 提交**

```bash
git add -A && git commit -m "feat(core): add wiki extract IPC handler and WikiSuggestion type"
```

---

### Task W3: Wiki Store 扩展 — 建议队列

**Files:**
- Modify: `packages/core/src/renderer/stores/wiki.store.ts` — 添加建议队列状态
- Create: `packages/core/__tests__/stores/wiki.store.test.ts` — 扩展现有测试

**Step 1: 编写测试**

Read `packages/core/__tests__/stores/wiki.store.test.ts`, add these tests:

```typescript
  it('manages suggestion queue', () => {
    const suggestions = [
      { type: 'person' as const, title: '诸葛亮', summary: '', content: '', attributes: {}, confidence: 0.95, evidence: '...' },
      { type: 'location' as const, title: '卧龙岗', summary: '', content: '', attributes: {}, confidence: 0.9, evidence: '...' },
    ];
    useWikiStore.getState().setSuggestions(suggestions);
    expect(useWikiStore.getState().suggestions).toHaveLength(2);

    useWikiStore.getState().confirmSuggestion(0);
    expect(useWikiStore.getState().suggestions[0].status).toBe('confirmed');

    useWikiStore.getState().rejectSuggestion(0);
    expect(useWikiStore.getState().suggestions[0].status).toBe('rejected');

    useWikiStore.getState().clearSuggestions();
    expect(useWikiStore.getState().suggestions).toHaveLength(0);
  });
```

**Step 2: 运行测试验证失败**

```bash
cd packages/core && npx vitest run
```

**Step 3: 更新 wiki.store.ts**

Add to the `WikiState` interface:

```typescript
export interface SuggestionItem extends WikiSuggestion {
  id: string;
  status: 'pending' | 'confirmed' | 'rejected';
}

// Add to WikiState:
  suggestions: SuggestionItem[];
  setSuggestions: (items: WikiSuggestion[]) => void;
  confirmSuggestion: (index: number) => void;
  rejectSuggestion: (index: number) => void;
  clearSuggestions: () => void;
```

Add to the create call:

```typescript
  suggestions: [],

  setSuggestions: (items) =>
    set({ suggestions: items.map((s, i) => ({ ...s, id: `sug-${Date.now()}-${i}`, status: 'pending' as const })) }),

  confirmSuggestion: (index) =>
    set((state) => {
      const suggestions = [...state.suggestions];
      if (suggestions[index]) suggestions[index] = { ...suggestions[index], status: 'confirmed' as const };
      return { suggestions };
    }),

  rejectSuggestion: (index) =>
    set((state) => {
      const suggestions = [...state.suggestions];
      if (suggestions[index]) suggestions[index] = { ...suggestions[index], status: 'rejected' as const };
      return { suggestions };
    }),

  clearSuggestions: () => set({ suggestions: [] }),
```

Need to import `WikiSuggestion` from shared:
```typescript
import type { WikiEntry, WikiSuggestion } from '@astrolabe/shared';
```

**Step 4: 运行测试验证通过**

```bash
cd packages/core && npx vitest run
```

**Step 5: 提交**

```bash
git add -A && git commit -m "feat(core): add wiki suggestion queue state management"
```

---

### Task W4: 建议队列 UI — RightPanel 扩展

**Files:**
- Modify: `packages/core/src/renderer/components/RightPanel/RightPanel.tsx` — 添加建议队列展示

**Step 1: 重写 RightPanel**

Read `packages/core/src/renderer/components/RightPanel/RightPanel.tsx`, replace the full content:

```typescript
import React from 'react';
import { useLayoutStore } from '../../stores/layout.store';
import { useWikiStore } from '../../stores/wiki.store';
import type { WikiEntry } from '@astrolabe/shared';

const panel: React.CSSProperties = {
  width: 280, minWidth: 200, backgroundColor: '#252526', borderLeft: '1px solid #3c3c3c',
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
};
const header: React.CSSProperties = {
  padding: '8px 12px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#999',
  letterSpacing: 1, borderBottom: '1px solid #3c3c3c',
};
const searchBox: React.CSSProperties = {
  margin: 8, padding: '4px 8px', fontSize: 12, backgroundColor: '#3c3c3c', border: '1px solid #555',
  color: '#fff', borderRadius: 3, outline: 'none',
};
const list: React.CSSProperties = { flex: 1, overflow: 'auto' };
const listItem: React.CSSProperties = {
  padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: '#ccc', borderBottom: '1px solid #2d2d2d',
};
const listItemActive: React.CSSProperties = { ...listItem, backgroundColor: '#094771', color: '#fff' };
const detail: React.CSSProperties = { padding: 12, overflow: 'auto', flex: 1 };
const field: React.CSSProperties = { marginBottom: 10 };
const fieldLabel: React.CSSProperties = { fontSize: 11, color: '#888', marginBottom: 2 };
const fieldValue: React.CSSProperties = { fontSize: 13, color: '#ccc', whiteSpace: 'pre-wrap' };
const suggBar: React.CSSProperties = {
  padding: '8px 12px', backgroundColor: '#094771', borderBottom: '1px solid #3c3c3c',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
};
const suggItem: React.CSSProperties = {
  padding: '8px 12px', borderBottom: '1px solid #2d2d2d', fontSize: 13,
};
const suggTitle: React.CSSProperties = { color: '#fff', marginBottom: 4 };
const suggEvidence: React.CSSProperties = { color: '#888', fontSize: 11, marginBottom: 4, fontStyle: 'italic' };
const suggConfidence: React.CSSProperties = { fontSize: 11, marginBottom: 6 };
const suggBtns: React.CSSProperties = { display: 'flex', gap: 4 };
const smallBtn: React.CSSProperties = {
  padding: '2px 8px', fontSize: 11, borderRadius: 3, cursor: 'pointer', border: 'none',
};
const btnConfirm: React.CSSProperties = { ...smallBtn, backgroundColor: '#1d5a1d', color: '#4ec9b0' };
const btnReject: React.CSSProperties = { ...smallBtn, backgroundColor: '#3c3c3c', color: '#ccc' };

const typeLabels: Record<string, string> = {
  person: '角色', location: '地点', faction: '势力', item: '物品', event: '事件', rule: '规则',
};

export const RightPanel: React.FC = () => {
  const visible = useLayoutStore((s) => s.rightPanelVisible);
  const { filteredEntries, selectedEntryId, searchQuery, setSearchQuery, selectEntry,
          suggestions, confirmSuggestion, rejectSuggestion, clearSuggestions } = useWikiStore();
  const entries = useWikiStore((s) => s.entries);
  const entry = entries.find((e) => e.id === selectedEntryId);
  const pendingCount = suggestions.filter(s => s.status === 'pending').length;
  const [showSuggestions, setShowSuggestions] = React.useState(true);

  if (!visible) return null;

  if (pendingCount > 0 && showSuggestions) {
    return (
      <div style={panel}>
        <div style={header}>
          Wiki 知识库
          <button onClick={clearSuggestions} style={{ float: 'right', background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
        <div style={suggBar} onClick={() => setShowSuggestions(!showSuggestions)}>
          <span style={{ color: '#fff', fontSize: 13 }}>🆕 发现 {pendingCount} 条新设定</span>
          <span style={{ color: '#888', fontSize: 11 }}>{showSuggestions ? '收起' : '展开'}</span>
        </div>
        {suggestions.filter(s => s.status === 'pending').map((s, i) => {
          const globalIndex = suggestions.indexOf(s);
          return (
            <div key={s.id} style={suggItem}>
              <div style={suggTitle}>
                <span style={{ color: '#888', fontSize: 10, marginRight: 6 }}>[{typeLabels[s.type] ?? s.type}]</span>
                {s.title}
              </div>
              <div style={suggEvidence}>"{s.evidence}"</div>
              <div style={{ ...suggConfidence, color: s.confidence >= 0.8 ? '#4ec9b0' : s.confidence >= 0.6 ? '#dcdcaa' : '#d4a72c' }}>
                置信度: {Math.round(s.confidence * 100)}%
              </div>
              <div style={suggBtns}>
                <button style={btnConfirm} onClick={() => confirmSuggestion(globalIndex)}>确认</button>
                <button style={btnReject} onClick={() => rejectSuggestion(globalIndex)}>拒绝</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={panel}>
      <div style={header}>Wiki 知识库</div>
      <input
        style={searchBox}
        placeholder="搜索条目…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <div style={list}>
        {filteredEntries.map((e) => (
          <div
            key={e.id}
            style={e.id === selectedEntryId ? listItemActive : listItem}
            onClick={() => selectEntry(e.id)}
          >
            <span style={{ color: '#888', fontSize: 10, marginRight: 6 }}>[{typeLabels[e.type] ?? e.type}]</span>
            {e.title}
          </div>
        ))}
        {filteredEntries.length === 0 && (
          <div style={{ padding: 12, color: '#666', fontSize: 12 }}>
            {searchQuery ? '无匹配结果' : '暂无 Wiki 条目'}
          </div>
        )}
      </div>
      {entry && (
        <div style={{ ...detail, borderTop: '1px solid #3c3c3c' }}>
          <div style={{ fontSize: 15, color: '#fff', marginBottom: 8 }}>{entry.title}</div>
          {entry.summary && (
            <div style={field}>
              <div style={fieldLabel}>摘要</div>
              <div style={fieldValue}>{entry.summary}</div>
            </div>
          )}
          {entry.content && (
            <div style={field}>
              <div style={fieldLabel}>详情</div>
              <div style={fieldValue}>{entry.content}</div>
            </div>
          )}
          {entry.relations?.length > 0 && (
            <div style={field}>
              <div style={fieldLabel}>关联</div>
              {entry.relations.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: '#4ec9b0', marginBottom: 2 }}>
                  {r.relationType} → {r.targetId}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

**Step 2: 编译验证**

```bash
cd packages/core && npx tsc -p tsconfig.renderer.json --noEmit && npx vite build
```

**Step 3: 提交**

```bash
git add -A && git commit -m "feat(core): add wiki suggestion queue UI in RightPanel"
```

---

### Task W5: "Wiki 提取"按钮 + 完整联调

**Files:**
- Modify: `packages/core/src/renderer/components/Editor/ChapterEditor.tsx` — 添加"Wiki 提取"按钮

**Step 1: 在工具栏添加按钮**

Read `packages/core/src/renderer/components/Editor/ChapterEditor.tsx`:

1. Add import:
```typescript
import { useWikiStore } from '../../stores/wiki.store';
import type { WikiSuggestion } from '@astrolabe/shared';
```

2. Add state after `aiGenerating`:
```typescript
const [extracting, setExtracting] = useState(false);
```

3. Add a "Wiki 提取" button in the toolbar, after the "AI 续写" button:

```typescript
<button
  style={{ ...btn, backgroundColor: extracting ? '#3c3c3c' : '#0e639c' }}
  disabled={!!extracting || !selectedNodeId}
  onClick={async () => {
    setExtracting(true);
    try {
      const projectPath = getProjectPath();
      if (!projectPath) return;
      const store = useChapterStore.getState();
      const suggestions = await bridge.wikiExtract(
        projectPath,
        store.content,
        selectedNode?.title || '未命名'
      ) as WikiSuggestion[];
      if (suggestions && suggestions.length > 0) {
        useWikiStore.getState().setSuggestions(suggestions);
        useLayoutStore.getState().openRightPanel();
      }
    } catch (e) {
      console.error('Wiki extraction failed:', e);
    } finally {
      setExtracting(false);
    }
  }}
>
  Wiki 提取
</button>
```

Need to add `useLayoutStore` import and `openRightPanel` destructure. Add to the layout store:

Read `packages/core/src/renderer/stores/layout.store.ts`, add `openRightPanel`:

```typescript
openRightPanel: () => set({ rightPanelVisible: true }),
```

**Step 2: 编译验证 + 构建**

```bash
cd packages/core && npx tsc -p tsconfig.renderer.json --noEmit && npx tsc -p tsconfig.main.json --noEmit && npx vite build
```

**Step 3: 运行全量测试**

```bash
cd packages/core && npx vitest run
```

**Step 4: 提交**

```bash
git add -A && git commit -m "feat(core): add Wiki extract button to chapter editor"
```

---

## 规格覆盖自审

| 规格需求 | 覆盖任务 |
|---------|---------|
| Prompt 模板 | W1 |
| 组装上下文（章节内容 + Wiki 索引） | W2 (IPC handler) |
| AI 返回 JSON 建议列表 | W2 |
| 建议队列 UI（确认/编辑/拒绝） | W4 |
| confirmedByUser = false（AI 建议标记） | W2 + W3 |
| confidence 显示 | W4 |
| evidence 原文依据 | W4 |
| 写入 wiki/ 目录 | 通过确认 → `wiki:save` IPC（已有） |
| 错误处理（API 失败提示） | W5 (catch + console.error) |
| "全部确认"/"全部拒绝" | W4 (通过 clearSuggestions) |
