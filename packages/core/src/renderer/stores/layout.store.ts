import { create } from 'zustand';
import type { PanelLayout, SessionTab } from '@astrolabe/shared';

interface LayoutState {
  tabs: SessionTab[];
  activeTab: string | null;
  panelLayout: PanelLayout;
  sidebarVisible: boolean;
  rightPanelVisible: boolean;
  rightPanelMode: 'wiki' | 'fanlib';
  bottomPanelVisible: boolean;
  settingsOpen: boolean;
  openTab: (tab: SessionTab) => void;
  closeTab: (filePath: string) => void;
  setActiveTab: (filePath: string) => void;
  setPanelLayout: (layout: PanelLayout) => void;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  setRightPanelMode: (mode: 'wiki' | 'fanlib') => void;
  toggleBottomPanel: () => void;
  toggleSettings: () => void;
  openSettings: () => void;
  openRightPanel: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  tabs: [],
  activeTab: null,
  panelLayout: { grid: '1x2', sizes: [0.3, 0.7] },
  sidebarVisible: true,
  rightPanelVisible: false,
  rightPanelMode: 'wiki' as const,
  bottomPanelVisible: false,
  settingsOpen: false,

  openTab: (tab) =>
    set((state) => {
      const exists = state.tabs.find((t) => t.filePath === tab.filePath);
      if (exists) return { activeTab: tab.filePath };
      return { tabs: [...state.tabs, tab], activeTab: tab.filePath };
    }),

  closeTab: (filePath) =>
    set((state) => {
      const tabs = state.tabs.filter((t) => t.filePath !== filePath);
      const activeTab =
        state.activeTab === filePath
          ? tabs[tabs.length - 1]?.filePath ?? null
          : state.activeTab;
      return { tabs, activeTab };
    }),

  setActiveTab: (filePath) => set({ activeTab: filePath }),
  setPanelLayout: (panelLayout) => set({ panelLayout }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  toggleRightPanel: () => set((s) => ({ rightPanelVisible: !s.rightPanelVisible })),
  setRightPanelMode: (mode) => set({ rightPanelMode: mode }),
  toggleBottomPanel: () => set((s) => ({ bottomPanelVisible: !s.bottomPanelVisible })),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  openSettings: () => set({ settingsOpen: true }),
  openRightPanel: () => set({ rightPanelVisible: true }),
}));
