import { create } from 'zustand';
import type { FanlibCard } from '@astrolabe/shared';

interface FanlibState {
  cards: FanlibCard[];
  selectedCardId: string | null;
  searchQuery: string;
  filteredCards: FanlibCard[];
  importDialogOpen: boolean;
  importCardId: string | null;
  setCards: (cards: FanlibCard[]) => void;
  addOrUpdateCard: (card: FanlibCard) => void;
  removeCard: (id: string) => void;
  selectCard: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  openImportDialog: (cardId: string) => void;
  closeImportDialog: () => void;
}

export const useFanlibStore = create<FanlibState>((set) => ({
  cards: [],
  selectedCardId: null,
  searchQuery: '',
  filteredCards: [],
  importDialogOpen: false,
  importCardId: null,

  setCards: (cards) => set({ cards, filteredCards: cards }),

  addOrUpdateCard: (card) =>
    set((state) => {
      const idx = state.cards.findIndex((c) => c.id === card.id);
      const cards = idx >= 0
        ? [...state.cards.slice(0, idx), card, ...state.cards.slice(idx + 1)]
        : [...state.cards, card];
      return { cards, filteredCards: cards };
    }),

  removeCard: (id) =>
    set((state) => {
      const cards = state.cards.filter((c) => c.id !== id);
      return { cards, filteredCards: cards, selectedCardId: state.selectedCardId === id ? null : state.selectedCardId };
    }),

  selectCard: (id) => set({ selectedCardId: id }),

  setSearchQuery: (query) =>
    set((state) => {
      const q = query.toLowerCase();
      return {
        searchQuery: query,
        filteredCards: q
          ? state.cards.filter((c) =>
              c.name.toLowerCase().includes(q) ||
              c.tags.some((t) => t.toLowerCase().includes(q))
            )
          : state.cards,
      };
    }),

  openImportDialog: (cardId) => set({ importDialogOpen: true, importCardId: cardId }),
  closeImportDialog: () => set({ importDialogOpen: false, importCardId: null }),
}));
