# UI MVP — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 应用新配色方案、三模式全局导航、沉浸式写作页布局、AI 悬浮气泡原型。

**Architecture:** 新 UI 通过 CSS 变量系统统一配色，AppShell 按模式/阶段切换布局，写作页使用独立的 WritingPage 组件替代 ChapterEditor 内联布局。

**Tech Stack:** React 18 + TypeScript + CSS Variables（不引入 Tailwind）

---

## 文件结构

```
packages/core/src/renderer/
├── styles/
│   └── theme.css              # CSS 变量（配色系统）
├── App.tsx                     # 修改：新 Shell + 模式导航
├── components/
│   ├── Shell/
│   │   ├── GlobalNav.tsx       # 新建：顶部全局导航
│   │   ├── LeftPanel.tsx       # 新建：左侧导航面板
│   │   └── BottomBar.tsx       # 新建：底部状态栏
│   ├── Pages/
│   │   └── WritingPage.tsx     # 新建：沉浸式写作页
│   ├── AI/
│   │   └── AIBubble.tsx        # 新建：悬浮 AI 气泡
│   └── ... (existing components)
```

---

## Task M1: CSS 变量配色系统

**Files:**
- Create: `packages/core/src/renderer/styles/theme.css`
- Modify: `packages/core/src/renderer/index.tsx` — import theme.css

```css
:root {
  /* Background layers */
  --bg-base: #1a1b1e;
  --bg-panel: #222325;
  --bg-input: #2a2b2e;
  --bg-hover: #2d2e30;

  /* Borders */
  --border-subtle: #2d2d2d;
  --border-default: #3c3c3c;

  /* Accent */
  --accent: #B08D57;
  --accent-hover: #c9a66b;
  --accent-dim: #3a3520;

  /* Text */
  --text-primary: #d4d4d4;
  --text-secondary: #999999;
  --text-muted: #666666;
  --text-inverse: #ffffff;

  /* Semantic */
  --color-success: #4a9b7a;
  --color-warning: #b0a04a;
  --color-error: #b04a4a;
  --color-info: #6ba3c9;

  /* Sizing */
  --font-body: 16px;
  --font-ui: 13px;
  --font-small: 11px;
  --radius: 4px;
  --radius-lg: 6px;
  --radius-xl: 8px;

  /* Shell */
  --menubar-height: 30px;
  --statusbar-height: 24px;
  --activitybar-width: 40px;
  --left-panel-width: 260px;
  --right-panel-width: 280px;
}
```

Import in `index.tsx`: add `import './styles/theme.css';` at top.

**Commit:** `git add -A && git commit -m "feat(ui): add CSS variable theme system with warm gold palette"`

---

## Task M2: 新 Shell 骨架 + 全局导航

**Files:**
- Create: `packages/core/src/renderer/components/Shell/GlobalNav.tsx`
- Create: `packages/core/src/renderer/components/Shell/LeftPanel.tsx`
- Create: `packages/core/src/renderer/components/Shell/BottomBar.tsx`
- Modify: `packages/core/src/renderer/App.tsx` — 替换为 new Shell

### GlobalNav.tsx

