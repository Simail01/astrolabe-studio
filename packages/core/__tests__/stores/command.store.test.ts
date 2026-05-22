import { describe, it, expect, beforeEach } from 'vitest';
import { useCommandStore } from '../../src/renderer/stores/command.store';

describe('useCommandStore', () => {
  beforeEach(() => {
    useCommandStore.setState({ commands: [], paletteOpen: false });
  });

  it('registers and retrieves commands', () => {
    useCommandStore.getState().registerCommand({
      id: 'test:hello',
      label: 'Say Hello',
      category: '作品',
      handler: () => {},
    });

    const cmds = useCommandStore.getState().commands;
    expect(cmds).toHaveLength(1);
    expect(cmds[0].id).toBe('test:hello');
  });

  it('does not duplicate commands with same id', () => {
    const cmd = { id: 'test:foo', label: 'Foo', category: '作品' as const, handler: () => {} };
    useCommandStore.getState().registerCommand(cmd);
    useCommandStore.getState().registerCommand(cmd);
    expect(useCommandStore.getState().commands).toHaveLength(1);
  });

  it('unregisters command by id', () => {
    useCommandStore.getState().registerCommand({ id: 'test:bar', label: 'Bar', category: '视图' as const, handler: () => {} });
    useCommandStore.getState().unregisterCommand('test:bar');
    expect(useCommandStore.getState().commands).toHaveLength(0);
  });

  it('toggles palette open state', () => {
    expect(useCommandStore.getState().paletteOpen).toBe(false);
    useCommandStore.getState().togglePalette();
    expect(useCommandStore.getState().paletteOpen).toBe(true);
  });

  it('searches commands by label and category', () => {
    useCommandStore.getState().registerCommand({ id: 'a:new', label: '新建章节', category: '章节', handler: () => {} });
    useCommandStore.getState().registerCommand({ id: 'a:export', label: '导出作品', category: '作品', handler: () => {} });
    useCommandStore.getState().registerCommand({ id: 'a:ai', label: 'AI 续写', category: 'AI', handler: () => {} });

    useCommandStore.getState().setSearch('新建');
    expect(useCommandStore.getState().filteredCommands).toHaveLength(1);

    useCommandStore.getState().setSearch('作品');
    expect(useCommandStore.getState().filteredCommands).toHaveLength(1);

    useCommandStore.getState().setSearch('');
    expect(useCommandStore.getState().filteredCommands).toHaveLength(3);
  });
});
