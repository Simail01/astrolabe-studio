import type { AstrolabeConfig, WorkspaceSession, RecoveryDraft } from '@astrolabe/shared';

const api = window.astrolabe;

export const bridge = {
  // File system
  readFile: (path: string) => api.invoke('fs:readFile', path) as Promise<string>,
  writeFile: (path: string, data: string) => api.invoke('fs:writeFile', path, data) as Promise<void>,
  readDir: (path: string) => api.invoke('fs:readDir', path) as Promise<string[]>,
  exists: (path: string) => api.invoke('fs:exists', path) as Promise<boolean>,
  mkdir: (path: string) => api.invoke('fs:mkdir', path) as Promise<void>,

  // Project
  readProject: (path: string) => api.invoke('project:read', path) as Promise<AstrolabeConfig>,
  createProject: (path: string, name: string) => api.invoke('project:create', path, name) as Promise<AstrolabeConfig>,

  // Session
  saveSession: (session: WorkspaceSession) => api.invoke('session:save', session) as Promise<void>,
  loadSession: () => api.invoke('session:load') as Promise<WorkspaceSession | null>,
  checkDrafts: () => api.invoke('session:checkDrafts') as Promise<RecoveryDraft[]>,

  // Export
  exportNovel: (projectPath: string, format: string) => api.invoke('export:novel', projectPath, format) as Promise<string>,
  exportCard: (cardPath: string, format: string) => api.invoke('export:card', cardPath, format) as Promise<string>,
  exportComic: (projectPath: string, format: string) => api.invoke('export:comic', projectPath, format) as Promise<string>,

  // Dialog & Workspace
  selectFolder: () => api.invoke('dialog:selectFolder') as Promise<string | null>,
  openWorkspace: (folderPath: string) => api.invoke('workspace:open', folderPath) as Promise<unknown>,
  getLastWorkspace: () => api.invoke('workspace:getLast') as Promise<string | null>,

  // Event listeners
  onFileChanged: (callback: (path: string) => void) => api.on('fs:fileChanged', callback as (...args: unknown[]) => void),

  // AI
  generateText: (prompt: string, systemPrompt?: string) => api.invoke('ai:text:generate', prompt, systemPrompt) as Promise<string>,
  generateTextStream: (prompt: string, systemPrompt?: string) => api.invoke('ai:text:stream', prompt, systemPrompt) as Promise<{ started: boolean }>,
  generateImage: (options: { prompt: string; model: string; size?: string; seed?: number; referenceImage?: string }) => api.invoke('ai:image:generate', options) as Promise<string[]>,
  pingVolcEngine: () => api.invoke('ai:volc:ping') as Promise<{ ok: boolean; error?: string }>,
  onAIChunk: (callback: (text: string) => void) => api.on('ai:text:chunk', callback as (...args: unknown[]) => void),
  onAIDone: (callback: (fullText: string) => void) => api.on('ai:text:done', callback as (...args: unknown[]) => void),
  onAIError: (callback: (error: string) => void) => api.on('ai:text:error', callback as (...args: unknown[]) => void),
  // Key management
  setAIKey: (provider: string, key: string) => api.invoke('ai:keys:set', provider, key) as Promise<void>,
  getAIKey: (provider: string) => api.invoke('ai:keys:get', provider) as Promise<string | null>,
  listAIKeys: () => api.invoke('ai:keys:list') as Promise<string[]>,
  deleteAIKey: (provider: string) => api.invoke('ai:keys:delete', provider) as Promise<void>,

  // Wiki
  wikiSave: (projectPath: string, entry: unknown) => api.invoke('wiki:save', projectPath, entry) as Promise<void>,
  wikiGet: (projectPath: string, type: string, id: string) => api.invoke('wiki:get', projectPath, type, id) as Promise<unknown>,
  wikiList: (projectPath: string, type?: string) => api.invoke('wiki:list', projectPath, type) as Promise<unknown[]>,
  wikiDelete: (projectPath: string, type: string, id: string) => api.invoke('wiki:delete', projectPath, type, id) as Promise<void>,
  wikiSearch: (projectPath: string, query: string) => api.invoke('wiki:search', projectPath, query) as Promise<unknown[]>,
  wikiRelated: (projectPath: string, entryId: string) => api.invoke('wiki:related', projectPath, entryId) as Promise<unknown[]>,

  // Fanlib
  fanlibSave: (workspacePath: string, card: unknown) => api.invoke('fanlib:save', workspacePath, card) as Promise<void>,
  fanlibGet: (workspacePath: string, type: string, id: string) => api.invoke('fanlib:get', workspacePath, type, id) as Promise<unknown>,
  fanlibList: (workspacePath: string, type?: string) => api.invoke('fanlib:list', workspacePath, type) as Promise<unknown[]>,
  fanlibDelete: (workspacePath: string, type: string, id: string) => api.invoke('fanlib:delete', workspacePath, type, id) as Promise<void>,
  fanlibSearch: (workspacePath: string, query: string) => api.invoke('fanlib:search', workspacePath, query) as Promise<unknown[]>,

  // Design
  designSave: (projectPath: string, characterId: string, design: unknown) => api.invoke('design:save', projectPath, characterId, design) as Promise<void>,
  designGet: (projectPath: string, characterId: string) => api.invoke('design:get', projectPath, characterId) as Promise<unknown>,
  designList: (projectPath: string, characterId: string) => api.invoke('design:list', projectPath, characterId) as Promise<string[]>,

  // Pipeline
  pipelineSaveOutline: (projectPath: string, outline: unknown) => api.invoke('pipeline:saveOutline', projectPath, outline) as Promise<void>,
  pipelineGetOutline: (projectPath: string) => api.invoke('pipeline:getOutline', projectPath) as Promise<unknown>,
  pipelineSaveChapter: (projectPath: string, chapter: unknown) => api.invoke('pipeline:saveChapter', projectPath, chapter) as Promise<void>,
  pipelineGetChapter: (projectPath: string, chapterId: string) => api.invoke('pipeline:getChapter', projectPath, chapterId) as Promise<unknown>,
  pipelineListChapters: (projectPath: string) => api.invoke('pipeline:listChapters', projectPath) as Promise<string[]>,
  pipelineSaveStoryboard: (projectPath: string, storyboard: unknown) => api.invoke('pipeline:saveStoryboard', projectPath, storyboard) as Promise<void>,
  pipelineGetStoryboard: (projectPath: string, chapterId: string) => api.invoke('pipeline:getStoryboard', projectPath, chapterId) as Promise<unknown>,
  pipelineSaveState: (projectPath: string, state: unknown) => api.invoke('pipeline:saveState', projectPath, state) as Promise<void>,
  pipelineGetState: (projectPath: string) => api.invoke('pipeline:getState', projectPath) as Promise<unknown>,
};