```typescript
import React from 'react';

export type AppMode = 'create' | 'visualize' | 'perform';
export type CreateStage = 'outline' | 'writing';

interface Props {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  stage?: CreateStage;
  onStageChange?: (stage: CreateStage) => void;
}

const modes: { key: AppMode; label: string }[] = [
  { key: 'create', label: '创作' },
  { key: 'visualize', label: '视觉化' },
  { key: 'perform', label: '演出' },
];

const createStages: { key: CreateStage; label: string }[] = [
  { key: 'outline', label: '大纲' },
  { key: 'writing', label: '写作' },
];

export const GlobalNav: React.FC<Props> = ({ mode, onModeChange, stage, onStageChange }) => (
  <div style={{
    height: 'var(--menubar-height)', backgroundColor: 'var(--bg-panel)',
    display: 'flex', alignItems: 'center', padding: '0 16px', gap: 24,
    borderBottom: '1px solid var(--border-subtle)', userSelect: 'none', flexShrink: 0,
  }}>
    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)', marginRight: 8 }}>星盘工坊</span>
    {modes.map(m => (
      <span
        key={m.key}
        onClick={() => onModeChange(m.key)}
        style={{
          fontSize: 'var(--font-ui)', cursor: 'pointer',
          color: mode === m.key ? 'var(--text-inverse)' : 'var(--text-secondary)',
          fontWeight: mode === m.key ? 600 : 400,
          padding: '4px 8px', borderRadius: 'var(--radius)',
          backgroundColor: mode === m.key ? 'var(--accent-dim)' : 'transparent',
        }}
      >{m.label}</span>
    ))}
    {mode === 'create' && onStageChange && (
      <>
        <span style={{ color: 'var(--border-default)', fontSize: 12 }}>│</span>
        {createStages.map(s => (
          <span
            key={s.key}
            onClick={() => onStageChange(s.key)}
            style={{
              fontSize: 'var(--font-ui)', cursor: 'pointer',
              color: stage === s.key ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: stage === s.key ? 500 : 400,
            }}
          >{s.label}</span>
        ))}
      </>
    )}
    <div style={{ flex: 1 }} />
    <span style={{ fontSize: 'var(--font-small)', color: 'var(--text-muted)' }}>v2.0</span>
  </div>
);
```

### BottomBar.tsx

```typescript
import React from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store';

export const BottomBar: React.FC = () => {
  const workspace = useWorkspaceStore(s => s.workspace);
  const activeProject = useWorkspaceStore(s => s.activeProject);
  const label = activeProject ? `${workspace?.name ?? ''} / ${activeProject}` : workspace?.name ?? '未打开项目';

  return (
    <div style={{
      height: 'var(--statusbar-height)', backgroundColor: 'var(--bg-panel)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 12px', fontSize: 'var(--font-small)', color: 'var(--text-secondary)',
      borderTop: '1px solid var(--border-subtle)', flexShrink: 0,
    }}>
      <span>{label}</span>
      <span style={{ color: 'var(--accent)' }}>AI 就绪</span>
    </div>
  );
};
```

### App.tsx (rewrite shell)

```typescript
import React, { useEffect, useState } from 'react';
import { GlobalNav, AppMode, CreateStage } from './components/Shell/GlobalNav';
import { LeftPanel } from './components/Shell/LeftPanel';
import { BottomBar } from './components/Shell/BottomBar';
import { WritingPage } from './components/Pages/WritingPage';
import { Explorer } from './components/Explorer/Explorer';
import { WorkspaceDialog } from './components/Workspace/WorkspaceDialog';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { AIBubble } from './components/AI/AIBubble';
import { useKeyboard } from './hooks/useKeyboard';
import { useWorkspaceStore } from './stores/workspace.store';
import { useLayoutStore } from './stores/layout.store';
import { bridge } from './services/bridge';
import type { Workspace } from '@astrolabe/shared';

export const App: React.FC = () => {
  useKeyboard();
  const [mode, setMode] = useState<AppMode>('create');
  const [stage, setStage] = useState<CreateStage>('outline');
  const [firstRun, setFirstRun] = useState(false);

  useEffect(() => {
    bridge.getLastWorkspace().then((wsPath) => {
      if (wsPath && typeof wsPath === 'string') {
        bridge.openWorkspace(wsPath).then(ws => {
          useWorkspaceStore.getState().setWorkspace(ws as Workspace);
        });
      }
    });
    bridge.getAIKey('deepseek').then(key => { if (!key) setFirstRun(true); });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif' }}>
      <WorkspaceDialog />
      <SettingsPanel />
      <SettingsPanel forceOpen={firstRun} onKeyConfigured={() => setFirstRun(false)} />

      <GlobalNav mode={mode} onModeChange={setMode} stage={stage} onStageChange={setStage} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel — simplified for MVP */}
        {mode === 'create' && <Explorer />}

        {/* Main workspace */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {mode === 'create' && stage === 'writing' && <WritingPage />}
          {mode === 'create' && stage === 'outline' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-body)' }}>
              大纲画布 — 即将实现
            </div>
          )}
          {mode === 'visualize' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-body)' }}>
              视觉化模式 — 即将实现
            </div>
          )}
          {mode === 'perform' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-body)' }}>
              演出模式 — 即将实现
            </div>
          )}
        </div>
      </div>

      <BottomBar />
      <CommandPalette />
      <AIBubble />
    </div>
  );
};
```

