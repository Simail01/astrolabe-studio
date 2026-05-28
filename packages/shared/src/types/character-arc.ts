export interface CharacterArcState {
  chapterId: string;
  chapterTitle: string;
  goals: string[];
  relationships: { target: string; relation: string }[];
  mentalState: string;
  abilities: string[];
  summary: string;
  updatedAt: string;
}

export interface CharacterArc {
  entryId: string;
  entryTitle: string;
  states: CharacterArcState[];
  aiSummary: string;
}
