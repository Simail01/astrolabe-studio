import path from 'path';
import { app } from 'electron';
import { fileService } from './file.service';
import type { PromptTemplate, TemplateStage, TemplateVariable } from '@astrolabe/shared';

function ensureDir(dir: string): void {
  if (!fileService.exists(dir)) fileService.mkdir(dir);
}

// Built-in template metadata
const builtInMeta: Record<string, { name: string; description: string; stage: TemplateStage; variables: TemplateVariable[] }> = {
  'outline/generate': {
    name: '大纲生成（内置）',
    description: '根据故事梗概生成结构化大纲',
    stage: 'outline:generate',
    variables: [
      { key: 'prompt', label: '故事梗概', description: '用户输入的故事概要' },
    ],
  },
  'chapter/write': {
    name: '章节写作（内置）',
    description: '根据大纲节点和 Wiki 上下文撰写章节',
    stage: 'chapter:write',
    variables: [
      { key: 'chapterTitle', label: '章节标题', description: '当前章节标题' },
      { key: 'wikiContext', label: 'Wiki 上下文', description: '相关的 Wiki 条目信息' },
    ],
  },
  'chapter/continue': {
    name: '章节续写（内置）',
    description: '续写已有章节内容',
    stage: 'chapter:continue',
    variables: [
      { key: 'existingContent', label: '已有内容', description: '章节已有内容（末尾部分）' },
      { key: 'wikiContext', label: 'Wiki 上下文', description: '相关的 Wiki 条目信息' },
    ],
  },
  'storyboard/decompose': {
    name: '分镜拆解（内置）',
    description: '将章节内容拆解为漫画分镜脚本',
    stage: 'storyboard:decompose',
    variables: [
      { key: 'chapterContent', label: '章节内容', description: '完整的章节文本' },
      { key: 'characterDesigns', label: '角色设定', description: '角色设定参考信息' },
    ],
  },
  'wiki/extract': {
    name: 'Wiki 提取（内置）',
    description: '从章节内容中提取 Wiki 条目',
    stage: 'wiki:extract',
    variables: [
      { key: 'chapterContent', label: '章节内容', description: '章节文本' },
      { key: 'chapterTitle', label: '章节标题', description: '章节标题' },
    ],
  },
  'wiki/enrich': {
    name: 'Wiki 丰富（内置）',
    description: '丰富已有 Wiki 条目的内容',
    stage: 'wiki:enrich',
    variables: [
      { key: 'entryTitle', label: '条目标题', description: 'Wiki 条目标题' },
      { key: 'entryType', label: '条目类型', description: '条目分类' },
    ],
  },
  'wiki/consistency': {
    name: '一致性检查（内置）',
    description: '检查 Wiki 条目之间的一致性',
    stage: 'wiki:consistency',
    variables: [
      { key: 'entries', label: '条目列表', description: '所有 Wiki 条目摘要' },
    ],
  },
  'wiki/relations': {
    name: '关系发现（内置）',
    description: '发现 Wiki 条目之间的关系',
    stage: 'wiki:relations',
    variables: [
      { key: 'entries', label: '条目列表', description: '所有 Wiki 条目摘要' },
    ],
  },
  'character/create': {
    name: '角色创建（内置）',
    description: '生成角色详细设定',
    stage: 'character:create',
    variables: [
      { key: 'characterName', label: '角色名', description: '角色名称' },
      { key: 'storyContext', label: '故事背景', description: '故事背景信息' },
    ],
  },
  'fanlib/adapt': {
    name: '同人适配（内置）',
    description: '将同人库卡片适配为平行宇宙版本',
    stage: 'fanlib:adapt',
    variables: [
      { key: 'cardContent', label: '卡片内容', description: '原始同人卡片内容' },
      { key: 'worldSetting', label: '世界观', description: '目标世界观设定' },
    ],
  },
};

// Map stage to built-in file path
const stageToFile: Record<TemplateStage, string> = {
  'outline:generate': 'outline/generate',
  'chapter:write': 'chapter/write',
  'chapter:continue': 'chapter/continue',
  'storyboard:decompose': 'storyboard/decompose',
  'wiki:extract': 'wiki/extract',
  'wiki:enrich': 'wiki/enrich',
  'wiki:consistency': 'wiki/consistency',
  'wiki:relations': 'wiki/relations',
  'character:create': 'character/create',
  'fanlib:adapt': 'fanlib/adapt',
};

