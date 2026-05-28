import { create } from 'zustand';
import type { WikiEntry, WikiSuggestion } from '@astrolabe/shared';

export interface SuggestionItem extends WikiSuggestion {
  id: string;
  status: 'pending' | 'confirmed' | 'rejected';
}

export interface EnrichResult {
  field: string;
  currentValue: string;
  newValue: string;
  action: 'append' | 'overwrite' | 'add';
  evidence: string;
  sourceChapter: string;
}

export interface ConsistencyResult {
  entryTitle: string;
  field: string;
  chapterA: string;
  valueA: string;
  chapterB: string;
  valueB: string;
  severity: 'critical' | 'warning' | 'info';
  suggestion: string;
}

export interface RelationResult {
  sourceTitle: string;
  targetTitle: string;
  relationType: string;
  confidence: number;
  evidence: string;
  sourceChapter: string;
}

interface WikiState {
  entries: WikiEntry[];
  selectedEntryId: string | null;
  searchQuery: string;
  filteredEntries: WikiEntry[];
  suggestions: SuggestionItem[];
  enrichResults: EnrichResult[];
  consistencyResults: ConsistencyResult[];
  relationResults: RelationResult[];
  enrichLoading: boolean;
  consistencyLoading: boolean;
  relationsLoading: boolean;
  setEntries: (entries: WikiEntry[]) => void;
  addOrUpdateEntry: (entry: WikiEntry) => void;
  removeEntry: (id: string) => void;
  selectEntry: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSuggestions: (items: WikiSuggestion[]) => void;
  confirmSuggestion: (index: number) => void;
  rejectSuggestion: (index: number) => void;
  clearSuggestions: () => void;
  setEnrichResults: (results: EnrichResult[]) => void;
  setConsistencyResults: (results: ConsistencyResult[]) => void;
  setRelationResults: (results: RelationResult[]) => void;
  setEnrichLoading: (loading: boolean) => void;
  setConsistencyLoading: (loading: boolean) => void;
  setRelationsLoading: (loading: boolean) => void;
  clearEnrichResults: () => void;
  clearConsistencyResults: () => void;
  clearRelationResults: () => void;
}

export const useWikiStore = create<WikiState>((set) => ({
  entries: [],
  selectedEntryId: null,
  searchQuery: '',
  filteredEntries: [],
  suggestions: [],
  enrichResults: [],
  consistencyResults: [],
  relationResults: [],
  enrichLoading: false,
  consistencyLoading: false,
  relationsLoading: false,

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
            ).slice(0, 200)
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

  setEnrichResults: (results) => set({ enrichResults: results }),
  setConsistencyResults: (results) => set({ consistencyResults: results }),
  setRelationResults: (results) => set({ relationResults: results }),
  setEnrichLoading: (loading) => set({ enrichLoading: loading }),
  setConsistencyLoading: (loading) => set({ consistencyLoading: loading }),
  setRelationsLoading: (loading) => set({ relationsLoading: loading }),
  clearEnrichResults: () => set({ enrichResults: [] }),
  clearConsistencyResults: () => set({ consistencyResults: [] }),
  clearRelationResults: () => set({ relationResults: [] }),
}));
