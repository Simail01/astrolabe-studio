# 星盘工坊 (Astrolabe Studio)

AI 赋能的小说/漫画/漫剧个人创作工作台。

## 功能特性

- **大纲编辑器** - 树状大纲结构，支持 AI 辅助生成
- **写作编辑器** - 章节创作，支持 AI 续写和多种文风模板
- **视觉化** - 分镜拆解、漫画页面构建
- **Wiki 知识库** - 角色/地点/物品/事件/设定管理，AI 自动提取
- **同人库** - 卡片管理、平行宇宙引入
- **提示词模板系统** - 自定义各阶段 AI 提示词

## 技术栈

- Electron 30 + React 18 + TypeScript 5
- Zustand 状态管理
- Vite 构建
- pnpm Monorepo + Turborepo
- DeepSeek / 火山引擎 AI API

## 项目结构

```
packages/
├── shared/     # @astrolabe/shared — 类型定义
├── core/       # @astrolabe/core   — Electron 主进程 + React 渲染进程
└── ai/         # @astrolabe/ai     — AI API 客户端
```

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 9

### 安装依赖

```bash
pnpm install --ignore-scripts
```

> **注意：** 必须使用 `--ignore-scripts` 跳过 Electron 二进制下载（国内网络问题）。

### 开发模式

```bash
pnpm dev
```

### 构建

```bash
pnpm build
```

### 运行测试

```bash
pnpm test
```

### 打包 Windows 应用

```bash
pnpm package:win
```

打包后的应用位于 `packages/core/release/win-unpacked/星盘工坊.exe`

## 启动脚本

项目提供了启动脚本，方便快速操作：

**Windows:**
```bash
start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

## 配置

首次启动后在设置中配置 AI API Key：
- DeepSeek API Key（文本生成）
- 火山引擎 API Key（图像/视频生成）

## 许可证

MIT
