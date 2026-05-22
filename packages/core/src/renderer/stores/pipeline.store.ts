import { create } from 'zustand';
import type { PipelineStage } from '@astrolabe/shared';

interface StageInfo { status: 'pending' | 'in-progress' | 'done'; updatedAt: string; }

interface PipelineStoreState {
  currentStage: PipelineStage;
  stages: Record<PipelineStage, StageInfo>;
  setCurrentStage: (stage: PipelineStage) => void;
  markStageDone: (stage: PipelineStage) => void;
  markStageInProgress: (stage: PipelineStage) => void;
}

const defaultStages: Record<PipelineStage, StageInfo> = {
  outline: { status: 'pending', updatedAt: '' },
  characters: { status: 'pending', updatedAt: '' },
  chapters: { status: 'pending', updatedAt: '' },
  storyboard: { status: 'pending', updatedAt: '' },
  comic: { status: 'pending', updatedAt: '' },
  video: { status: 'pending', updatedAt: '' },
};

export const usePipelineStore = create<PipelineStoreState>((set) => ({
  currentStage: 'outline',
  stages: { ...defaultStages },

  setCurrentStage: (stage) => set({ currentStage: stage }),

  markStageDone: (stage) =>
    set((state) => ({
      stages: {
        ...state.stages,
        [stage]: { status: 'done', updatedAt: new Date().toISOString() },
      },
    })),

  markStageInProgress: (stage) =>
    set((state) => ({
      stages: {
        ...state.stages,
        [stage]: { status: 'in-progress', updatedAt: new Date().toISOString() },
      },
    })),
}));
