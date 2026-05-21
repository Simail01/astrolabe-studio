import { create } from 'zustand';
import type { Workspace } from '@astrolabe/shared';

interface WorkspaceState {
  workspace: Workspace | null;
  setWorkspace: (ws: Workspace | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspace: null,
  setWorkspace: (workspace) => set({ workspace }),
}));
