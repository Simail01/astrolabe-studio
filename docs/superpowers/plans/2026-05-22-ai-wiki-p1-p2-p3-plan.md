# AI Wiki P1+P2+P3 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 补齐 Wiki AI 全部能力——补充已有条目（P1）、一致性检查（P2）、智能关系发现（P3）。

**Architecture:** 每个功能遵循相同模式：Prompt 模板 → IPC handler → 按钮触发 → UI 展示结果。P1 复用 wiki:extract 的架构模式；P2 新增 wiki:consistency handler；P3 新增 wiki:relations handler。

**Tech Stack:** 已有技术栈。

---

### Task W6: P1+P2+P3 Prompt 模板

**Files:**
- Create: `packages/ai/src/prompts/wiki/enrich.txt`
- Create: `packages/ai/src/prompts/wiki/consistency.txt`
- Create: `packages/ai/src/prompts/wiki/relations.txt`

**enrich.txt:**
```
你是一位小说编辑助理。请扫描以下章节内容，提取关于"{{entryTitle}}"（类型：{{entryType}}）的新信息。

## 当前已有属性
{{existingAttributes}}

## 全文搜索范围
{{allChapters}}

## 请分析
1. 是否有新的描述与已有属性不同？（建议：追加或覆盖）
2. 是否有全新的属性尚未记录？（建议：新增）
3. 是否有别名的使用？（建议：补充别名）

## 输出 JSON
[{
  "field": "属性名",
  "currentValue": "当前值（无则为空）",
  "newValue": "新发现的值",
  "action": "append|overwrite|add",
  "evidence": "原文依据",
  "sourceChapter": "章节标题"
}]

只输出 JSON 数组。
```

**consistency.txt:**
```
你是一位小说校对员。请对比以下 Wiki 设定与各章节描述，查找矛盾。

## Wiki 条目及其属性
{{wikiEntries}}

## 各章节内容
{{allChapters}}

## 请检查
1. 角色生死状态是否前后一致
2. 角色外貌/性格/能力描述是否矛盾
3. 地点/物品描述是否冲突
4. 时间线是否合理（同角色同时出现在两地）

## 输出 JSON
[{
  "entryTitle": "条目名",
  "field": "矛盾属性",
  "chapterA": "第X章",
  "valueA": "描述A",
  "chapterB": "第Y章",
  "valueB": "描述B",
  "severity": "critical|warning|info",
  "suggestion": "修改建议"
}]

只输出 JSON 数组。severity 分级：critical=生死/存在性矛盾，warning=属性明显不一致，info=时间线/位置可疑。
```

**relations.txt:**
```
你是一位小说编辑助理。请分析各章节中 Wiki 条目间的互动关系。

## Wiki 条目列表
{{wikiEntries}}

## 各章节内容
{{allChapters}}

## 请分析条目间的关系类型
- 师徒、结义、上下级、敌对、血缘、盟友、恋人、其他

## 输出 JSON
[{
  "sourceId": "条目A的ID",
  "sourceTitle": "条目A名称",
  "targetTitle": "条目B名称（不在Wiki中则用标题）",
  "relationType": "关系类型",
  "confidence": 0.85,
  "evidence": "原文依据",
  "sourceChapter": "第X章"
}]

只输出 JSON 数组。confidence < 0.5 的不输出。
```

- [ ] **Step 1:** 创建三个模板文件
- [ ] **Step 2:** `cd packages/ai && pnpm build`
- [ ] **Step 3:** 提交 `git add -A && git commit -m "feat(ai): add wiki enrich, consistency, and relations prompt templates"`

---

### Task W7: P1+P2+P3 IPC Handlers

**Files:**
- Modify: `packages/core/src/main/ipc/wiki.ts` — 添加三个 handler
- Modify: `packages/core/src/renderer/services/bridge.ts` — 添加三个 bridge 方法

**Step 1: 添加 IPC handler**

在 `wiki.ts` 的 `registerWikiHandlers()` 中添加（在 wiki:extract 之后）：

