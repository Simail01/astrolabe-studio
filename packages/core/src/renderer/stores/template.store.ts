import { create } from 'zustand';
import { bridge } from '../services/bridge';
import type { PromptTemplate, TemplateStage } from '@astrolabe/shared';

interface TemplateState {
  /** 所有模板（内置 + 用户） */
  templates: PromptTemplate[];
  /** 每个阶段选中的模板 ID */
  selectedTemplates: Record<string, string | null>;
  /** 编辑器是否打开 */
  editorOpen: boolean;
  /** 正在编辑的模板 */
  editingTemplate: PromptTemplate | null;

  loadTemplates: (workspacePath: string) => Promise<void>;
  loadTemplatesByStage: (workspacePath: string, stage: TemplateStage) => Promise<void>;
  selectTemplate: (stage: string, templateId: string | null) => void;
  getSelectedTemplate: (stage: string) => PromptTemplate | null;
  saveTemplate: (workspacePath: string, template: PromptTemplate) => Promise<void>;
  deleteTemplate: (workspacePath: string, templateId: string) => Promise<void>;
  createFromBuiltIn: (workspacePath: string, builtInId: string, name: string, content: string) => Promise<PromptTemplate | null>;
  openEditor: (template?: PromptTemplate) => void;
  closeEditor: () => void;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  selectedTemplates: {},
  editorOpen: false,
  editingTemplate: null,

  loadTemplates: async (workspacePath: string) => {
    try {
      const builtIn = await bridge.templateListBuiltIn() as PromptTemplate[];
      let user: PromptTemplate[] = [];
      try {
        // Load all user templates by querying each stage
        const stages: TemplateStage[] = [
          'outline:generate', 'chapter:write', 'chapter:continue', 'storyboard:decompose',
          'wiki:extract', 'wiki:enrich', 'wiki:consistency', 'wiki:relations',
          'character:create', 'fanlib:adapt',
        ];
        const allUser: PromptTemplate[] = [];
        for (const stage of stages) {
          const templates = await bridge.templateListByStage(workspacePath, stage) as PromptTemplate[];
          allUser.push(...templates.filter(t => !t.isBuiltIn));
        }
        user = allUser;
      } catch { /* ok */ }
      set({ templates: [...builtIn, ...user] });
    } catch { /* ignore */ }
  },

  loadTemplatesByStage: async (workspacePath: string, stage: TemplateStage) => {
    try {
      const templates = await bridge.templateListByStage(workspacePath, stage) as PromptTemplate[];
      set((s) => {
        const others = s.templates.filter(t => t.stage !== stage);
        return { templates: [...others, ...templates] };
      });
    } catch { /* ignore */ }
  },

  selectTemplate: (stage, templateId) => {
    set((s) => ({ selectedTemplates: { ...s.selectedTemplates, [stage]: templateId } }));
  },

  getSelectedTemplate: (stage) => {
    const { templates, selectedTemplates } = get();
    const selectedId = selectedTemplates[stage];
    if (selectedId) return templates.find(t => t.id === selectedId) || null;
    // Default to first built-in template for this stage
    return templates.find(t => t.stage === stage && t.isBuiltIn) || null;
  },

  saveTemplate: async (workspacePath, template) => {
    await bridge.templateSave(workspacePath, template);
    set((s) => {
      const idx = s.templates.findIndex(t => t.id === template.id);
      if (idx >= 0) {
        const next = [...s.templates];
        next[idx] = template;
        return { templates: next };
      }
      return { templates: [...s.templates, template] };
    });
  },

  deleteTemplate: async (workspacePath, templateId) => {
    await bridge.templateDelete(workspacePath, templateId);
    set((s) => ({
      templates: s.templates.filter(t => t.id !== templateId),
      selectedTemplates: Object.fromEntries(
        Object.entries(s.selectedTemplates).map(([k, v]) => [k, v === templateId ? null : v])
      ),
    }));
  },

  createFromBuiltIn: async (workspacePath, builtInId, name, content) => {
    const result = await bridge.templateCreateFromBuiltIn(workspacePath, builtInId, name, content) as PromptTemplate | null;
    if (result) {
      set((s) => ({ templates: [...s.templates, result] }));
    }
    return result;
  },

  openEditor: (template) => set({ editorOpen: true, editingTemplate: template || null }),
  closeEditor: () => set({ editorOpen: false, editingTemplate: null }),
}));
