<div align="center">

# Astrolabe Studio

**AI-Powered Desktop IDE for Novel / Comic / Motion Comic Creation**

![Electron](https://img.shields.io/badge/Electron-30-47848F?style=flat&logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat&logo=typescript&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-4.5-FF6B35?style=flat)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat&logo=vite&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-1.6-6E9F18?style=flat&logo=vitest&logoColor=white)

[English](#features) | [中文](#特性概览)

</div>

---

## What is Astrolabe Studio?

A **full-stack Electron desktop IDE** that integrates AI capabilities into every stage of creative writing — from story outlining to comic page composition. Built as a **pnpm monorepo** with strict package boundary isolation, it features a custom IPC bridge architecture, multi-provider AI integration (DeepSeek text generation + Volcengine image generation), and a VS Code-style editor interface.

> **Design Philosophy:** No database. All data is JSON files on disk, giving creators full Git-compatible version control over their work.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Electron Shell (30)                        │
├───────────────┬─────────────────────────┬───────────────────────┤
│   Main (CJS)  │    Preload (Bridge)     │  Renderer (ESNext)    │
│               │                         │                       │
│  14 IPC       │   contextBridge         │  React 18 + Zustand   │
│  handlers     │   window.astrolabe      │  10 stores            │
│               │                         │  23 components        │
│  9 services   │   invoke / on / send    │  Vite bundler         │
│  (file I/O,   │   type-safe API         │                       │
│   AI, wiki,   │                         │                       │
│   pipeline)   │                         │                       │
└───────────────┴─────────────────────────┴───────────────────────┘
```

### Monorepo Packages

```
packages/
├── shared/     @astrolabe/shared   Pure type definitions (zero runtime)
├── core/       @astrolabe/core     Electron main + React renderer + IPC
└── ai/         @astrolabe/ai       DeepSeek + Volcengine API clients
```

### Data Flow

```
React Component
    → Zustand Store (optimistic update)
        → bridge.invoke(channel, payload)
            → contextBridge → IPC → Main Handler
                → Service (file I/O / AI API)
                    → Result flows back through IPC
```

### IPC Convention

| Pattern | Usage | Example |
|---------|-------|---------|
| `invoke/handle` | Request-response | `fs:readFile`, `wiki:search` |
| `on/send` | Server push (streaming) | `ai:text:chunk`, `fs:fileChanged` |

Channel naming: `{domain}:{action}` — 14 registered handler modules in `ipc/index.ts`.

---

## Features

### 6 Subsystems

| # | Subsystem | Status | Description |
|---|-----------|--------|-------------|
| 1 | Core IDE Framework | Done | Window management, VS Code-style layout, command palette, session recovery |
| 2 | Wiki Knowledge Base | Done | CRUD for characters/locations/items/events, relationship graph, full-text search, AI context injection |
| 3 | Fan Library | Done | Card-based management, alternate universe import, JSON export |
| 4 | AI Creation Pipeline | Done | 6-stage state machine: Outline → Characters → Chapters → Storyboard → Comic → Motion Comic |
| 5 | Character Consistency | Done | Design sheet versioning, expression/pose extension, fan library adaptation |
| 6 | AI Integration Layer | Done | DeepSeek text/streaming, Volcengine image generation, KeyStore, PromptManager |

### AI Capabilities

- **Text Generation** — DeepSeek API with SSE streaming (`onChunk` / `onDone` / `onError` callbacks)
- **Image Generation** — Volcengine (火山方舟) text-to-image and image-to-image
- **Prompt Template System** — Customizable templates per pipeline stage, built-in + user-defined
- **Wiki Auto-extract** — AI parses chapter content and extracts character/setting references
- **Consistency Check** — AI cross-references wiki entries for contradictions

### Editor Features

- **Outline Editor** — Tree-structured story outline with AI-assisted generation
- **Chapter Editor** — Rich text editing with AI continuation and style templates
- **Storyboard Viewer** — Chapter → shot decomposition with AI-driven scene breakdown
- **Comic Page Builder** — Grid-based canvas with shot library and panel generation
- **Command Palette** — Keyboard-first navigation (Ctrl+P)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron 30 |
| UI Framework | React 18 + TypeScript 5.5 |
| State Management | Zustand 4.5 (10 isolated stores) |
| Build | Vite 5.4 (renderer) + tsc (main/preload) |
| Testing | Vitest 1.6 |
| Monorepo | pnpm 9 workspaces + Turborepo |
| AI — Text | DeepSeek API (OpenAI-compatible, SSE streaming) |
| AI — Image | Volcengine Ark API (火山方舟) |
| File Watch | Chokidar 3.6 |
| Storage | JSON files on disk (no database) |

---

## Project Structure

```
packages/
├── shared/src/types/
│   ├── workspace.ts          # Workspace & session types
│   ├── project.ts            # Project config (astrolabe.json)
│   ├── pipeline.ts           # Outline, Chapter, Storyboard, PipelineState
│   ├── wiki.ts               # Wiki entries (character/location/item/event/setting)
│   ├── fanlib.ts             # Fan library card types
│   ├── character-design.ts   # Character design sheet & expression/pose
│   ├── plugin.ts             # Plugin system types
│   └── template.ts           # Prompt template types
│
├── core/src/
│   ├── main/
│   │   ├── index.ts           # Electron entry point
│   │   ├── window.ts          # BrowserWindow creation
│   │   ├── services/          # 9 services (file, project, session, wiki, fanlib, pipeline, export, template, keystore)
│   │   └── ipc/               # 14 IPC handler modules + registerAllHandlers()
│   │
│   └── renderer/
│       ├── App.tsx            # Root component
│       ├── services/bridge.ts # Type-safe IPC bridge (97 lines, 80+ methods)
│       ├── stores/            # 10 Zustand stores
│       ├── components/
│       │   ├── Shell/         # GlobalNav, BottomBar, MenuBar
│       │   ├── Pages/         # OutlinePage, WritingPage, ComicPage
│       │   ├── Editor/        # ChapterEditor
│       │   ├── Outline/       # OutlineEditor (tree structure)
│       │   ├── Pipeline/      # StoryboardViewer
│       │   ├── Wiki/          # WikiPanel
│       │   ├── Fanlib/        # FanlibPanel, CreateCardDialog, ImportDialog
│       │   ├── AI/            # AIBubble (floating AI assistant)
│       │   ├── CommandPalette/# Command palette (Ctrl+P)
│       │   ├── Explorer/      # File explorer sidebar
│       │   ├── Settings/      # SettingsPanel, AISettings
│       │   ├── Template/      # TemplateSelector, TemplateEditor
│       │   ├── Workspace/     # WorkspaceDialog
│       │   └── Project/       # CreateProjectDialog
│       └── hooks/             # useKeyboard
│
└── ai/src/
    ├── deepseek.ts            # DeepSeek client (generate + SSE streaming)
    ├── volcengine.ts          # Volcengine client (text-to-image, image-to-image, ping)
    ├── prompt-manager.ts      # Prompt template management
    └── prompts/               # Built-in prompt templates
```

---

## Data Model

All data stored as JSON files — one entity per file, Git-friendly:

```
{workspace}/
├── fanlib/                        # Fan library (shared across projects)
│   └── {type}/{id}.json
│
└── {project}/
    ├── astrolabe.json             # Project config
    ├── pipeline-state.json        # Pipeline progress tracking
    ├── outline/outline.json       # Story outline tree
    ├── chapters/{id}.json         # Chapter content
    ├── storyboards/{chapterId}.json # Shot-by-shot decomposition
    ├── characters/{id}.json       # Character profiles
    ├── characters/{id}/designs/   # Design sheet versions
    ├── wiki/{type}/{id}.json      # Wiki entries
    └── templates/{id}.json        # Custom prompt templates
```

---

## Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 9

### Install & Run

```bash
# Clone
git clone https://github.com/Simail01/astrolabe-studio.git
cd astrolabe-studio

# Install (skip Electron binary download for China network)
pnpm install --ignore-scripts

# Development mode
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Package for Windows
pnpm package:win
```

Output: `packages/core/release/win-unpacked/星盘工坊.exe`

### First Launch

1. Open the app
2. Configure AI API Keys in Settings:
   - **DeepSeek API Key** — for text generation (outline, writing, wiki extraction)
   - **Volcengine API Key** — for image generation (storyboard, comic panels)

---

## Testing

```bash
# All packages
pnpm test

# Single package
cd packages/core && npx vitest run

# Single file
cd packages/core && npx vitest run __tests__/stores/layout.store.test.ts
```

**Test coverage:** 12 test files covering stores (6), services (4), and bridge (1).

---

## Engineering Highlights

- **Strict package boundaries** — `shared` has zero runtime deps; `core` never imports AI SDK directly
- **Type-safe IPC** — `bridge.ts` wraps all 80+ IPC methods with TypeScript generics
- **Streaming architecture** — SSE-based AI text streaming with chunk/done/error event model
- **No database** — JSON files enable transparent data format and native Git version control
- **Modular IPC** — 14 handler modules, each self-registering via `registerAllHandlers()`
- **Store isolation** — 10 Zustand stores, each managing a single domain concern
- **Prompt template system** — User-customizable AI prompts per pipeline stage, built-in defaults shipped as JSON

---

## License

MIT
