# 同人库系统 — 设计规格

> 子系统 #3 | 状态：已确认 | 2026-05-21

## 定位

独立于任何作品的"灵感素材库"。作者将任何来源的角色、世界观、物品、事件以卡片形式保存。在创作新作品时引入卡片，以**平行宇宙**形式赋予卡片人物新的人生。

三个核心原则：
1. **完全解耦** — 同人库不依赖任何作品，独立存在于工作区级别
2. **平行宇宙** — 引入到作品中的角色是该卡片的"副本"，修改不影响原卡片
3. **来源追溯** — 每个卡片记录来源，引入历史可查

## 卡片类型

```
同人库 (工作区级别)
├── 人物卡片 (CharacterCard)
│   ├── 来源：影视角色、小说人物、漫画角色、历史人物、现实中的人
│   └── 记录：外貌、性格、能力、背景故事、人际关系网
│
├── 世界观卡片 (WorldviewCard)
│   ├── 来源：影视世界观、小说设定、神话体系、现实文化背景
│   └── 记录：规则体系、历史背景、地理版图、势力分布
│
├── 物品卡片 (ItemCard)
│   ├── 武器、法宝、载具、科技装置、魔法道具…
│   └── 记录：外观、能力、来源、限制条件
│
└── 事件卡片 (EventCard)
    ├── 经典桥段、历史事件、情节模板…
    └── 记录：起因经过结果、参与方、可提取的叙事模式
```

## 数据模型

```typescript
interface CardMeta {
  id: string;
  type: 'character' | 'worldview' | 'item' | 'event';
  name: string;
  aliases: string[];
  avatar?: string;
  tags: string[];
  source: CardSource;
  createdAt: string;
  updatedAt: string;
}

interface CardSource {
  type: 'anime' | 'movie' | 'novel' | 'comic' | 'game' | 'real_person' | 'real_world' | 'original';
  title: string;
  url?: string;
  note?: string;
}

interface CharacterCard extends CardMeta {
  type: 'character';
  appearance: string;
  personality: string;
  abilities: string[];
  background: string;
  relationships: CardRelation[];
  designImages: string[];
}

interface WorldviewCard extends CardMeta {
  type: 'worldview';
  rules: string[];
  history: string;
  geography: string;
  factions: string[];
  powerSystem: string;
}

interface ItemCard extends CardMeta {
  type: 'item';
  category: string;
  appearance: string;
  abilities: string[];
  origin: string;
  limitations: string;
}

interface EventCard extends CardMeta {
  type: 'event';
  participants: string[];
  cause: string;
  process: string;
  result: string;
  narrativePattern: string;
}
```

## 存储结构

```
<工作区>/fanlib/
├── fanlib-index.json         # 全局索引 + 标签聚合
├── characters/
│   ├── cc-001.json
│   └── cc-002.json
├── worldviews/
│   └── wv-001.json
├── items/
│   └── it-001.json
├── events/
│   └── ev-001.json
└── assets/
    ├── design-images/
    │   ├── cc-001-v1.png
    │   └── cc-001-v2.png
    └── thumbnails/
```

## 平行宇宙引入机制

作者从同人库引一张卡片到作品中，产生一个"平行宇宙分身"：

```
同人库                                作品《三国演义·重构》
┌──────────────┐                    ┌──────────────────────┐
│ 人物卡片      │      引入          │ 角色 (作品内)          │
│              │  ═════════▶       │                      │
│ 名称: 吕布   │                    │ 名称: 吕布·改          │
│ 来源: 三国演义 │                    │ 来源: fanlib:cc-003  │
│ 外貌: …      │                    │ 外貌: 来自卡片（可改）  │
│ 性格: 勇武   │                    │ 性格: 儒雅内敛 ←— 改编  │
│ 能力: …      │                    │ 能力: 来自卡片 + 新增  │
│ 背景: …      │                    │ 背景: 完全重写 ←— 改编  │
└──────────────┘                    └──────────────────────┘
                                             │
                                        平行宇宙的人生
```

### 引入记录

```typescript
interface FanlibImport {
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
```

### 引入流程

```
1. 作者在创作时 → 打开同人库面板
2. 浏览/搜索同人卡片 → 选择目标卡片
3. 点击 "引入当前作品"
4. 弹出引入配置对话框：
   ┌──────────────────────────────────┐
   │ 引入人物：[吕布]                    │
   │                                  │
   │ 名称保留：  [吕布▾] (可改)         │
   │                                  │
   │ 保留原始设定：                     │
   │ ☑ 外貌                           │
   │ ☑ 能力                            │
   │ ☐ 性格  → [新性格描述…]   ← 改编   │
   │ ☐ 背景  → [新背景描述…]   ← 改编   │
   │                                  │
   │ 新增能力： [+ 添加…]              │
   │                                  │
   │         [取消]  [引入]            │
   └──────────────────────────────────┘
5. 在作品中生成新角色，标记 sourceCardId
6. 作者可在此基础上继续修改，不影响原卡片
```

## 角色设定图机制

同人库的人物卡片支持设定图，与作品角色共用一致性引擎（子系统 #5）：

```
人物卡片创建时：
  ├─ 作者上传设定图 → 存入 fanlib/assets/design-images/
  ├─ AI 生成设定图 → 调用火山引擎，基于文字描述生成
  └─ 无设定图 → 首次引入作品时再决定
```

## 检索与浏览

```
同人库面板 (渲染在右侧面板或独立编辑器)：

┌──────────────────────────────────────────────┐
│ 🔍 搜索卡片…                    [类型▾] [标签▾] │
├──────────┬───────────────────────────────────┤
│          │                                   │
│ 卡片列表  │  预览区                           │
│          │  ┌─────────────────────┐          │
│ ┌──────┐ │  │                 图片 │          │
│ │ 吕布  │ │  │                     │          │
│ │ 人物  │ │  │  名称: 吕布          │          │
│ │ 三国  │ │  │  来源: 三国演义       │          │
│ └──────┘ │  │  性格: 勇武无双       │          │
│ ┌──────┐ │  │                     │          │
│ │ 九尾  │ │  │  [引入当前作品]       │          │
│ │ 人物  │ │  │  [导出卡片]          │          │
│ │ 火影  │ │  │  [编辑卡片]          │          │
│ └──────┘ │  └─────────────────────┘          │
└──────────┴───────────────────────────────────┘
```

## 导出与导入

| 格式 | 用途 |
|------|------|
| JSON | 完整数据 + 设定图内嵌（base64），分享给其他作者导入 |
| Markdown | 人类可读的卡片描述，发布到社区、存档 |
| 图片 | 卡片信息渲染为精美信息图，社交媒体分享 |

导入：拖入 `.json` 文件 → 解析 → 预览卡片内容 → 确认导入（处理同名冲突）。
