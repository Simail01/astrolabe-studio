import type { Project, Chapter, WorkspaceSession, RecoveryDraft } from '@astrolabe/shared';

const api = window.astrolabe;

export const bridge = {
  // File system
  readFile: (path: string) => api.invoke('fs:readFile', path) as Promise<string>,
  writeFile: (path: string, data: string) => api.invoke('fs:writeFile', path, data) as Promise<void>,
  readDir: (path: string) => api.invoke('fs:readDir', path) as Promise<string[]>,
  exists: (path: string) => api.invoke('fs:exists', path) as Promise<boolean>,
  mkdir: (path: string) => api.invoke('fs:mkdir', path) as Promise<void>,

  // Project
  readProject: (path: string) => api.invoke('project:read', path) as Promise<Project>,
  createProject: (path: string, name: string) => api.invoke('project:create', path, name) as Promise<Project>,

  // Session
  saveSession: (session: WorkspaceSession) => api.invoke('session:save', session) as Promise<void>,
  loadSession: () => api.invoke('session:load') as Promise<WorkspaceSession | null>,
  checkDrafts: () => api.invoke('session:checkDrafts') as Promise<RecoveryDraft[]>,

  // Export
  exportNovel: (projectPath: string, format: string) => api.invoke('export:novel', projectPath, format) as Promise<string>,
  exportCard: (cardPath: string, format: string) => api.invoke('export:card', cardPath, format) as Promise<string>,
  exportComic: (projectPath: string, format: string) => api.invoke('export:comic', projectPath, format) as Promise<string>,

  // Event listeners
  onFileChanged: (callback: (path: string) => void) => api.on('fs:fileChanged', callback as (...args: unknown[]) => void),
};