**Commit:** `git add -A && git commit -m "feat(ui): add new shell with global nav, bottom bar, and mode switching"`

---

## Task M3: 沉浸式写作页（WritingPage）

**Files:**
- Create: `packages/core/src/renderer/components/Pages/WritingPage.tsx`

将 ChapterEditor + OutlineEditor + Wiki 参考整合为一个新布局：

```
┌────┬──────────────────────┬─────────────────┐
│ 章  │                      │   Wiki 上下文     │
│ 节  │    编辑器 (700px)     │  参考卡片          │
│ 列  │                      │                 │
│ 表  │                      │                 │
│    │                      │                 │
└────┴──────────────────────┴─────────────────┘
```

```typescript
import React, { useState, useEffect } from 'react';
import { useChapterStore } from '../../stores/chapter.store';
import { useOutlineStore } from '../../stores/outline.store';
import { useWikiStore } from '../../stores/wiki.store';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { bridge } from '../../services/bridge';
import type { Chapter, OutlineNode, WikiEntry, Outline } from '@astrolabe/shared';

export const WritingPage: React.FC = () => {
  const { currentChapter, content, wordCount, isDirty, setContent, markClean } = useChapterStore();
  const selectedNodeId = useOutlineStore(s => s.selectedNodeId);
  const outline = useOutlineStore(s => s.outline);
  const wikiEntries = useWikiStore(s => s.entries);
  const getProjectPath = useWorkspaceStore(s => s.getProjectPath);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const selectedNode = outline?.nodes ? findNode(outline.nodes, selectedNodeId) : null;

  // Load chapter on node select
  useEffect(() => {
    if (!selectedNodeId) { useChapterStore.getState().setChapter(null); return; }
    const projectPath = getProjectPath();
    if (!projectPath) return;
    bridge.pipelineGetChapter(projectPath, selectedNodeId).then(data => {
      if (data) useChapterStore.getState().setChapter(data as Chapter);
      else useChapterStore.getState().setChapter({ id: selectedNodeId, title: selectedNode?.title || '未命名', content: '', wordCount: 0, order: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }).catch(() => useChapterStore.getState().setChapter(null));
  }, [selectedNodeId]);

  // Load outline
  useEffect(() => {
    const projectPath = getProjectPath();
    if (!projectPath) return;
    bridge.pipelineGetOutline(projectPath).then(data => { if (data) useOutlineStore.getState().setOutline(data as Outline); }).catch(() => {});
    bridge.wikiSearch(projectPath, '').then(entries => { if (entries) useWikiStore.getState().setEntries(entries as WikiEntry[]); }).catch(() => {});
  }, [getProjectPath]);

  // Auto-save (2s debounce)
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!isDirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const projectPath = getProjectPath();
      const store = useChapterStore.getState();
      if (!projectPath || !selectedNodeId || !store.isDirty) return;
      setSaveStatus('saving');
      try {
        const ch: Chapter = { id: selectedNodeId, title: selectedNode?.title || '未命名', content: store.content, wordCount: store.wordCount, order: 0, createdAt: store.currentChapter?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
        await bridge.pipelineSaveChapter(projectPath, ch);
        useChapterStore.getState().markClean();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch { setSaveStatus('idle'); }
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [content, isDirty]);

  // Relevant wiki entries (context-aware)
  const relevantWiki = wikiEntries.filter(e => {
    const nodeTitle = selectedNode?.title || '';
    return e.title.includes(nodeTitle) || nodeTitle.includes(e.title) || e.aliases?.some((a: string) => nodeTitle.includes(a));
  });

  const handleAIWrite = async () => {
    setAiGenerating(true);
    const startContent = useChapterStore.getState().content;
    let streamedText = '';
    const unsubChunk = bridge.onAIChunk((text: string) => { streamedText += text; setContent(startContent + streamedText); });
    const unsubDone = bridge.onAIDone(() => { unsubChunk(); setAiGenerating(false); });
    const unsubError = bridge.onAIError((err: string) => { unsubChunk(); unsubDone(); unsubError(); setAiGenerating(false); if (streamedText) setContent(startContent + streamedText + '\n\n[生成中断: ' + err + ']'); });
    try {
      const wikiContext = relevantWiki.map(e => `【${e.title}】${e.summary || e.content || ''}`).join('\n');
      await bridge.generateTextStream(startContent ? `续写: ${startContent.slice(-500)}` : `撰写: ${selectedNode?.title}`, `你是专业小说作家。${wikiContext ? '\nWiki参考:\n' + wikiContext : ''}`);
    } catch { unsubChunk(); unsubDone(); unsubError(); setAiGenerating(false); }
  };

  const nodeList = outline?.nodes || [];

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Chapter list */}
      <div style={{ width: 160, minWidth: 120, backgroundColor: 'var(--bg-panel)', borderRight: '1px solid var(--border-subtle)', overflow: 'auto', flexShrink: 0 }}>
        <div style={{ padding: '8px 12px', fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>章节</div>
        {flatNodes(nodeList).map(n => (
          <div key={n.id} onClick={() => useOutlineStore.getState().selectNode(n.id)} style={{ padding: '6px 12px', cursor: 'pointer', fontSize: 'var(--font-ui)', color: n.id === selectedNodeId ? 'var(--text-inverse)' : 'var(--text-secondary)', backgroundColor: n.id === selectedNodeId ? 'var(--accent-dim)' : 'transparent', borderLeft: n.id === selectedNodeId ? '2px solid var(--accent)' : '2px solid transparent' }}>{n.title || '未命名'}</div>
        ))}
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="开始写作..."
            spellCheck={false}
            style={{
              width: '100%', maxWidth: 700, height: '100%', padding: '32px 24px',
              backgroundColor: 'transparent', border: 'none', outline: 'none', resize: 'none',
              fontSize: 'var(--font-body)', color: 'var(--text-primary)',
              fontFamily: '"Microsoft YaHei", "Noto Serif SC", Georgia, serif',
              lineHeight: 1.9, caretColor: 'var(--accent)',
            }}
          />
        </div>
        {/* Bottom toolbar */}
        <div style={{ display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ width: '100%', maxWidth: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 24px', fontSize: 'var(--font-small)', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span>{wordCount} 字</span>
              {saveStatus === 'saving' && <span style={{ color: 'var(--color-warning)' }}>保存中…</span>}
              {saveStatus === 'saved' && <span style={{ color: 'var(--color-success)' }}>已保存</span>}
              {saveStatus === 'idle' && isDirty && <span style={{ color: 'var(--color-warning)' }}>未保存</span>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAIWrite} disabled={!!aiGenerating} style={{ padding: '4px 12px', fontSize: 'var(--font-small)', backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', borderRadius: 'var(--radius)', cursor: aiGenerating ? 'not-allowed' : 'pointer', opacity: aiGenerating ? 0.6 : 1 }}>{aiGenerating ? '生成中...' : 'AI 续写'}</button>
              <button onClick={() => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }} style={{ padding: '4px 12px', fontSize: 'var(--font-small)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', cursor: 'pointer' }}>保存</button>
            </div>
          </div>
        </div>
      </div>

      {/* Wiki context panel (right) */}
      <div style={{ width: 'var(--right-panel-width)', minWidth: 200, backgroundColor: 'var(--bg-panel)', borderLeft: '1px solid var(--border-subtle)', overflow: 'auto', flexShrink: 0, display: relevantWiki.length > 0 ? 'block' : 'none' }}>
        <div style={{ padding: '8px 12px', fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>参考</div>
        {relevantWiki.map(e => (
          <div key={e.id} style={{ margin: '4px 8px', padding: '8px 10px', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 'var(--font-ui)', color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>{e.title}</div>
            <div style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{e.summary || e.content?.slice(0, 100)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

function findNode(nodes: OutlineNode[], id: string | null): OutlineNode | null {
  if (!id) return null;
  for (const n of nodes) { if (n.id === id) return n; const found = findNode(n.children, id); if (found) return found; }
  return null;
}

function flatNodes(nodes: OutlineNode[]): OutlineNode[] {
  return nodes.reduce<OutlineNode[]>((acc, n) => { acc.push(n); if (n.children.length > 0) acc.push(...flatNodes(n.children)); return acc; }, []);
}
```