```typescript
  // P1: Enrich existing entry
  ipcMain.handle('wiki:enrich', async (_event, projectPath: string, entryId: string, entryTitle: string, entryType: string) => {
    const index = wikiService.listEntries(projectPath);
    const chaptersDir = path.join(projectPath, 'chapters');
    const { fileService } = await import('../services/file.service');
    let allChapters = '';
    if (fileService.exists(chaptersDir)) {
      const files = fileService.readDir(chaptersDir).filter((f: string) => f.endsWith('.json'));
      for (const f of files) {
        const ch = JSON.parse(fileService.readFile(path.join(chaptersDir, f)));
        allChapters += `\n## ${ch.title}\n${ch.content}\n`;
      }
    }
    
    const entry = wikiService.getEntry(projectPath, entryType, entryId);
    const existingAttrs = entry ? JSON.stringify(entry.attributes) : '{}';

    const { PromptManager } = await import('@astrolabe/ai');
    const mgr = new PromptManager();
    const prompt = mgr.loadAndRender('wiki', 'enrich', {
      entryTitle, entryType, existingAttributes: existingAttrs, allChapters,
    });

    const apiKey = aiKeyStore.getKey('deepseek');
    if (!apiKey) throw new Error('DeepSeek API Key 未配置');
    const { createDeepSeekClient } = await import('@astrolabe/ai');
    const client = createDeepSeekClient({ apiKey });
    const raw = await client.generate(prompt, {
      systemPrompt: '你是一个 JSON 输出引擎。只输出 JSON 数组。',
      temperature: 0.3, maxTokens: 4096,
    });

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI 未返回有效的 JSON');
    return JSON.parse(jsonMatch[0]);
  });

  // P2: Consistency check
  ipcMain.handle('wiki:consistency', async (_event, projectPath: string) => {
    const entries = wikiService.search(projectPath, '');
    const entriesStr = entries.map(e => `[${e.type}] ${e.title}: ${JSON.stringify(e.attributes)}`).join('\n');
    
    const chaptersDir = path.join(projectPath, 'chapters');
    const { fileService } = await import('../services/file.service');
    let allChapters = '';
    if (fileService.exists(chaptersDir)) {
      const files = fileService.readDir(chaptersDir).filter((f: string) => f.endsWith('.json'));
      for (const f of files) {
        const ch = JSON.parse(fileService.readFile(path.join(chaptersDir, f)));
        allChapters += `\n## ${ch.title}\n${ch.content}\n`;
      }
    }

    const { PromptManager } = await import('@astrolabe/ai');
    const mgr = new PromptManager();
    const prompt = mgr.loadAndRender('wiki', 'consistency', { wikiEntries: entriesStr, allChapters });

    const apiKey = aiKeyStore.getKey('deepseek');
    if (!apiKey) throw new Error('DeepSeek API Key 未配置');
    const { createDeepSeekClient } = await import('@astrolabe/ai');
    const client = createDeepSeekClient({ apiKey });
    const raw = await client.generate(prompt, {
      systemPrompt: '你是一个 JSON 输出引擎。只输出 JSON 数组。',
      temperature: 0.3, maxTokens: 4096,
    });

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI 未返回有效的 JSON');
    return JSON.parse(jsonMatch[0]);
  });

  // P3: Relation discovery
  ipcMain.handle('wiki:relations', async (_event, projectPath: string) => {
    const index = wikiService.listEntries(projectPath);
    const entriesStr = index.map(e => `${e.id}|[${e.type}] ${e.title}`).join('\n');
    
    const chaptersDir = path.join(projectPath, 'chapters');
    const { fileService } = await import('../services/file.service');
    let allChapters = '';
    if (fileService.exists(chaptersDir)) {
      const files = fileService.readDir(chaptersDir).filter((f: string) => f.endsWith('.json'));
      for (const f of files) {
        const ch = JSON.parse(fileService.readFile(path.join(chaptersDir, f)));
        allChapters += `\n## ${ch.title}\n${ch.content}\n`;
      }
    }

    const { PromptManager } = await import('@astrolabe/ai');
    const mgr = new PromptManager();
    const prompt = mgr.loadAndRender('wiki', 'relations', { wikiEntries: entriesStr, allChapters });

    const apiKey = aiKeyStore.getKey('deepseek');
    if (!apiKey) throw new Error('DeepSeek API Key 未配置');
    const { createDeepSeekClient } = await import('@astrolabe/ai');
    const client = createDeepSeekClient({ apiKey });
    const raw = await client.generate(prompt, {
      systemPrompt: '你是一个 JSON 输出引擎。只输出 JSON 数组。',
      temperature: 0.3, maxTokens: 4096,
    });

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI 未返回有效的 JSON');
    return JSON.parse(jsonMatch[0]);
  });