function getBuiltInTemplatesDir(): string {
  return path.join(app.getAppPath(), 'packages', 'ai', 'dist', 'prompts');
}

function getUserTemplatesDir(workspacePath: string): string {
  return path.join(workspacePath, 'templates');
}

export const templateService = {
  /** 获取所有内置模板 */
  getBuiltInTemplates(): PromptTemplate[] {
    const dir = getBuiltInTemplatesDir();
    const templates: PromptTemplate[] = [];
    for (const [relPath, meta] of Object.entries(builtInMeta)) {
      const filePath = path.join(dir, relPath + '.txt');
      let content = '';
      try { content = fileService.readFile(filePath); } catch { continue; }
      templates.push({
        id: `builtin:${relPath}`,
        name: meta.name,
        description: meta.description,
        stage: meta.stage,
        content,
        variables: meta.variables,
        isBuiltIn: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
    }
    return templates;
  },

  /** 获取用户的自定义模板 */
  getUserTemplates(workspacePath: string): PromptTemplate[] {
    const dir = getUserTemplatesDir(workspacePath);
    if (!fileService.exists(dir)) return [];
    const files = fileService.readDir(dir).filter(f => f.endsWith('.json'));
    const templates: PromptTemplate[] = [];
    for (const f of files) {
      try {
        templates.push(JSON.parse(fileService.readFile(path.join(dir, f))));
      } catch { /* skip malformed */ }
    }
    return templates;
  },

  /** 获取指定阶段的所有模板（内置 + 用户） */
  getTemplatesByStage(workspacePath: string, stage: TemplateStage): PromptTemplate[] {
    return [
      ...this.getBuiltInTemplates().filter(t => t.stage === stage),
      ...this.getUserTemplates(workspacePath).filter(t => t.stage === stage),
    ];
  },

  /** 获取单个模板 */
  getTemplate(workspacePath: string, templateId: string): PromptTemplate | null {
    if (templateId.startsWith('builtin:')) {
      const relPath = templateId.replace('builtin:', '');
      const meta = builtInMeta[relPath];
      if (!meta) return null;
      const filePath = path.join(getBuiltInTemplatesDir(), relPath + '.txt');
      try {
        const content = fileService.readFile(filePath);
        return { id: templateId, name: meta.name, description: meta.description, stage: meta.stage, content, variables: meta.variables, isBuiltIn: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      } catch { return null; }
    }
    const filePath = path.join(getUserTemplatesDir(workspacePath), `${templateId}.json`);
    if (!fileService.exists(filePath)) return null;
    return JSON.parse(fileService.readFile(filePath));
  },

  /** 保存用户自定义模板 */
  saveTemplate(workspacePath: string, template: PromptTemplate): void {
    const dir = getUserTemplatesDir(workspacePath);
    ensureDir(dir);
    template.isBuiltIn = false;
    template.updatedAt = new Date().toISOString();
    if (!template.createdAt) template.createdAt = template.updatedAt;
    fileService.writeFile(path.join(dir, `${template.id}.json`), JSON.stringify(template, null, 2));
  },

  /** 删除用户自定义模板 */
  deleteTemplate(workspacePath: string, templateId: string): void {
    if (templateId.startsWith('builtin:')) return;
    const filePath = path.join(getUserTemplatesDir(workspacePath), `${templateId}.json`);
    if (fileService.exists(filePath)) fileService.deleteFile(filePath);
  },

  /** 基于内置模板创建用户模板 */
  createFromBuiltIn(workspacePath: string, builtInId: string, name: string, content: string): PromptTemplate | null {
    const base = this.getTemplate(workspacePath, builtInId);
    if (!base) return null;
    const template: PromptTemplate = {
      id: `user-${Date.now()}`,
      name,
      description: `基于"${base.name}"自定义`,
      stage: base.stage,
      content,
      variables: base.variables,
      baseTemplateId: builtInId,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.saveTemplate(workspacePath, template);
    return template;
  },
};
