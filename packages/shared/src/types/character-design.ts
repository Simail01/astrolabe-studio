export interface CharacterDesign {
  id: string;
  characterId: string;
  version: number;
  baseImage: string;
  thumbnail: string;
  expressions: Expression[];
  poses: Pose[];
  promptUsed: string;
  seed?: number;
  createdAt: string;
  confirmed: boolean;
}

export interface Expression {
  type: 'neutral' | 'happy' | 'angry' | 'sad' | 'surprised';
  image: string;
}

export interface Pose {
  type: 'front' | 'side' | 'action' | 'casual';
  image: string;
}

export interface CharacterDesignConfig {
  characterId: string;
  source: 'ai-generated' | 'user-upload' | 'fanlib-card';
  fanlibCardId?: string;
  fanlibDesignBorrowed?: boolean;
  hasDesign: boolean;
  lastUpdated: string;
}
