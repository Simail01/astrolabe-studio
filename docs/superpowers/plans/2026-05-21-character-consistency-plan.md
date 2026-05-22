# 角色一致性引擎 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 构建角色一致性引擎——设定图数据模型、版本管理、表情/姿态扩展、同人库适配、设定图管理 UI。

**Architecture:** CharacterDesign 数据存储于 `{project}/characters/{charId}/` 下。管理设定图版本、表情集、姿态集。AI 图像生成走火山引擎 IPC（已有占位）。

**Tech Stack:** 已有技术栈，无需新依赖。

---

### Task 35: 角色一致性类型定义

**Files:**
- Create: `packages/shared/src/types/character-design.ts`
- Modify: `packages/shared/src/types/index.ts`

```typescript
export interface CharacterDesign {
  id: string;
  characterId: string;
  version: number;
  baseImage: string;
  thumbnail: string;
  expressions: Expression[];
  poses: Pose[];
  promptUsed: string;
  seed?: number;
  createdAt: string;
  confirmed: boolean;
}

export interface Expression {
  type: 'neutral' | 'happy' | 'angry' | 'sad' | 'surprised';
  image: string;
}

export interface Pose {
  type: 'front' | 'side' | 'action' | 'casual';
  image: string;
}

export interface CharacterDesignConfig {
  characterId: string;
  source: 'ai-generated' | 'user-upload' | 'fanlib-card';
  fanlibCardId?: string;
  fanlibDesignBorrowed?: boolean;
  hasDesign: boolean;
  lastUpdated: string;
}
```

Verify + commit.

---

### Task 36: 设定图 IPC Handlers + CharacterDesign 扩展

**Files:**
- Create: `packages/core/src/main/ipc/design.ts`
- Modify: `packages/core/src/main/ipc/index.ts`
- Modify: `packages/core/src/renderer/services/bridge.ts`

Handlers:
- `design:save` — 保存设定图配置到角色目录
- `design:get` — 读取角色设定图
- `design:list` — 列出所有表情/姿态

Bridge methods: designSave, designGet, designList

Verify + commit.

---

### Task 37: 角色一致性 Zustand Store

**Files:**
- Create: `packages/core/src/renderer/stores/design.store.ts`
- Create: `packages/core/__tests__/stores/design.store.test.ts`

状态：currentDesign, hasDesign, designSource, isGenerating
方法：setDesign, setHasDesign, setDesignSource, setGenerating

TDD：先写测试，再实现。

---

### Task 38: 设定图管理 UI

**Files:**
- Create: `packages/core/src/renderer/components/Design/DesignPanel.tsx`

展示：设定图预览、表情列表、姿态列表、生成按钮（占位）、上传按钮（占位）、版本选择器、来源标记。

Verify + commit + 最终集成验证。
