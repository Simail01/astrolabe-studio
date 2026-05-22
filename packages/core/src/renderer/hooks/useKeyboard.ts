import { useEffect } from 'react';
import { useCommandStore } from '../stores/command.store';

export function useKeyboard(): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        useCommandStore.getState().togglePalette();
        return;
      }

      const store = useCommandStore.getState();
      for (const cmd of store.commands) {
        if (!cmd.keybinding) continue;
        const parts = cmd.keybinding.split('+');
        const mods = parts.filter((p) => p === 'Ctrl' || p === 'Shift' || p === 'Alt');
        const key = parts[parts.length - 1];
        const modMatch =
          mods.includes('Ctrl') === mod &&
          mods.includes('Shift') === e.shiftKey &&
          mods.includes('Alt') === e.altKey;
        if (modMatch && key.toLowerCase() === e.key.toLowerCase()) {
          e.preventDefault();
          store.executeCommand(cmd.id);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
