# 角色一致性引擎 — 设计规格

> 子系统 #5 | 状态：已确认 | 2026-05-21

## 定位

解决漫画/漫剧中**角色形象不统一**的核心痛点。通过"预生成设定图 + 首次登场触发"的机制，确保同一角色在不同分镜、不同场景中保持视觉一致。

适用于两类角色来源：
- **作品原创角色** — 作者手动创建或 AI 生成
- **同人库引入角色** — 已有同人卡片作为基底，作者选择是否使用卡片的设定图

## 核心流程

```
角色首次登场
     │
     ▼
  ┌─────────────────────────────┐
  │ 是否已有设定图？              │
  └──────┬──────────────────────┘
         │
    ┌────┴────┐
    │         │
   有        没有
    │         │
    ▼         ▼
  使用   ┌──────────────────────┐
 已有图  │ 弹出 "角色设定图配置"   │
         │                      │
         │ A: AI 生成设定图      │
         │ B: 手动上传          │
         │ C: 暂时跳过          │
         └──────┬───────────────┘
                │
           ┌────┴────┐
           │         │
          A/B        C
           │         │
           ▼         ▼
     生成/上传    标记为"无设定图"
     确认设定图    后续可补
           │
           ▼
  ┌──────────────────────────────┐
  │ 设定图入库                     │
  │ ├─ characters/char-xxx/       │
  │ │   ├── design-v1.png         │
  │ │   ├── expressions/          │
  │ │   │   ├── neutral.png       │
  │ │   │   ├── happy.png         │
  │ │   │   ├── angry.png         │
  │ │   │   └── sad.png           │
  │ │   ├── poses/                │
  │ │   │   ├── front.png         │
  │ │   │   ├── side.png          │
  │ │   │   └── action.png        │
  │ │   └── design.json           │
  │ └── settings.json             │
  └──────────────────────────────┘
```

## 数据模型

```typescript
interface CharacterDesign {
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

interface CharacterDesignConfig {
  characterId: string;
  source: 'ai-generated' | 'user-upload' | 'fanlib-card';
  fanlibCardId?: string;
  fanlibDesignBorrowed?: boolean;
  hasDesign: boolean;
  lastUpdated: string;
}

interface Expression {
  type: 'neutral' | 'happy' | 'angry' | 'sad' | 'surprised';
  image: string;
}

interface Pose {
  type: 'front' | 'side' | 'action' | 'casual';
  image: string;
}
```

## AI 生成设定图

基于角色文字描述 → 火山引擎生成设定图：

```
Prompt 构造：

"角色设定图，全身像，正面站立，白色背景，高细节，动漫风格。
角色名：{{name}}
外貌：{{appearance}}
服饰：{{clothing}}
体型：{{bodyType}}
年龄感：{{ageGroup}}
附加要求：三视图风格，便于后续参考"

→ 火山引擎生成 4 张候选
→ 作者选择最满意的一张确认为设定图
```

## 表情与姿态扩展

确认基础设定图后，作者可一键生成扩展包：

```
基础设定图 confirmed
       │
       ▼
  以基础图为参考 → 火山引擎图生图
  ├─ 中性表情 (neutral)
  ├─ 微笑 (happy)
  ├─ 愤怒 (angry)
  ├─ 悲伤 (sad)
  └─ 惊讶 (surprised)
       │
       ▼
  以基础图为参考 → 火山引擎图生图
  ├─ 正面站立 (front)
  ├─ 侧面站立 (side)
  ├─ 战斗姿态 (action)
  └─ 坐姿/日常 (casual)
```

## 同人库卡片适配

```
从同人库引入角色时：

作者引入 [吕布] 卡片
       │
       ▼
  ┌──────────────────────────────┐
  │ 卡片是否已有设定图？           │
  └──────┬───────────────────────┘
         │
    ┌────┴────┐
    │         │
   有        没有
    │         │
    ▼         ▼
  ┌─────────────────────┐   触发作品侧
  │ 提示：               │   "角色设定图配置"
  │ "该卡片已有设定图，   │   流程
  │  是否沿用？"         │
  │                     │
  │ ☑ 沿用原设定图       │
  │ ☐ 重新生成新形象     │
  └─────────────────────┘
```

## 一致性校验

在漫画生成阶段（子系统 #4），角色设定图作为参考图喂给火山引擎：

```
分镜中角色出场
       │
       ▼
从角色设定库加载：设定图 + 当前分镜指定的表情/姿态
       │
       ▼
火山引擎图生图：
  prompt: "分镜场景描述..."
  reference_image: 角色设定图
       │
       ▼
生成的分镜 → 角色形象一致
```

## 版本管理

```
v1: 首次生成 → 作者确认 → 标记为 current
v2: 作者不满意 → 重新生成 → 预览对比 v1 vs v2 → 选择 → 新版本成为 current
旧版本保留不删除（作者可能想回退）
漫画已生成的分镜绑定当时的设定图版本
重新生成漫画时自动使用最新版本
```

## 存储结构

```
<作品目录>/characters/
├── char-001.json              # 角色数据
└── char-001/
    ├── design-v1.png
    ├── design-v1-thumb.png
    ├── expressions/
    │   ├── neutral.png
    │   ├── happy.png
    │   ├── angry.png
    │   └── sad.png
    ├── poses/
    │   ├── front.png
    │   ├── side.png
    │   └── action.png
    └── design.json

# 同人库侧（同样结构）
<工作区>/fanlib/assets/design-images/
├── cc-001/
│   ├── design-v1.png
│   └── ...
└── cc-002/
    └── ...
```
