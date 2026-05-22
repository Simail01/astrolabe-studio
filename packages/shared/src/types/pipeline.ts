export interface Storyboard {
  id: string;
  chapterId: string;
  shots: Shot[];
  createdAt: string;
  updatedAt: string;
}

export interface Shot {
  id: string;
  order: number;
  scene: string;
  framing: 'extreme-long' | 'long' | 'medium' | 'close-up' | 'extreme-close-up';
  angle: 'eye-level' | 'high-angle' | 'low-angle' | 'bird-eye' | 'dutch';
  characters: ShotCharacter[];
  dialogue: ShotDialogue[];
  props: string[];
  mood: string;
  notes: string;
}

export interface ShotCharacter {
  characterId: string;
  pose: string;
  expression: string;
  designVersion: number;
}

export interface ShotDialogue {
  speakerId: string;
  text: string;
  type: 'speech' | 'thought' | 'narration';
}

export type PipelineStage = 'outline' | 'characters' | 'chapters' | 'storyboard' | 'comic' | 'video';

export interface PipelineState {
  projectId: string;
  currentStage: PipelineStage;
  stages: Record<PipelineStage, { status: 'pending' | 'in-progress' | 'done'; updatedAt: string }>;
}
