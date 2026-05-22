import type { Command } from '@astrolabe/shared';
import { useLayoutStore } from '../stores/layout.store';
import { useCommandStore } from '../stores/command.store';

export function registerDefaultCommands(): void {
  const store = useCommandStore.getState();

  const defaults: Command[] = [
    {
      id: 'astro:view:toggleSidebar',
      label: '切换侧边栏',
      category: '视图',
      keybinding: 'Ctrl+B',
      handler: () => useLayoutStore.getState().toggleSidebar(),
    },
    {
      id: 'astro:view:toggleBottomPanel',
      label: '切换底部面板',
      category: '视图',
      keybinding: 'Ctrl+J',
      handler: () => useLayoutStore.getState().toggleBottomPanel(),
    },
    {
      id: 'astro:view:toggleRightPanel',
      label: '切换右侧面板',
      category: '视图',
      handler: () => useLayoutStore.getState().toggleRightPanel(),
    },
    {
      id: 'astro:view:commandPalette',
      label: '命令面板',
      category: '视图',
      keybinding: 'Ctrl+Shift+P',
      handler: () => useCommandStore.getState().togglePalette(),
    },
  ];

  for (const cmd of defaults) {
    store.registerCommand(cmd);
  }
}
