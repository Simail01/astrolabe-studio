# AI 集成层 — 设计规格

> 子系统 #6 | 状态：已确认 | 2026-05-21

## 定位

星盘工坊的 AI 基础设施。封装 DeepSeek（文本）和火山引擎（图像/视频）的 API 调用，为上层创作管线提供统一的生成接口。不含任何创作逻辑——只管"调用什么模型、怎么调用"。客户自带 API Key。

## 技术决策

| 维度 | 决策 |
|------|------|
| 文本模型 | DeepSeek (deepseek-chat / deepseek-reasoner) |
| 图像模型 | 火山引擎视觉智能 |
| 视频模型 | 火山引擎视频生成 |
| 通信方式 | Main 进程发起 HTTP 请求，Renderer 通过 IPC 流式接收 |
| API Key 管理 | 本地加密存储（electron-store + safeStorage） |

## 架构

```
┌─ Renderer (React) ─────────────────────────────────────────┐
│                                                             │
│  创作管线组件  →  AI Service 接口  →  Bridge (IPC)          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  IPC                                                        │
│  ├─ invoke: 'ai:text:generate' (一次性)                     │
│  ├─ invoke: 'ai:text:stream' → on('ai:text:chunk') (流式)  │
│  ├─ invoke: 'ai:image:generate'                             │
│  └─ invoke: 'ai:video:generate'                             │
├─────────────────────────────────────────────────────────────┤
│  Main (Node.js)                                             │
│                                                             │
│  AIService                                                   │
│  ├─ DeepSeekClient (HTTP → api.deepseek.com)                │
│  ├─ VolcEngineClient (HTTP → visual.volcengineapi.com)      │
│  ├─ PromptManager (模板管理 + 上下文装配)                    │
│  └─ KeyStore (electron-store 加密存储 API Key)              │
└─────────────────────────────────────────────────────────────┘
```

## Service 接口

```typescript
interface IAIService {
  // 文本 — 一次性
  generateText(options: TextGenerateOptions): Promise<string>;
  // 文本 — 流式
  generateTextStream(options: TextGenerateOptions): StreamController;
  // 图像
  generateImage(options: ImageGenerateOptions): Promise<string[]>;
  // 视频
  generateVideo(options: VideoGenerateOptions): Promise<string>;
}

interface TextGenerateOptions {
  prompt: string;
  systemPrompt?: string;
  model?: 'deepseek-chat' | 'deepseek-reasoner';
  maxTokens?: number;
  temperature?: number;
  contextFromWiki?: string;
  contextFromFanlib?: string;
}

interface StreamController {
  onChunk: (cb: (text: string) => void) => void;
  onDone: (cb: (fullText: string) => void) => void;
  onError: (cb: (err: Error) => void) => void;
  abort: () => void;
}

interface ImageGenerateOptions {
  prompt: string;
  negativePrompt?: string;
  referenceImage?: string;
  width?: number;
  height?: number;
}

interface VideoGenerateOptions {
  prompt: string;
  duration?: number;
  referenceImages?: string[];
}
```

## Prompt 模板管理

不使用硬编码 prompt 字符串，每个创作阶段对应一个模板文件：

```
prompts/
├── outline/
│   ├── generate.txt          # 生成大纲
│   └── expand.txt            # 展开大纲节点
├── character/
│   ├── create.txt            # 创建角色
│   └── relationship.txt      # 角色关系图谱
├── chapter/
│   ├── write.txt             # 撰写章节
│   ├── continue.txt          # 续写
│   └── revise.txt            # 修改润色
├── storyboard/
│   └── decompose.txt         # 章节→分镜拆解
└── consistency/
    └── check.txt             # 角色/剧情一致性检查
```

模板语法示例（`chapter/write.txt`）：

```
你是一位专业小说作家。根据以下信息撰写下一章。

## 作品大纲
{{outline}}

## 前情提要
{{previousChapterSummary}}

## 相关角色
{{characters}}

## 当前剧情节点
{{currentPlotNode}}

## Wiki 参考
{{wikiContext}}

## 写作要求
- 保持角色性格一致
- 字数：{{targetWordCount}} 字
- 风格：{{style}}

请撰写第 {{chapterNumber}} 章：
```

模板变量由上游调用方传入，AI 服务只负责渲染模板 + 调用 API。

## 模型选择策略

| 场景 | 模型 | 理由 |
|------|------|------|
| 大纲生成 | deepseek-reasoner | 需要深度推理和结构化输出 |
| 章节撰写 | deepseek-chat | 速度快，长篇生成成本低 |
| 角色创建 | deepseek-chat | 结构化描述，不需要强推理 |
| 分镜拆解 | deepseek-chat | 格式转换任务 |
| 一致性检查 | deepseek-reasoner | 需要跨章节逻辑推理 |
| 图像生成 | 火山引擎 CV | 唯一选择 |
| 视频生成 | 火山引擎 Video | 唯一选择 |

## 流式通信

```
Renderer                  Main                    API
  │                         │                      │
  │── invoke('ai:text:stream')▶│── SSE Stream ──────▶│
  │                         │◀── chunk ────────────│
  │◀── on('ai:text:chunk') ──│                      │
  │◀── on('ai:text:chunk') ──│                      │
  │◀── on('ai:text:done') ───│                      │
```

## Key 管理

- API Key 使用 electron safeStorage 加密存储
- 客户在设置面板配置，Key 永不离开本地
- 配置以 JSON 文件存储，读入内存后解密使用
