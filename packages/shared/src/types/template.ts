/** 提示词模板适用的功能阶段 */
export type TemplateStage =
  | 'outline:generate'
  | 'chapter:write'
  | 'chapter:continue'
  | 'storyboard:decompose'
  | 'wiki:extract'
  | 'wiki:enrich'
  | 'wiki:consistency'
  | 'wiki:relations'
  | 'character:create'
  | 'fanlib:adapt'
  | 'writing:rewrite'
  | 'writing:polish'
  | 'writing:expand'
  | 'writing:compress'
  | 'writing:enhance'
  | 'writing:style';

/** 模板变量声明 */
export interface TemplateVariable {
  key: string;
  label: string;
  description: string;
}

/** 提示词模板元数据 + 内容 */
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  stage: TemplateStage;
  content: string;
  variables: TemplateVariable[];
  baseTemplateId?: string;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 各阶段的中文名称映射 */
export const TEMPLATE_STAGE_LABELS: Record<TemplateStage, string> = {
  'outline:generate': '大纲生成',
  'chapter:write': '章节写作',
  'chapter:continue': '章节续写',
  'storyboard:decompose': '分镜拆解',
  'wiki:extract': 'Wiki 提取',
  'wiki:enrich': 'Wiki 丰富',
  'wiki:consistency': '一致性检查',
  'wiki:relations': '关系发现',
  'character:create': '角色创建',
  'fanlib:adapt': '同人适配',
  'writing:rewrite': '文本改写',
  'writing:polish': '文本润色',
  'writing:expand': '文本扩写',
  'writing:compress': '文本精简',
  'writing:enhance': '情感增强',
  'writing:style': '风格转换',
};
