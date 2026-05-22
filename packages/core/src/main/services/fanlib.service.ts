import path from 'path';
import { fileService } from './file.service';
import type { FanlibCard, FanlibIndex } from '@astrolabe/shared';
import { randomUUID } from 'crypto';

const INDEX_FILE = 'fanlib-index.json';

function getFanlibDir(workspacePath: string): string {
  return path.join(workspacePath, 'fanlib');
}

function getTypeDir(workspacePath: string, type: string): string {
  return path.join(getFanlibDir(workspacePath), type);
}

function loadIndex(workspacePath: string): FanlibIndex {
  const indexPath = path.join(getFanlibDir(workspacePath), INDEX_FILE);
  if (!fileService.exists(indexPath)) {
    return { cards: [], updatedAt: new Date().toISOString() };
  }
  return JSON.parse(fileService.readFile(indexPath)) as FanlibIndex;
}

function saveIndex(workspacePath: string, index: FanlibIndex): void {
  index.updatedAt = new Date().toISOString();
  fileService.writeFile(
    path.join(getFanlibDir(workspacePath), INDEX_FILE),
    JSON.stringify(index, null, 2)
  );
}

export const fanlibService = {
  saveCard(workspacePath: string, card: FanlibCard): void {
    const typeDir = getTypeDir(workspacePath, card.type);
    fileService.mkdir(typeDir);

    card.updatedAt = new Date().toISOString();
    if (!card.createdAt) card.createdAt = card.updatedAt;
    if (!card.id) card.id = randomUUID();

    const filePath = path.join(typeDir, `${card.id}.json`);
    fileService.writeFile(filePath, JSON.stringify(card, null, 2));

    const index = loadIndex(workspacePath);
    const existing = index.cards.findIndex((c) => c.id === card.id);
    const idxEntry = { id: card.id, type: card.type, name: card.name, tags: card.tags };
    if (existing >= 0) {
      index.cards[existing] = idxEntry;
    } else {
      index.cards.push(idxEntry);
    }
    saveIndex(workspacePath, index);
  },

  getCard(workspacePath: string, type: string, id: string): FanlibCard | null {
    const filePath = path.join(getTypeDir(workspacePath, type), `${id}.json`);
    if (!fileService.exists(filePath)) return null;
    return JSON.parse(fileService.readFile(filePath)) as FanlibCard;
  },

  listCards(workspacePath: string, type?: string): { id: string; type: string; name: string; tags: string[] }[] {
    const index = loadIndex(workspacePath);
    if (type) return index.cards.filter((c) => c.type === type);
    return index.cards;
  },

  deleteCard(workspacePath: string, type: string, id: string): void {
    const index = loadIndex(workspacePath);
    index.cards = index.cards.filter((c) => c.id !== id);
    saveIndex(workspacePath, index);
  },

  search(workspacePath: string, query: string): FanlibCard[] {
    const q = query.toLowerCase();
    const results: FanlibCard[] = [];
    const index = loadIndex(workspacePath);

    for (const idxCard of index.cards) {
      if (
        idxCard.name.toLowerCase().includes(q) ||
        idxCard.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        const card = fanlibService.getCard(workspacePath, idxCard.type, idxCard.id);
        if (card) results.push(card);
      }
    }

    return results;
  },
};
