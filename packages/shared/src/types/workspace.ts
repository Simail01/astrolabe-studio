export interface Workspace {
  id: string;
  name: string;
  path: string;
  projects: string[];
  fanlibPath: string;
  lastOpened?: Record<string, string>;
}

export interface WorkspaceSession {
  openedProjects: string[];
  activeProject: string | null;
  tabs: SessionTab[];
  panelLayout: PanelLayout;
  scrollPositions: Record<string, number>;
}

export interface SessionTab {
  projectId: string;
  filePath: string;
  gridPosition: [number, number];
}

export interface PanelLayout {
  grid: '1x1' | '1x2' | '2x1' | '2x2';
  sizes: number[];
}

export interface RecoveryDraft {
  path: string;
  lastModified: string;
  preview: string;
}
