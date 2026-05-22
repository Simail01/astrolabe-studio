import { describe, it, expect, beforeEach } from 'vitest';
import { useWikiStore } from '../../src/renderer/stores/wiki.store';

describe('useWikiStore', () => {
  beforeEach(() => {
    useWikiStore.setState({ entries: [], selectedEntryId: null, searchQuery: '', filteredEntries: [] });
  });

  it('starts with empty entries', () => {
    expect(useWikiStore.getState().entries).toHaveLength(0);
    expect(useWikiStore.getState().selectedEntryId).toBeNull();
  });

  it('sets entries and selects one', () => {
    const entries = [
      { id: 'w1', type: 'person' as const, title: '诸葛亮', aliases: [], summary: '', content: '', attributes: {}, relations: [], sourceChapters: [], confidence: 1, createdAt: '', updatedAt: '', confirmedByUser: true },
      { id: 'w2', type: 'person' as const, title: '曹操', aliases: [], summary: '', content: '', attributes: {}, relations: [], sourceChapters: [], confidence: 0.8, createdAt: '', updatedAt: '', confirmedByUser: false },
    ];
    useWikiStore.getState().setEntries(entries);
    expect(useWikiStore.getState().entries).toHaveLength(2);

    useWikiStore.getState().selectEntry('w1');
    expect(useWikiStore.getState().selectedEntryId).toBe('w1');
  });

  it('adds or updates an entry', () => {
    const entry = { id: 'w1', type: 'person' as const, title: '诸葛亮', aliases: [], summary: '', content: '', attributes: {}, relations: [], sourceChapters: [], confidence: 1, createdAt: '', updatedAt: '', confirmedByUser: true };
    useWikiStore.getState().addOrUpdateEntry(entry);
    expect(useWikiStore.getState().entries).toHaveLength(1);

    const updated = { ...entry, title: '孔明' };
    useWikiStore.getState().addOrUpdateEntry(updated);
    expect(useWikiStore.getState().entries).toHaveLength(1);
    expect(useWikiStore.getState().entries[0].title).toBe('孔明');
  });

  it('removes entry and clears selection if selected', () => {
    const entry = { id: 'w1', type: 'person' as const, title: '诸葛亮', aliases: [], summary: '', content: '', attributes: {}, relations: [], sourceChapters: [], confidence: 1, createdAt: '', updatedAt: '', confirmedByUser: true };
    useWikiStore.getState().addOrUpdateEntry(entry);
    useWikiStore.getState().selectEntry('w1');
    useWikiStore.getState().removeEntry('w1');
    expect(useWikiStore.getState().entries).toHaveLength(0);
    expect(useWikiStore.getState().selectedEntryId).toBeNull();
  });

  it('filters entries by search query', () => {
    const entries = [
      { id: 'w1', type: 'person' as const, title: '诸葛亮', aliases: ['孔明'], summary: '蜀汉丞相', content: '', attributes: {}, relations: [], sourceChapters: [], confidence: 1, createdAt: '', updatedAt: '', confirmedByUser: true },
      { id: 'w2', type: 'person' as const, title: '曹操', aliases: [], summary: '魏王', content: '', attributes: {}, relations: [], sourceChapters: [], confidence: 1, createdAt: '', updatedAt: '', confirmedByUser: true },
    ];
    useWikiStore.getState().setEntries(entries);

    useWikiStore.getState().setSearchQuery('孔明');
    expect(useWikiStore.getState().filteredEntries).toHaveLength(1);

    useWikiStore.getState().setSearchQuery('魏');
    expect(useWikiStore.getState().filteredEntries).toHaveLength(1);

    useWikiStore.getState().setSearchQuery('');
    expect(useWikiStore.getState().filteredEntries).toHaveLength(2);
  });

  it('manages suggestion queue', () => {
    const suggestions = [
      { type: 'person' as const, title: '诸葛亮', summary: '', content: '', attributes: {}, confidence: 0.95, evidence: '...' },
      { type: 'location' as const, title: '卧龙岗', summary: '', content: '', attributes: {}, confidence: 0.9, evidence: '...' },
    ];
    useWikiStore.getState().setSuggestions(suggestions);
    expect(useWikiStore.getState().suggestions).toHaveLength(2);
    expect(useWikiStore.getState().suggestions[0].status).toBe('pending');

    useWikiStore.getState().confirmSuggestion(0);
    expect(useWikiStore.getState().suggestions[0].status).toBe('confirmed');

    useWikiStore.getState().rejectSuggestion(1);
    expect(useWikiStore.getState().suggestions[1].status).toBe('rejected');

    useWikiStore.getState().clearSuggestions();
    expect(useWikiStore.getState().suggestions).toHaveLength(0);
  });
});
