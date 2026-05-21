# 核心IDE框架 — 设计规格

> 子系统 #1 | 状态：已确认 | 2026-05-21

## 定位

星盘工坊的骨架层。提供窗口管理、工作区布局、项目系统和插件底座。不包含任何创作业务逻辑——所有业务功能（大纲、写作、分镜、漫画、漫剧、Wiki、同人库）作为插件接入。

---

## 技术决策

| 维度 | 决策 |
|------|------|
| 产品形态 | Electron 桌面应用 |
| 前端技术栈 | React 18 + TypeScript 5 |
| 代码组织 | pnpm Monorepo + Turborepo |
| 布局风格 | VS Code 风格弹性布局 |
| 分屏 | 固定 2×2 网格，最多 4 面板 |
| 状态管理 | Zustand |
| 数据存储 | JSON 文件（文件即数据源） |
| 通信模型 | Service 接口 → IPC 适配器 |
| 命令系统 | 命令面板 + 统一注册接口 |
| 插件化 | 挂载点注册，业务模块为插件 |

---

## 分层架构

```
┌─────────────────────────────────────────────┐
│  Renderer 层 (React + TypeScript)            │
│  ├─ 布局引擎 (Panel/Split/Grid)              │
│  ├─ 工作区组件 (TabBar, Sidebar, StatusBar)   │
│  └─ 扩展Shell (挂载点注册)                    │
├─────────────────────────────────────────────┤
│  Bridge 层 (IPC)                             │
│  ├─ 文件操作 (读/写/监听)                     │
│  ├─ 窗口管理 (创建/关闭/分屏)                  │
│  └─ 原生能力 (通知/菜单/快捷键)               │
├─────────────────────────────────────────────┤
│  Main 层 (Node.js)                           │
│  ├─ 窗口生命周期管理                          │
│  ├─ 项目文件系统 (工作区/作品/配置)            │
│  ├─ 插件加载器 (预留)                         │
│  └─ 进程守护 & 崩溃恢复                       │
└─────────────────────────────────────────────┘
```

### Layer 职责约束

- **Renderer 层**：纯 UI 逻辑，通过 Service 接口获取数据。不直接 import `electron`。
- **Bridge 层**：薄适配器，IPC 调用的类型安全包装。不做业务逻辑。
- **Main 层**：所有文件 I/O、进程管理、原生能力。不依赖 React。

---

## 项目系统

### 层级

```
工作区 (Workspace)
├── 作品A (Project)
│   ├── 大纲 (Outline)
│   ├── 章节 (Chapters)
│   ├── 分镜 (Storyboards)
│   ├── 角色设定 (Characters)
│   └── Wiki/              ← 子系统#2 接管
├── 作品B (Project)
│   └── ...
└── 同人库/                 ← 全局独立，子系统#3 接管
```

### 文件系统映射

```
<作品目录>/
├── astrolabe.json          # 作品元数据（标题、封面、创建时间）
├── outline/
│   └── outline.json        # 大纲数据
├── chapters/
│   ├── ch-001.json         # 章节数据，一个实体一个文件
│   └── ch-002.json
├── characters/
│   ├── char-001.json       # 角色数据
│   └── char-002.json
├── wiki/
│   └── wiki-index.json     # Wiki 索引，子系统#2 接管
└── assets/
    ├── covers/             # 封面图
    └── refs/               # 参考图

<工作区>/
└── fanlib/                 # 同人库，不隶属任何作品
    ├── characters/         # 人物卡片
    ├── worldviews/         # 世界观卡片
    ├── items/              # 物品卡片
    └── events/             # 事件卡片
```

### 元数据文件（astrolabe.json）

```json
{
  "version": 1,
  "id": "uuid",
  "title": "三国演义",
  "cover": "assets/covers/cover.png",
  "createdAt": "2026-05-21T00:00:00Z",
  "updatedAt": "2026-05-21T12:00:00Z",
  "tags": ["历史", "战争"],
  "settings": {
    "language": "zh-CN",
    "autoSaveInterval": 30
  }
}
```

### 设计原则

- 文件即数据源，不使用数据库
- 每个实体一个文件，避免单文件膨胀
- 支持 Git 版本控制、手动编辑、跨设备同步
- 同人库彻底与作品解耦；引用关系存储在引用方

---

## Monorepo 结构

```
astrolabe-studio/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── electron-builder.yml
├── docs/
│   └── superpowers/
│       └── specs/
└── packages/
    ├── shared/          # 共享类型、工具函数、UI 组件
    ├── core/            # IDE 框架（Electron 主进程 + 渲染进程 Shell）
    ├── ai/              # AI 集成层（子系统#6）
    ├── wiki/            # Wiki 知识库（子系统#2，后续加入）
    ├── fanlib/          # 同人库（子系统#3，后续加入）
    └── pipeline/        # 创作管线（子系统#4+#5，后续加入）
```

---

## 工作区布局

