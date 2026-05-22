# 第一阶段：创作闭环 — 实现计划

> 让用户从打开应用到完成一章写作的完整闭环

**Goal:** 工作区管理 → 作品创建 → AI 大纲生成 → AI 章节撰写 → 章节编辑，打通创作最小闭环。

---

## Task P1: 工作区管理对话框

**Files:**
- Create: `packages/core/src/renderer/components/Workspace/WorkspaceDialog.tsx`
- Create: `packages/core/src/renderer/stores/workspace.store.ts` — 扩展（已有基础）

**功能：** 打开/新建工作区按钮 → 原生文件夹选择对话框 → 保存工作区配置 → 更新 workspace store

**实现要点：**
- 使用 Node.js `dialog.showOpenDialog` 选择文件夹
- 通过 IPC `dialog:openWorkspace` 调用
- 新建工作区 = 选空文件夹 → 创建 `astrolabe-workspace.json`
- UI：首页居中卡片，两个按钮

**IPC:**
- `dialog:selectFolder` → 返回文件夹路径或 null
- `workspace:open` → 读取/创建工作区配置

---

## Task P2: 工作区初始化 + 状态恢复

**功能：**
- 打开工作区后：扫描已有作品列表，更新 Explorer
- 会话恢复：启动时加载上次工作区
- Explorer 树：作品列表（大纲/章节/角色/Wiki 子节点）

**Store 扩展：**
- `workspace.store` 添加 `projects: ProjectInfo[]`, `loadProjects()`

---

## Task P3: 作品创建向导

**Files:**
- Create: `packages/core/src/renderer/components/Project/CreateProjectDialog.tsx`

**功能：**
- 输入作品标题、选择类型标签、一句话梗概
- 点击创建 → 调用 `project:create` IPC → 生成目录结构 + `astrolabe.json`
- 创建成功后自动在 Explorer 中选中新作品

---

## Task P4: 大纲编辑器

**Files:**
- Create: `packages/core/src/renderer/components/Outline/OutlineEditor.tsx`

**功能：**
- 树形结构展示（Volume → Chapter）
- 节点增删改：添加卷/章、编辑标题和概要、拖拽排序（简化版：上下移动）
- 选择章节 → 标记为当前编辑目标
- AI 生成大纲按钮（调用 DeepSeek，入口）

**Store:**
- `outline.store.ts` — outline 数据、选中节点、展开状态

---

## Task P5: AI 大纲生成集成

**功能：**
- 在 OutlineEditor 中点击"AI 生成大纲" → 调用 `bridge.generateText()`
- 使用 outline/generate.txt 模板
- 流式展示生成过程或一次性返回
- AI 返回后解析为大纲树 → 填充到 OutlineEditor
- 作者确认/调整后 → 保存到 `outline/outline.json`

---

## Task P6: 章节编辑器

**Files:**
- Create: `packages/core/src/renderer/components/Editor/ChapterEditor.tsx`

**功能：**
- Textarea/Markdown 编辑区（先做纯文本，后续扩展 Markdown 预览）
- 字数实时统计
- 自动保存（失焦 + 30s 定时）
- 标题显示

---

## Task P7: AI 章节撰写

**功能：**
- 选择大纲节点 + 角色上下文 + Wiki 上下文 → 组装 prompt
- 调用 `bridge.generateTextStream()` 流式生成
- 流式逐字展示在编辑区
- 生成完成后作者可修改、确认保存
- 保存后触发 Wiki 自动提取（调用 AI 分析新章节）

**IPC 集成：**
- 使用已有的 `ai:text:stream` + `onAIChunk/onAIDone/onAIError`

---

## Task P8: Explorer 集成 + 完整联调

**功能：**
- Explorer 完整文件树：双击打开章节到编辑器、右键菜单
- 新建章节按钮、新建角色按钮
- 状态栏实时更新：当前项目、字数、AI 状态
- 各阶段串联测试：创建工作区 → 创建作品 → AI 大纲 → 选章节 → AI 撰写 → 保存

---

## 规格覆盖自审

| 功能 | 覆盖任务 |
|------|---------|
| 工作区管理 | P1, P2 |
| 作品创建向导 | P3 |
| 大纲编辑器 | P4 |
| AI 大纲生成 | P5 |
| 章节编辑器 | P6 |
| AI 章节撰写 | P7 |
| 集成联调 | P8 |
