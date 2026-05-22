import { describe, it, expect, beforeEach } from 'vitest';
import { useDesignStore } from '../../src/renderer/stores/design.store';

describe('useDesignStore', () => {
  beforeEach(() => {
    useDesignStore.setState({
      currentDesign: null, hasDesign: false, designSource: null, isGenerating: false,
    });
  });

  it('starts with no design', () => {
    expect(useDesignStore.getState().currentDesign).toBeNull();
    expect(useDesignStore.getState().hasDesign).toBe(false);
  });

  it('sets a design', () => {
    const design = {
      id: 'd1', characterId: 'char-1', version: 1, baseImage: '/path/img.png',
      thumbnail: '/path/thumb.png', expressions: [], poses: [],
      promptUsed: 'character design', createdAt: '', confirmed: true,
    };
    useDesignStore.getState().setDesign(design);
    expect(useDesignStore.getState().currentDesign?.version).toBe(1);
    expect(useDesignStore.getState().hasDesign).toBe(true);
  });

  it('sets design source', () => {
    useDesignStore.getState().setDesignSource('ai-generated');
    expect(useDesignStore.getState().designSource).toBe('ai-generated');
  });

  it('toggles generating state', () => {
    expect(useDesignStore.getState().isGenerating).toBe(false);
    useDesignStore.getState().setGenerating(true);
    expect(useDesignStore.getState().isGenerating).toBe(true);
  });

  it('clears design', () => {
    const design = { id: 'd1', characterId: 'char-1', version: 1, baseImage: '', thumbnail: '', expressions: [], poses: [], promptUsed: '', createdAt: '', confirmed: false };
    useDesignStore.getState().setDesign(design);
    useDesignStore.getState().clearDesign();
    expect(useDesignStore.getState().currentDesign).toBeNull();
    expect(useDesignStore.getState().hasDesign).toBe(false);
  });
});
