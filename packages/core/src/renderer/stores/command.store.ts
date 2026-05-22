import { create } from 'zustand';
import type { Command } from '@astrolabe/shared';

interface CommandState {
  commands: Command[];
  paletteOpen: boolean;
  search: string;
  filteredCommands: Command[];
  registerCommand: (cmd: Command) => void;
  unregisterCommand: (id: string) => void;
  togglePalette: () => void;
  setSearch: (search: string) => void;
  executeCommand: (id: string) => void;
}

export const useCommandStore = create<CommandState>((set, get) => ({
  commands: [],
  paletteOpen: false,
  search: '',
  filteredCommands: [],

  registerCommand: (cmd) =>
    set((state) => {
      if (state.commands.find((c) => c.id === cmd.id)) return state;
      return { commands: [...state.commands, cmd] };
    }),

  unregisterCommand: (id) =>
    set((state) => ({ commands: state.commands.filter((c) => c.id !== id) })),

  togglePalette: () =>
    set((state) => ({ paletteOpen: !state.paletteOpen, search: '' })),

  setSearch: (search) =>
    set((state) => {
      const q = search.toLowerCase();
      return {
        search,
        filteredCommands: state.commands.filter(
          (c) =>
            c.label.toLowerCase().includes(q) ||
            c.category.toLowerCase().includes(q) ||
            c.id.toLowerCase().includes(q)
        ),
      };
    }),

  executeCommand: (id) => {
    const cmd = get().commands.find((c) => c.id === id);
    if (cmd && (!cmd.enabled || cmd.enabled())) {
      cmd.handler();
    }
    set({ paletteOpen: false, search: '' });
  },
}));
