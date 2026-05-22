import { describe, it, expect, beforeEach } from 'vitest';
import { usePipelineStore } from '../../src/renderer/stores/pipeline.store';

describe('usePipelineStore', () => {
  beforeEach(() => {
    usePipelineStore.setState({
      currentStage: 'outline',
      stages: {
        outline: { status: 'pending', updatedAt: '' },
        characters: { status: 'pending', updatedAt: '' },
        chapters: { status: 'pending', updatedAt: '' },
        storyboard: { status: 'pending', updatedAt: '' },
        comic: { status: 'pending', updatedAt: '' },
        video: { status: 'pending', updatedAt: '' },
      },
    });
  });

  it('starts at outline stage', () => {
    expect(usePipelineStore.getState().currentStage).toBe('outline');
  });

  it('sets current stage', () => {
    usePipelineStore.getState().setCurrentStage('chapters');
    expect(usePipelineStore.getState().currentStage).toBe('chapters');
  });

  it('marks a stage as done', () => {
    usePipelineStore.getState().markStageDone('outline');
    expect(usePipelineStore.getState().stages.outline.status).toBe('done');
  });

  it('gets next stage', () => {
    usePipelineStore.getState().markStageDone('outline');
    usePipelineStore.getState().markStageDone('characters');
    expect(usePipelineStore.getState().currentStage).toBe('outline'); // not auto-advancing
  });
});
