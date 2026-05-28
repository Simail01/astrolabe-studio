# 星盘工坊 Astrolabe Studio

AI 赋能的小说、漫画、漫剧个人创作工作台。项目采用 Electron + React + TypeScript 构建，定位是本地优先的桌面创作 IDE：作品、章节、Wiki、分镜、漫画页等数据都以 JSON 文件保存在本地，便于备份、迁移和 Git 版本管理。

## 当前版本

- 版本：`0.8.0`
- 阶段：Beta 分发版
- 平台：Windows 桌面端
- 安装包输出：`packages/core/release/星盘工坊 Setup 0.8.0.exe`

## 核心能力

- 小说创作闭环：工作区、作品、大纲、章节写作、自动保存、字数统计、章节状态管理。
- AI 写作辅助：续写、改写、润色、扩写、精简、情感增强、风格转换。
- Wiki / Story Bible：人物、地点、道具、事件、设定、伏笔管理，支持 AI 提取、充实、一致性检查和关系发现。
- 长篇连续性：时间线视图、角色弧光、伏笔追踪、Prompt 运行记录。
- 漫画 MVP：分镜拆解、镜头编辑、漫画页面管理、对白气泡、Webtoon 长条漫、HTML 长图导出。
- 角色一致性：角色设定图、表情/姿态管理，生成时注入角色参考。
- 分发能力：Windows NSIS 安装包、应用图标、GitHub publish 配置、electron-updater 集成。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 桌面壳 | Electron 30 |
| 渲染端 | React 18 + TypeScript + Vite |
| 状态管理 | Zustand |
| 主进程 | Node.js CommonJS + Electron IPC |
| AI 文本 | DeepSeek |
| AI 图像 | 火山方舟 / Volcengine Ark |
| 存储 | 本地 JSON 文件 |
| 测试 | Vitest |
| Monorepo | pnpm workspace + Turborepo |
| 打包 | electron-builder |

## 项目结构

```text
packages/
├── shared/     # @astrolabe/shared：类型定义
├── ai/         # @astrolabe/ai：DeepSeek / Volcengine 客户端与 Prompt 模板
└── core/       # @astrolabe/core：Electron 主进程、Preload、React 渲染端

build/
├── icon.svg
└── icon.ico
```

## 数据存储

星盘工坊不使用数据库。工作区内的数据以文件形式保存：

```text
{workspace}/
├── fanlib/
└── {project}/
    ├── astrolabe.json
    ├── outline/outline.json
    ├── chapters/{id}.json
    ├── wiki/{type}/{id}.json
    ├── storyboards/{chapterId}.json
    ├── comic/pages.json
    ├── timeline.json
    ├── character-arcs.json
    └── templates/{id}.json
```

## 开发环境

要求：

- Node.js 18+
- pnpm 9+

安装依赖：

```bash
pnpm install --ignore-scripts
```

开发模式：

```bash
pnpm dev
```

构建：

```bash
pnpm build
```

类型检查：

```bash
pnpm lint
```

测试：

```bash
pnpm test
```

## Windows 打包

```bash
pnpm package:win
```

输出文件：

```text
packages/core/release/星盘工坊 Setup 0.8.0.exe
```

打包说明：

- `build/icon.ico` 是 Windows 安装包和应用图标资源，需要保留在仓库中。
- 主进程运行时依赖需要能进入 `app.asar/node_modules`，根 `package.json` 已声明 `electron-store`、`chokidar`、`electron-updater`。
- `@astrolabe/ai` 作为 workspace 包，会在 `electron-builder.yml` 中映射到 `node_modules/@astrolabe/ai`，保证安装包启动时能被 Node 模块解析。
- `package:win` 使用固定的 electron-builder 物理路径，避免 Windows 下 pnpm peer 虚拟路径过长导致 NSIS include 失败。

## AI 配置

首次启动会引导配置：

- DeepSeek API Key：用于大纲生成、章节续写、文本改写、Wiki 提取等文本能力。
- 火山方舟 API Key / 图像模型接入点：用于分镜图、漫画格、角色设定图等图像能力。

API Key 保存在本机 KeyStore 中，不写入作品目录。

## Git 忽略规则

仓库会保留源码、配置、Prompt 模板、示例项目和构建资源。以下内容默认不入库：

- `node_modules/`
- `dist/`
- `release/`
- `.turbo/`
- `.tmp/`
- 本地 agent / Codex / Claude 工作文件
- 产品规划和 review 过程文档

## 常用命令

```bash
pnpm install --ignore-scripts
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm package:win
```

## License

MIT
