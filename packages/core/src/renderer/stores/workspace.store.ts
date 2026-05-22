import { create } from 'zustand';
import type { Workspace } from '@astrolabe/shared';

interface WorkspaceState {
  workspace: Workspace | null;
  activeProject: string | null;
  setWorkspace: (ws: Workspace | null) => void;
  setActiveProject: (project: string | null) => void;
  getProjectPath: () => string | null;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: null,
  activeProject: null,

  setWorkspace: (workspace) => set({ workspace, activeProject: null }),

  setActiveProject: (project) => set({ activeProject: project }),

  getProjectPath: () => {
    const { workspace, activeProject } = get();
    if (!workspace || !activeProject) return null;
    return `${workspace.path}/${activeProject}`;
  },
}));
