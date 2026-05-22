# AI 创作管线 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 构建 AI 创作管线——大纲、章节、分镜的数据模型与 UI，各阶段串联。AI 生成调用已有的 AI IPC。

**Architecture:** 管线数据存储在 `{project}/outline/`、`{project}/chapters/`、`{project}/storyboards/` 下。每阶段独立 Service + IPC + Store + UI。

---

### Task 39: 管线类型定义 (大纲 + 分镜)

**Files:**
- Create: `packages/shared/src/types/pipeline.ts`
- Modify: `packages/shared/src/types/index.ts`

已有一部分在 project.ts 中 (Outline, OutlineNode)，本次补充完整的分镜类型：

```typescript
// 扩展 Outline 相关
export interface OutlineVersion {
  id: string;
  timestamp: string;
  label: string;
}

// 大纲中已有的 Outline、Volume、OutlineChapter 保持不变

// 分镜
export interface Storyboard {
  id: string;
  chapterId: string;
  shots: Shot[];
  createdAt: string;
  updatedAt: string;
}

export interface Shot {
  id: string;
  order: number;
  scene: string;
  framing: 'extreme-long' | 'long' | 'medium' | 'close-up' | 'extreme-close-up';
  angle: 'eye-level' | 'high-angle' | 'low-angle' | 'bird-eye' | 'dutch';
  characters: ShotCharacter[];
  dialogue: ShotDialogue[];
  props: string[];
  mood: string;
  notes: string;
}

export interface ShotCharacter {
  characterId: string;
  pose: string;
  expression: string;
  designVersion: number;
}

export interface ShotDialogue {
  speakerId: string;
  text: string;
  type: 'speech' | 'thought' | 'narration';
}

// 管线阶段
export type PipelineStage = 'outline' | 'characters' | 'chapters' | 'storyboard' | 'comic' | 'video';

export interface PipelineState {
  projectId: string;
  currentStage: PipelineStage;
  stages: Record<PipelineStage, { status: 'pending' | 'in-progress' | 'done'; updatedAt: string }>;
}
```

Verify + commit.

---

### Task 40: 大纲 + 分镜 Service (Main 侧, TDD)

**Files:**
- Create: `packages/core/src/main/services/pipeline.service.ts`
- Create: `packages/core/__tests__/services/pipeline.service.test.ts`

方法：
- `saveOutline(projectPath, outline)` — 写入 outline/outline.json
- `getOutline(projectPath)` — 读取
- `saveChapter(projectPath, chapter)` — 写入 chapters/ch-{order}.json
- `getChapter(projectPath, chapterId)` — 读取
- `listChapters(projectPath)` — 列出
- `saveStoryboard(projectPath, storyboard)` — 写入 storyboards/{chapterId}.json
- `getStoryboard(projectPath, chapterId)` — 读取
- `savePipelineState(projectPath, state)` — 写入 pipeline-state.json
- `getPipelineState(projectPath)` — 读取

TDD: 先写测试，再实现。

---

### Task 41: 管线 IPC Handlers + Bridge

**Files:**
- Create: `packages/core/src/main/ipc/pipeline.ts`
- Modify: `packages/core/src/main/ipc/index.ts`
- Modify: `packages/core/src/renderer/services/bridge.ts`

Handlers: pipeline:saveOutline, pipeline:getOutline, pipeline:saveChapter, pipeline:getChapter, pipeline:listChapters, pipeline:saveStoryboard, pipeline:getStoryboard, pipeline:saveState, pipeline:getState

---

### Task 42: 管线 Store + UI 组件

**Files:**
- Create: `packages/core/src/renderer/stores/pipeline.store.ts`
- Create: `packages/core/__tests__/stores/pipeline.store.test.ts`
- Create: `packages/core/src/renderer/components/Pipeline/OutlineEditor.tsx`
- Create: `packages/core/src/renderer/components/Pipeline/StoryboardViewer.tsx`

OutlineEditor: 大纲树展示 + 节点编辑
StoryboardViewer: 分镜列表 + 镜头详情

---

### Task 43: 最终集成验证
