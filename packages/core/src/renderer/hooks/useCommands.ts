import { useEffect } from 'react';
import { useCommandStore } from '../stores/command.store';
import type { Command } from '@astrolabe/shared';

export function useCommands(commands: Command[]): void {
  useEffect(() => {
    for (const cmd of commands) {
      useCommandStore.getState().registerCommand(cmd);
    }
    return () => {
      for (const cmd of commands) {
        useCommandStore.getState().unregisterCommand(cmd.id);
      }
    };
  }, [commands]);
}