**Commit:** `git add -A && git commit -m "feat(ui): add immersive writing page with chapter list, centered editor, and wiki context"`

---

## Task M4: AI 悬浮气泡原型

**Files:**
- Create: `packages/core/src/renderer/components/AI/AIBubble.tsx`

初始版本：固定在右下角的浮动 AI 助手入口。点击展开功能菜单。

```typescript
import React, { useState } from 'react';

const container: React.CSSProperties = {
  position: 'fixed', bottom: 40, right: 24, zIndex: 500,
};

const toggle: React.CSSProperties = {
  width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--accent)',
  color: 'var(--text-inverse)', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 18, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
};

const menu: React.CSSProperties = {
  position: 'absolute', bottom: 52, right: 0, width: 200,
  backgroundColor: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border-subtle)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  padding: 8, display: 'flex', flexDirection: 'column', gap: 2,
};

const menuItem: React.CSSProperties = {
  padding: '8px 12px', fontSize: 'var(--font-ui)', color: 'var(--text-primary)',
  cursor: 'pointer', borderRadius: 'var(--radius)', border: 'none', background: 'none',
  textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
};

export const AIBubble: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <div style={container}>
      {open && (
        <div style={menu}>
          <button style={menuItem} onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <span>✏️</span> 续写
          </button>
          <button style={menuItem} onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <span>🎨</span> 改文风
          </button>
          <button style={menuItem} onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <span>🔥</span> 增强情绪
          </button>
          <button style={menuItem} onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <span>🔍</span> 检查一致性
          </button>
        </div>
      )}
      <button style={toggle} onClick={() => setOpen(!open)} title="AI 助手">
        ✨
      </button>
    </div>
  );
};
```

