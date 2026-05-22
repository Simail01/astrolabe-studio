import { describe, it, expect, beforeEach } from 'vitest';
import { useFanlibStore } from '../../src/renderer/stores/fanlib.store';

describe('useFanlibStore', () => {
  beforeEach(() => {
    useFanlibStore.setState({ cards: [], selectedCardId: null, searchQuery: '', filteredCards: [], importDialogOpen: false, importCardId: null });
  });

  it('starts empty', () => {
    expect(useFanlibStore.getState().cards).toHaveLength(0);
  });

  it('sets cards and selects one', () => {
    const cards = [
      { id: 'c1', type: 'character' as const, name: '吕布', aliases: [], tags: [], source: { type: 'novel' as const, title: '' }, createdAt: '', updatedAt: '', appearance: '', personality: '', abilities: [], background: '', relationships: [], designImages: [] },
    ];
    useFanlibStore.getState().setCards(cards);
    useFanlibStore.getState().selectCard('c1');
    expect(useFanlibStore.getState().selectedCardId).toBe('c1');
  });

  it('filters cards by search query', () => {
    const cards = [
      { id: 'c1', type: 'character' as const, name: '吕布', aliases: [], tags: ['武将'], source: { type: 'novel' as const, title: '' }, createdAt: '', updatedAt: '', appearance: '', personality: '', abilities: [], background: '', relationships: [], designImages: [] },
      { id: 'c2', type: 'character' as const, name: '赵云', aliases: [], tags: ['武将'], source: { type: 'novel' as const, title: '' }, createdAt: '', updatedAt: '', appearance: '', personality: '', abilities: [], background: '', relationships: [], designImages: [] },
    ];
    useFanlibStore.getState().setCards(cards);
    useFanlibStore.getState().setSearchQuery('吕布');
    expect(useFanlibStore.getState().filteredCards).toHaveLength(1);
  });

  it('opens and closes import dialog', () => {
    expect(useFanlibStore.getState().importDialogOpen).toBe(false);
    useFanlibStore.getState().openImportDialog('c1');
    expect(useFanlibStore.getState().importDialogOpen).toBe(true);
    expect(useFanlibStore.getState().importCardId).toBe('c1');
    useFanlibStore.getState().closeImportDialog();
    expect(useFanlibStore.getState().importDialogOpen).toBe(false);
  });
});
