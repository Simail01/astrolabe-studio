import { create } from 'zustand';
import type { CharacterArc, CharacterArcState } from '@astrolabe/shared';

interface ArcState {
  arcs: Map<string, CharacterArc>;
  selectedEntryId: string | null;
  loading: boolean;
  summarizing: boolean;
  setArc: (arc: CharacterArc) => void;
  removeArc: (entryId: string) => void;
  selectEntry: (entryId: string | null) => void;
  getArc: (entryId: string) => CharacterArc | undefined;
  setLoading: (loading: boolean) => void;
  setSummarizing: (summarizing: boolean) => void;
}

export const useArcStore = create<ArcState>((set, get) => ({
  arcs: new Map(),
  selectedEntryId: null,
  loading: false,
  summarizing: false,

  setArc: (arc) =>
    set((state) => {
      const arcs = new Map(state.arcs);
      arcs.set(arc.entryId, arc);
      return { arcs };
    }),

  removeArc: (entryId) =>
    set((state) => {
      const arcs = new Map(state.arcs);
      arcs.delete(entryId);
      return {
        arcs,
        selectedEntryId: state.selectedEntryId === entryId ? null : state.selectedEntryId,
      };
    }),

  selectEntry: (entryId) => set({ selectedEntryId: entryId }),

  getArc: (entryId) => get().arcs.get(entryId),

  setLoading: (loading) => set({ loading }),
  setSummarizing: (summarizing) => set({ summarizing }),
}));
