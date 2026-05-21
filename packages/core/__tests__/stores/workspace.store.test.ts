import { describe, it, expect } from 'vitest';
import { useWorkspaceStore } from '../../src/renderer/stores/workspace.store';

describe('useWorkspaceStore', () => {
  it('starts with no workspace set', () => {
    const { workspace } = useWorkspaceStore.getState();
    expect(workspace).toBeNull();
  });

  it('can set and clear workspace', () => {
    useWorkspaceStore.getState().setWorkspace({
      id: 'ws-1',
      name: 'Test',
      path: '/test',
      projects: [],
      fanlibPath: '/test/fanlib',
    });

    expect(useWorkspaceStore.getState().workspace?.name).toBe('Test');

    useWorkspaceStore.getState().setWorkspace(null);
    expect(useWorkspaceStore.getState().workspace).toBeNull();
  });
});
