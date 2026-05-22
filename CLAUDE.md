# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

```bash
# 安装依赖（跳过 Electron 二进制下载，国内网络问题）
pnpm install --ignore-scripts

# 编译检查（全量）
pnpm lint

# 构建
pnpm build

# 运行测试
pnpm test
# 单个包的测试
cd packages/core && npx vitest run
# 单个测试文件
cd packages/core && npx vitest run __tests__/stores/layout.store.test.ts
# 开发模式启动
pnpm dev
```

## 架构概览

**星盘工坊 (AstrolabeStudio)** — Electron 桌面 IDE，AI 赋能的小说/漫画/漫剧个人创作工作台。

### Monorepo 结构

```
packages/
├── shared/     # @astrolabe/shared — 所有类型定义，无运行时
├── core/       # @astrolabe/core   — Electron 主进程 + React 渲染进程
└── ai/         # @astrolabe/ai     — DeepSeek + 火山引擎 API 客户端
```

### Electron 三进程架构

```
Renderer (React 18 + Zustand + Vite)
  │  IPC (invoke/handle + on/send 流式)
  ▼
Main (Node.js — 文件 I/O、窗口管理、IPC handler 注册)
  │  contextBridge
  ▼
Preload (暴露 window.astrolabe API 给 Renderer)
```

**关键约束：** Renderer 不直接 import `electron`，所有 IPC 通过 `bridge.ts` 封装。Main 进程用 CommonJS 模块，Renderer 用 ESNext + bundler。

### 数据流

```
React 组件 → Zustand Store → bridge.invoke() → IPC → Main Service → 文件系统
                                                              → AI API (DeepSeek/火山引擎)
```

### 6 个子系统

| # | 子系统 | 实现状态 |
|---|--------|---------|
| 1 | 核心IDE框架 | ✅ 窗口管理、VS Code 风格布局、命令面板、插件挂载、会话恢复 |
| 6 | AI集成层 | ✅ DeepSeek 文本/流式、火山引擎图像/视频、KeyStore、PromptManager |
| 2 | Wiki知识库 | ✅ 条目 CRUD、关系图谱、搜索、AI 上下文注入接口 |
| 3 | 同人库 | ✅ 卡片管理、平行宇宙引入、导入导出 |
| 5 | 角色一致性 | ✅ 设定图版本管理、表情/姿态扩展、同人库适配 |
| 4 | AI创作管线 | ✅ 6 阶段状态机（大纲→人物→章节→分镜→漫画→漫剧） |

设计规格：`docs/superpowers/specs/`，实现计划：`docs/superpowers/plans/`

### 文件存储约定

- 数据源是 JSON 文件，不使用数据库。用户可以 Git 版本控制。
- 作品目录：`{workspace}/{作品名}/` → `astrolabe.json` + `chapters/` + `characters/` + `wiki/` + `outline/`
- 同人库独立于作品：`{workspace}/fanlib/`
- 每个实体一个 JSON 文件（避免单文件膨胀）

### 新增子系统的模式

每个子系统遵循相同分层：

1. `packages/shared/src/types/` — 类型定义
2. `packages/core/src/main/services/` — Main 进程服务（文件 I/O）
3. `packages/core/src/main/ipc/` — IPC handler 注册
4. `packages/core/src/renderer/services/bridge.ts` — Renderer 侧适配器
5. `packages/core/src/renderer/stores/` — Zustand store
6. `packages/core/src/renderer/components/` — React UI 组件

### IPC 约定

- channel 命名：`{domain}:{action}`（如 `fs:readFile`、`wiki:search`、`ai:text:stream`）
- invoke/handle 用于请求-响应，on/send 用于服务端推送（AI 流式、文件变更）
- 新增 handler 后必须在 `ipc/index.ts` 的 `registerAllHandlers()` 中注册
