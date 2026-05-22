# 同人库系统 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 构建同人库系统——卡片 CRUD、平行宇宙引入机制、卡片浏览器与编辑器、导入导出。

**Architecture:** Main 进程 FanlibService (文件 I/O) → IPC handlers → Renderer 侧 Zustand store + React UI。卡片以 JSON 文件存储在 `{workspace}/fanlib/` 下，按 type 分目录。

**Tech Stack:** 已有技术栈，无需新依赖。

---

### Task 29: 同人库类型定义

**Files:**
- Create: `packages/shared/src/types/fanlib.ts`
- Modify: `packages/shared/src/types/index.ts`

```typescript
export type FanlibCardType = 'character' | 'worldview' | 'item' | 'event';

export interface CardSource {
  type: 'anime' | 'movie' | 'novel' | 'comic' | 'game' | 'real_person' | 'real_world' | 'original';
  title: string;
  url?: string;
  note?: string;
}

export interface CardMeta {
  id: string;
  type: FanlibCardType;
  name: string;
  aliases: string[];
  avatar?: string;
  tags: string[];
  source: CardSource;
  createdAt: string;
  updatedAt: string;
}

export interface CardRelation {
  targetId: string;
  relationType: string;
  description: string;
}

export interface CharacterCard extends CardMeta {
  type: 'character';
  appearance: string;
  personality: string;
  abilities: string[];
  background: string;
  relationships: CardRelation[];
  designImages: string[];
}

export interface WorldviewCard extends CardMeta {
  type: 'worldview';
  rules: string[];
  history: string;
  geography: string;
  factions: string[];
  powerSystem: string;
}

export interface ItemCard extends CardMeta {
  type: 'item';
  category: string;
  appearance: string;
  abilities: string[];
  origin: string;
  limitations: string;
}

export interface EventCard extends CardMeta {
  type: 'event';
  participants: string[];
  cause: string;
  process: string;
  result: string;
  narrativePattern: string;
}

export type FanlibCard = CharacterCard | WorldviewCard | ItemCard | EventCard;

export interface FanlibImport {
  id: string;
  sourceCardId: string;
  sourceCardVersion: string;
  importedAt: string;
  targetEntityId: string;
  overrides: {
    name?: string;
    appearance?: string;
    personality?: string;
    abilities?: string[];
    background?: string;
  };
  addons: {
    newAbilities: string[];
    newRelationships: string[];
  };
}

export interface FanlibIndex {
  cards: { id: string; type: FanlibCardType; name: string; tags: string[] }[];
  updatedAt: string;
}
```

- [ ] **Step 1:** 更新 `types/index.ts` 添加 `export * from './fanlib';`
- [ ] **Step 2:** `cd packages/shared && npx tsc --noEmit`
- [ ] **Step 3:** 提交 `git commit -m "feat(shared): add Fanlib card and import type definitions"`

---

### Task 30: FanlibService (Main 侧, TDD)

**Files:**
- Create: `packages/core/src/main/services/fanlib.service.ts`
- Create: `packages/core/__tests__/services/fanlib.service.test.ts`

**Test 先写，然后实现：**

方法：`saveCard(workspacePath, card)`, `getCard(path, type, id)`, `listCards(path, type?)`, `deleteCard(path, type, id)`, `search(path, query)`

类似 WikiService 的实现模式，存储路径为 `{workspace}/fanlib/{type}/{id}.json`，索引文件 `fanlib-index.json`。

- [ ] **Step 1:** 编写测试，验证失败
- [ ] **Step 2:** 实现 FanlibService
- [ ] **Step 3:** `cd packages/core && npx vitest run` — 确认全部通过
- [ ] **Step 4:** 编译验证 + 提交

---

### Task 31: Fanlib IPC Handlers + Bridge

**Files:**
- Create: `packages/core/src/main/ipc/fanlib.ts`
- Modify: `packages/core/src/main/ipc/index.ts`
- Modify: `packages/core/src/renderer/services/bridge.ts`

Handlers: `fanlib:save`, `fanlib:get`, `fanlib:list`, `fanlib:delete`, `fanlib:search`
Bridge methods: `fanlibSave`, `fanlibGet`, `fanlibList`, `fanlibDelete`, `fanlibSearch`

- [ ] **Step 1:** 创建并注册 IPC handler
- [ ] **Step 2:** 更新 bridge
- [ ] **Step 3:** 编译验证 + 提交

---

### Task 32: Fanlib Zustand Store (TDD)

**Files:**
- Create: `packages/core/src/renderer/stores/fanlib.store.ts`
- Create: `packages/core/__tests__/stores/fanlib.store.test.ts`

状态：cards[], selectedCardId, searchQuery, filteredCards, importDialogOpen
方法：setCards, addOrUpdateCard, removeCard, selectCard, setSearchQuery, openImportDialog, closeImportDialog

- [ ] **Step 1:** 编写测试，验证失败
- [ ] **Step 2:** 实现 store
- [ ] **Step 3:** 测试通过 + 编译验证 + 提交

---

### Task 33: Fanlib UI 组件

**Files:**
- Create: `packages/core/src/renderer/components/Fanlib/FanlibPanel.tsx`
- Create: `packages/core/src/renderer/components/Fanlib/FanlibCardEditor.tsx`
- Create: `packages/core/src/renderer/components/Fanlib/ImportDialog.tsx`

**FanlibPanel:** 卡片类型标签切换 + 搜索 + 卡片列表 + 选中高亮 + 引入按钮
**FanlibCardEditor:** 卡片详情展示（名称、来源、描述、属性、关联、设定图）
**ImportDialog:** 引入配置对话框（覆盖字段选择、新增能力、确认/取消）

- [ ] **Step 1:** 编写三个组件
- [ ] **Step 2:** 编译验证 + 提交

---

### Task 34: 同人库最终集成验证

- [ ] **Step 1:** 全部测试 + 全部编译
- [ ] **Step 2:** 提交
