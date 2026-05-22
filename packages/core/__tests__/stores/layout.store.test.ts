import { describe, it, expect, beforeEach } from 'vitest';
import { useLayoutStore } from '../../src/renderer/stores/layout.store';

describe('useLayoutStore', () => {
  beforeEach(() => {
    useLayoutStore.setState({
      tabs: [],
      activeTab: null,
      panelLayout: { grid: '1x2', sizes: [0.3, 0.7] },
      sidebarVisible: true,
      rightPanelVisible: false,
      bottomPanelVisible: false,
    });
  });

  it('opens a tab and sets it active', () => {
    useLayoutStore.getState().openTab({
      projectId: 'p1',
      filePath: 'chapters/ch-001.json',
      gridPosition: [0, 0],
    });

    const { tabs, activeTab } = useLayoutStore.getState();
    expect(tabs).toHaveLength(1);
    expect(activeTab).toBe('chapters/ch-001.json');
  });

  it('does not duplicate existing tabs', () => {
    const tab = { projectId: 'p1', filePath: 'ch-001.json', gridPosition: [0, 0] as [number, number] };
    useLayoutStore.getState().openTab(tab);
    useLayoutStore.getState().openTab(tab);
    expect(useLayoutStore.getState().tabs).toHaveLength(1);
  });

  it('closes tab and shifts active to previous', () => {
    useLayoutStore.getState().openTab({ projectId: 'p1', filePath: 'a.json', gridPosition: [0, 0] });
    useLayoutStore.getState().openTab({ projectId: 'p1', filePath: 'b.json', gridPosition: [0, 0] });
    useLayoutStore.getState().closeTab('b.json');

    const { tabs, activeTab } = useLayoutStore.getState();
    expect(tabs).toHaveLength(1);
    expect(activeTab).toBe('a.json');
  });

  it('closing last tab sets active to null', () => {
    useLayoutStore.getState().openTab({ projectId: 'p1', filePath: 'a.json', gridPosition: [0, 0] });
    useLayoutStore.getState().closeTab('a.json');
    expect(useLayoutStore.getState().activeTab).toBeNull();
  });

  it('toggles panel visibility', () => {
    expect(useLayoutStore.getState().sidebarVisible).toBe(true);
    useLayoutStore.getState().toggleSidebar();
    expect(useLayoutStore.getState().sidebarVisible).toBe(false);
    useLayoutStore.getState().toggleRightPanel();
    expect(useLayoutStore.getState().rightPanelVisible).toBe(true);
  });
});