```
┌──────────────────────────────────────────────────────────┐
│  菜单栏 (MenuBar)                          最小化 最大化 关闭 │
├──────────┬──────────────────────────────┬────────────────┤
│          │  ┌────────────────────────┐  │                │
│  活动栏   │  │  标签页栏 (TabBar)      │  │  右侧面板       │
│          │  ├────────────────────────┤  │  (上下文相关)    │
│  📁项目   │  │                        │  │                │
│  🔍搜索   │  │  编辑区                │  │  属性面板       │
│  📖Wiki  │  │  (2×2 Grid Split)      │  │  参考面板       │
│  👤同人库 │  │  最多4个面板            │  │  大纲导航       │
│  ⚙️设置   │  │                        │  │                │
│          │  │                        │  │                │
│          │  ├────────────────────────┤  │                │
│          │  │  底部面板 (可折叠)       │  │                │
│          │  │  终端 / AI对话 / 输出   │  │                │
│          │  └────────────────────────┘  │                │
├──────────┴──────────────────────────────┴────────────────┤
│  状态栏  项目:三国演义 | 字数:12,345 | AI:就绪              │
└──────────────────────────────────────────────────────────┘
```

### 核心 UI 组件

| 组件 | 职责 | 可隐藏 |
|------|------|--------|
| ActivityBar | 左侧图标导航，切换功能视图 | 可折叠 |
| Explorer | 作品文件树，从活动栏触发 | 是 |
| TabBar | 管理编辑标签页，支持拖拽排序 | 否 |
| EditorArea | 2×2 网格分屏，每面板独立标签组 | 否 |
| RightPanel | 上下文辅助面板（大纲导航/属性/参考） | 可折叠 |
| BottomPanel | 终端、AI 对话、问题输出，可切换 | 可折叠 |
| StatusBar | 项目信息 + AI 状态 + 字数统计 | 否 |

---

## 插件系统

### 挂载点

```typescript
type ViewLocation = 'activitybar' | 'editor' | 'rightpanel' | 'bottompanel';

interface ViewContribution {
  id: string;
  title: string;
  location: ViewLocation;
  icon?: string;
  component: React.ComponentType;
  order?: number;
}
```

### 命令注册

```typescript
interface Command {
  id: string;                    // 例: 'astro:chapter:new'
  label: string;                 // 例: '新建章节'
  category: '作品' | '章节' | '角色' | '同人库' | 'AI' | '视图';
  keybinding?: string;           // 例: 'Ctrl+N'
  enabled?: () => boolean;
  handler: () => void | Promise<void>;
}
```

- 菜单栏的每个菜单项执行一个注册命令，不硬编码点击处理
- 子系统通过统一接口贡献命令，命令面板搜索（Ctrl+Shift+P）自动索引

---

## 通信模型

```
Renderer (React)                    Main (Node.js)
───────────────                     ──────────────
Component → Service → Bridge ═══ IPC ═══ Handler → Impl → FS/OS
                  ↑                        ↑
            类型安全接口              服务实现
```

### Service 接口示例

```typescript
interface IFileService {
  readProject(path: string): Promise<Project>;
  writeChapter(path: string, data: Chapter): Promise<void>;
  watchProject(path: string): Disposable;
}

interface IExportService {
  exportNovel(projectId: string, format: 'epub' | 'pdf' | 'txt'): Promise<string>;
  exportCard(cardId: string, format: 'json' | 'markdown' | 'image'): Promise<string>;
  exportComic(projectId: string, format: 'png' | 'pdf' | 'video'): Promise<string>;
}
```

### 流式通信（AI 专用）

```
Renderer                  Main                    API
  │                         │                      │
  │── invoke('ai:generate')─▶│── SSE Stream ───────▶│
  │                         │◀── chunk ────────────│
  │◀── on('ai:chunk') ─────│                      │
  │◀── on('ai:done') ──────│                      │
```

### 文件监听

Main 进程通过 chokidar 监听项目目录，外部修改自动推送 Renderer 刷新。

---

## 导出能力

| 导出对象 | 支持格式 | 说明 |
|---------|---------|------|
| 作品（小说） | EPUB / PDF / TXT | 完整导出 |
| 漫画 | PNG 序列 / PDF | 按话导出 |
| 同人库卡片 | JSON / Markdown / 图片 | 单张或批量 |
| Wiki | ❌ 不导出 | 仅作品内部使用 |

---

## 窗口管理

### 窗口策略

- 单主窗口，所有作品以标签页管理
- 三种弹出窗口：AI 独立对话、导出预览、设置

### 会话恢复

```
关闭时保存 → workspace-session.json
  ├─ openedProjects[]
  ├─ activeProject
  ├─ tabs[] (文件 + 网格位置)
  ├─ panelLayout (尺寸比例)
  └─ scrollPositions

下次启动 → 读取快照 → 恢复全部状态
```

### 崩溃恢复

| 策略 | 描述 |
|------|------|
| 自动保存 | 编辑区失焦 + 30秒定时 + 退出前刷盘 |
| 草稿恢复 | 启动时检查 temp/ → 发现未确认草稿 → 弹出恢复面板 |
| 底线 | 不丢内容是硬性要求，不完全无缝恢复可接受 |

---

## 初始 Package 规划

阶段一仅创建三个 package：

```
packages/
├── shared/    # @astrolabe/shared — 类型定义、工具函数、共享 UI 组件
├── core/      # @astrolabe/core   — Electron 工程（主进程 + Shell 渲染进程）
└── ai/        # @astrolabe/ai     — DeepSeek + 火山引擎 API 封装
```

---

## 规格自审

- [x] 无 TBD 或 TODO 占位符
- [x] 各节描述一致，无矛盾
- [x] 范围聚焦子系统#1，未涉及其它子系统业务
- [x] 所有需求明确，无歧义
