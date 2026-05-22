# 漫画生成管线 — 实现计划

> **Goal:** 章节 → AI 分镜拆解 → 分镜编辑器 → AI 逐镜头生成漫画 → 预览

**Architecture:** 复用已有 PipelineService (save/get storyboard)，AI 拆解用 DeepSeek，图像生成用火山方舟。分镜数据存 `storyboards/{chapterId}.json`。

---

## Task C1: AI 分镜拆解按钮 + IPC

**Files:**
- Create: `packages/core/src/main/ipc/storyboard.ts` — `storyboard:decompose` handler
- Modify: `packages/core/src/main/ipc/index.ts` — 注册
- Modify: `packages/core/src/renderer/services/bridge.ts` — `storyboardDecompose` 方法

**Handler:** 读取章节内容 → Prompt 模板 → DeepSeek → 解析为 Shot[] → 返回

---

## Task C2: 分镜编辑器 UI（StoryboardViewer）

**Files:**
- Create: `packages/core/src/renderer/components/Pipeline/StoryboardViewer.tsx`

**功能:** 左侧分镜列表，右侧镜头详情面板。每个镜头卡片：序号、景别标签、角度标签、场景描述缩略、角色列表、对话预览。

---

## Task C3: 漫画逐镜头生成

**Files:**
- Modify: `packages/core/src/renderer/components/Pipeline/StoryboardViewer.tsx` — 添加"生成漫画"按钮

**流程:** 遍历所有 Shot → 对每个 Shot 组装图像 prompt + 角色设定图参考 → 调用火山方舟 → 展示进度 → 保存图片 URL 到 shot 数据

---

## Task C4: 漫画预览画廊

**Files:**
- Create: `packages/core/src/renderer/components/Pipeline/ComicPreview.tsx`

**功能:** 网格/列表展示所有镜头，点击放大查看，支持单镜头重新生成
