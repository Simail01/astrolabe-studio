import { create } from 'zustand';
import type { CharacterDesign, CharacterDesignConfig } from '@astrolabe/shared';

interface DesignState {
  currentDesign: CharacterDesign | null;
  hasDesign: boolean;
  designSource: CharacterDesignConfig['source'] | null;
  isGenerating: boolean;
  setDesign: (design: CharacterDesign) => void;
  clearDesign: () => void;
  setDesignSource: (source: CharacterDesignConfig['source']) => void;
  setGenerating: (generating: boolean) => void;
}

export const useDesignStore = create<DesignState>((set) => ({
  currentDesign: null,
  hasDesign: false,
  designSource: null,
  isGenerating: false,

  setDesign: (design) => set({ currentDesign: design, hasDesign: true }),
  clearDesign: () => set({ currentDesign: null, hasDesign: false }),
  setDesignSource: (source) => set({ designSource: source }),
  setGenerating: (generating) => set({ isGenerating: generating }),
}));