```

需要在 wiki.ts 顶部添加 `import path from 'path';`

**Step 2: 更新 bridge.ts**

添加：
```typescript
  wikiEnrich: (projectPath: string, entryId: string, entryTitle: string, entryType: string) => api.invoke('wiki:enrich', projectPath, entryId, entryTitle, entryType) as Promise<unknown[]>,
  wikiConsistency: (projectPath: string) => api.invoke('wiki:consistency', projectPath) as Promise<unknown[]>,
  wikiRelations: (projectPath: string) => api.invoke('wiki:relations', projectPath) as Promise<unknown[]>,
```

**Step 3: 编译验证**

```bash
cd packages/core && npx tsc -p tsconfig.main.json --noEmit && npx tsc -p tsconfig.renderer.json --noEmit
```

**Step 4: 提交**

```bash
git add -A && git commit -m "feat(core): add wiki enrich, consistency check, and relation discovery IPC handlers"
```

---

### Task W8: P1+P2+P3 UI — RightPanel 功能按钮 + 结果显示

**Files:**
- Modify: `packages/core/src/renderer/components/RightPanel/RightPanel.tsx` — 添加 P1/P2/P3 按钮和结果展示

**Step 1: 在 Wiki 知识库标题栏添加功能按钮**

在 Wiki 条目详情区域之前，添加三个按钮和结果展示区域。按钮样式：

```typescript
const actionBtn: React.CSSProperties = {
  padding: '4px 10px', fontSize: 11, backgroundColor: '#0e639c', color: '#fff',
  border: 'none', borderRadius: 3, cursor: 'pointer',
};
```

在搜索框下方、条目列表上方添加：

```typescript
<div style={{ display: 'flex', gap: 4, padding: '4px 8px', flexWrap: 'wrap' }}>
  <button style={actionBtn} onClick={handleEnrich} title="AI 补充当前选中条目">
    补充条目
  </button>
  <button style={actionBtn} onClick={handleConsistency} title="AI 扫描全文检查一致性">
    一致性检查
  </button>
  <button style={{ ...actionBtn, backgroundColor: '#5a3e00' }} onClick={handleRelations} title="AI 分析条目间关系">
    分析关系
  </button>
</div>
```

**Step 2: 添加处理函数和结果展示状态**

在 RightPanel 组件内添加：

```typescript
const [enrichResults, setEnrichResults] = useState<any[] | null>(null);
const [consistencyResults, setConsistencyResults] = useState<any[] | null>(null);
const [relationResults, setRelationResults] = useState<any[] | null>(null);
const [aiWorking, setAiWorking] = useState(''); // 'enrich' | 'consistency' | 'relations' | ''

const handleEnrich = async () => {
  const projectPath = getProjectPath();
  const entry = wiki.entries.find(e => e.id === selectedEntryId);
  if (!projectPath || !entry) return;
  setAiWorking('enrich');
  try {
    const results = await bridge.wikiEnrich(projectPath, entry.id, entry.title, entry.type) as any[];
    setEnrichResults(results);
  } catch(e) { console.error(e); }
  finally { setAiWorking(''); }
};

const handleConsistency = async () => {
  const projectPath = getProjectPath();
  if (!projectPath) return;
  setAiWorking('consistency');
  try {
    const results = await bridge.wikiConsistency(projectPath) as any[];
    setConsistencyResults(results);
  } catch(e) { console.error(e); }
  finally { setAiWorking(''); }
};

