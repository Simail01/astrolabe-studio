export type WikiEntryType = 'person' | 'location' | 'faction' | 'item' | 'event' | 'rule';

export interface WikiEntry {
  id: string;
  type: WikiEntryType;
  title: string;
  aliases: string[];
  summary: string;
  content: string;
  attributes: Record<string, string | string[]>;
  relations: WikiRelation[];
  sourceChapters: string[];
  confidence: number;
  createdAt: string;
  updatedAt: string;
  confirmedByUser: boolean;
}

export interface WikiRelation {
  targetId: string;
  relationType: string;
  description: string;
}

export interface WikiIndex {
  entries: { id: string; type: WikiEntryType; title: string; aliases: string[] }[];
  updatedAt: string;
}

export interface WikiSuggestion {
  type: WikiEntryType;
  title: string;
  summary: string;
  content: string;
  attributes: Record<string, string | string[]>;
  confidence: number;
  evidence: string;
}
