export interface TimelineEvent {
  id: string;
  chapterId: string;
  chapterTitle: string;
  title: string;
  description: string;
  type: 'plot' | 'character' | 'world' | 'foreshadow';
  relatedEntries: string[];
  order: number;
}

export interface TimelineData {
  events: TimelineEvent[];
  updatedAt: string;
}