const handleRelations = async () => {
  const projectPath = getProjectPath();
  if (!projectPath) return;
  setAiWorking('relations');
  try {
    const results = await bridge.wikiRelations(projectPath) as any[];
    setRelationResults(results);
  } catch(e) { console.error(e); }
  finally { setAiWorking(''); }
};
```

**Step 3: 结果展示区域**

在按钮行下方、条目列表上方，依次展示三种结果：

```typescript
{aiWorking && (
  <div style={{ padding: '8px 12px', backgroundColor: '#094771', color: '#fff', fontSize: 12 }}>
    AI 正在分析...
  </div>
)}
{enrichResults && (
  <div style={{ padding: 8, borderBottom: '1px solid #3c3c3c', maxHeight: 200, overflow: 'auto' }}>
    <div style={{ fontSize: 12, color: '#4ec9b0', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
      <span>📝 发现 {enrichResults.length} 条补充</span>
      <button onClick={() => setEnrichResults(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 12 }}>✕</button>
    </div>
    {enrichResults.map((r: any, i: number) => (
      <div key={i} style={{ padding: '4px 0', fontSize: 12, color: '#ccc' }}>
        <span style={{ color: '#dcdcaa' }}>{r.field}</span>: {r.currentValue ? `${r.currentValue} → ` : ''}{r.newValue}
        <span style={{ color: '#888', marginLeft: 8, fontSize: 10 }}>({r.sourceChapter})</span>
        <span style={{ marginLeft: 8, color: r.action === 'overwrite' ? '#f44747' : r.action === 'append' ? '#4ec9b0' : '#dcdcaa', fontSize: 10 }}>[{r.action}]</span>
      </div>
    ))}
  </div>
)}
{consistencyResults && (
  <div style={{ padding: 8, borderBottom: '1px solid #3c3c3c', maxHeight: 200, overflow: 'auto' }}>
    <div style={{ fontSize: 12, color: '#d4a72c', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
      <span>🔍 发现 {consistencyResults.length} 处矛盾</span>
      <button onClick={() => setConsistencyResults(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 12 }}>✕</button>
    </div>
    {consistencyResults.map((r: any, i: number) => (
      <div key={i} style={{ padding: '4px 0', fontSize: 12, color: '#ccc' }}>
        <span style={{ color: r.severity === 'critical' ? '#f44747' : r.severity === 'warning' ? '#dcdcaa' : '#888' }}>
          {r.severity === 'critical' ? '🔴' : r.severity === 'warning' ? '🟡' : '💭'}
        </span>
        {' '}{r.entryTitle}.{r.field}: {r.chapterA} "{r.valueA}" vs {r.chapterB} "{r.valueB}"
        <div style={{ color: '#888', fontSize: 11 }}>建议: {r.suggestion}</div>
      </div>
    ))}
  </div>
)}
{relationResults && (
  <div style={{ padding: 8, borderBottom: '1px solid #3c3c3c', maxHeight: 200, overflow: 'auto' }}>
    <div style={{ fontSize: 12, color: '#4ec9b0', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
      <span>🔗 发现 {relationResults.length} 条关系</span>
      <button onClick={() => setRelationResults(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 12 }}>✕</button>
    </div>
    {relationResults.map((r: any, i: number) => (
      <div key={i} style={{ padding: '4px 0', fontSize: 12, color: '#ccc' }}>
        <span style={{ color: '#dcdcaa' }}>{r.sourceTitle}</span>
        {' ← '}<span style={{ color: '#4ec9b0' }}>{r.relationType}</span>{' → '}
        <span style={{ color: '#dcdcaa' }}>{r.targetTitle}</span>
        <span style={{ color: '#888', marginLeft: 8, fontSize: 10 }}>({Math.round(r.confidence * 100)}%)</span>
      </div>
    ))}
  </div>
)}
```

**Step 4: 编译验证 + 构建**

```bash
cd packages/core && npx tsc -p tsconfig.renderer.json --noEmit && npx vite build
```

**Step 5: 提交**

```bash
git add -A && git commit -m "feat(core): add wiki enrich, consistency, and relation UI buttons with results display"
```

---

### Task W9: 最终编译 + 构建 + 全量测试

- [ ] **Step 1:** `cd packages/core && npx vitest run`
- [ ] **Step 2:** `cd packages/core && npx tsc -p tsconfig.main.json --noEmit && npx tsc -p tsconfig.renderer.json --noEmit`
- [ ] **Step 3:** `cd packages/ai && pnpm build && cd ../core && npx vite build`
- [ ] **Step 4:** 提交

---

## 规格覆盖自审

| 规格需求 | 覆盖任务 |
|---------|---------|
| P1 Prompt 模板 | W6 (enrich.txt) |
| P1 IPC handler | W7 |
| P1 UI 按钮 + 结果 | W8 |
| P2 Prompt 模板 | W6 (consistency.txt) |
| P2 IPC handler | W7 |
| P2 UI + 分级展示 | W8 |
| P3 Prompt 模板 | W6 (relations.txt) |
| P3 IPC handler | W7 |
| P3 UI + 置信度展示 | W8 |
| 全量验证 | W9 |