**Commit:** `git add -A && git commit -m "feat(ui): add floating AI bubble prototype"`

---

## Task M5: 旧组件适配新配色

**Files:**
- Modify: `packages/core/src/renderer/components/Explorer/Explorer.tsx` — 替换硬编码颜色为 CSS 变量
- Modify: `packages/core/src/renderer/components/Workspace/WorkspaceDialog.tsx` — 适配新配色
- Modify: `packages/core/src/renderer/components/Settings/SettingsPanel.tsx` — 适配新配色
- Modify: `packages/core/src/renderer/components/CommandPalette/CommandPalette.tsx` — 适配新配色
- Modify: `packages/core/src/renderer/index.html` — 更新基础样式

**核心改动：** 将所有硬编码的颜色值替换为 CSS 变量引用。

| 旧值 | 新值 |
|------|------|
| `#1e1e1e` | `var(--bg-base)` |
| `#252526` | `var(--bg-panel)` |
| `#3c3c3c` | `var(--bg-input)` / `var(--border-default)` |
| `#007acc` | `var(--accent)` |
| `#094771` | `var(--accent-dim)` |
| `#cccccc` | `var(--text-primary)` |
| `#999` | `var(--text-secondary)` |
| `#666` | `var(--text-muted)` |

**Commit:** `git add -A && git commit -m "feat(ui): adapt existing components to new CSS variable theme"`

---

## Task M6: 最终集成验证

```bash
cd packages/core && npx vitest run && npx tsc -p tsconfig.main.json --noEmit && npx tsc -p tsconfig.renderer.json --noEmit && npx vite build
```

**Commit:** `git add -A && git commit -m "chore: finalize UI MVP with warm gold theme and writing page"`

---

## 规格覆盖自审

| 需求 | 覆盖任务 |
|------|---------|
| 铜金暖色配色 | M1 + M5 |
| 三模式全局导航 | M2 (GlobalNav) |
| 创作/写作子阶段切换 | M2 |
| 沉浸式写作页（章节列表+居中编辑器+Wiki参考） | M3 |
| AI 悬浮气泡入口 | M4 |
| 旧组件适配 | M5 |
| 全量验证 | M6 |
