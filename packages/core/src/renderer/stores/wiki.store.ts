import { create } from 'zustand';
import type { WikiEntry, WikiSuggestion } from '@astrolabe/shared';

export interface SuggestionItem extends WikiSuggestion {
  id: string;
  status: 'pending' | 'confirmed' | 'rejected';
}

interface WikiState {
  entries: WikiEntry[];
  selectedEntryId: string | null;
  searchQuery: string;
  filteredEntries: WikiEntry[];
  suggestions: SuggestionItem[];
  setEntries: (entries: WikiEntry[]) => void;
  addOrUpdateEntry: (entry: WikiEntry) => void;
  removeEntry: (id: string) => void;
  selectEntry: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSuggestions: (items: WikiSuggestion[]) => void;
  confirmSuggestion: (index: number) => void;
  rejectSuggestion: (index: number) => void;
  clearSuggestions: () => void;
}

export const useWikiStore = create<WikiState>((set) => ({
  entries: [],
  selectedEntryId: null,
  searchQuery: '',
  filteredEntries: [],
  suggestions: [],

  setEntries: (entries) => set({ entries, filteredEntries: entries }),

  addOrUpdateEntry: (entry) =>
    set((state) => {
      const idx = state.entries.findIndex((e) => e.id === entry.id);
      const entries = idx >= 0
        ? [...state.entries.slice(0, idx), entry, ...state.entries.slice(idx + 1)]
        : [...state.entries, entry];
      return { entries, filteredEntries: entries };
    }),

  removeEntry: (id) =>
    set((state) => {
      const entries = state.entries.filter((e) => e.id !== id);
      return {
        entries,
        filteredEntries: entries,
        selectedEntryId: state.selectedEntryId === id ? null : state.selectedEntryId,
      };
    }),

  selectEntry: (id) => set({ selectedEntryId: id }),

  setSearchQuery: (query) =>
    set((state) => {
      const q = query.toLowerCase();
      return {
        searchQuery: query,
        filteredEntries: q
          ? state.entries.filter(
              (e) =>
                e.title.toLowerCase().includes(q) ||
                e.aliases.some((a) => a.toLowerCase().includes(q)) ||
                e.summary.toLowerCase().includes(q)
            )
          : state.entries,
      };
    }),

  setSuggestions: (items) =>
    set({ suggestions: items.map((s, i) => ({ ...s, id: `sug-${Date.now()}-${i}`, status: 'pending' as const })) }),

  confirmSuggestion: (index) =>
    set((state) => {
      const suggestions = [...state.suggestions];
      if (suggestions[index]) suggestions[index] = { ...suggestions[index], status: 'confirmed' as const };
      return { suggestions };
    }),

  rejectSuggestion: (index) =>
    set((state) => {
      const suggestions = [...state.suggestions];
      if (suggestions[index]) suggestions[index] = { ...suggestions[index], status: 'rejected' as const };
      return { suggestions };
    }),

  clearSuggestions: () => set({ suggestions: [] }),
}));
