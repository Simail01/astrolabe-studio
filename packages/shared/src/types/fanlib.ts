export type FanlibCardType = 'character' | 'worldview' | 'item' | 'event';

export interface CardSource {
  type: 'anime' | 'movie' | 'novel' | 'comic' | 'game' | 'real_person' | 'real_world' | 'original';
  title: string;
  url?: string;
  note?: string;
}

export interface CardMeta {
  id: string;
  type: FanlibCardType;
  name: string;
  aliases: string[];
  avatar?: string;
  tags: string[];
  source: CardSource;
  createdAt: string;
  updatedAt: string;
}

export interface CardRelation {
  targetId: string;
  relationType: string;
  description: string;
}

export interface CharacterCard extends CardMeta {
  type: 'character';
  appearance: string;
  personality: string;
  abilities: string[];
  background: string;
  relationships: CardRelation[];
  designImages: string[];
}

export interface WorldviewCard extends CardMeta {
  type: 'worldview';
  rules: string[];
  history: string;
  geography: string;
  factions: string[];
  powerSystem: string;
}

export interface ItemCard extends CardMeta {
  type: 'item';
  category: string;
  appearance: string;
  abilities: string[];
  origin: string;
  limitations: string;
}

export interface EventCard extends CardMeta {
  type: 'event';
  participants: string[];
  cause: string;
  process: string;
  result: string;
  narrativePattern: string;
}

export type FanlibCard = CharacterCard | WorldviewCard | ItemCard | EventCard;

export interface FanlibImport {
  id: string;
  sourceCardId: string;
  sourceCardVersion: string;
  importedAt: string;
  targetEntityId: string;
  overrides: {
    name?: string;
    appearance?: string;
    personality?: string;
    abilities?: string[];
    background?: string;
  };
  addons: {
    newAbilities: string[];
    newRelationships: string[];
  };
}

export interface FanlibIndex {
  cards: { id: string; type: FanlibCardType; name: string; tags: string[] }[];
  updatedAt: string;
}
