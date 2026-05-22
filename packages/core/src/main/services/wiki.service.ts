import path from 'path';
import { fileService } from './file.service';
import type { WikiEntry, WikiIndex } from '@astrolabe/shared';
import { randomUUID } from 'crypto';

const INDEX_FILE = 'wiki-index.json';

function getWikiDir(projectPath: string): string {
  return path.join(projectPath, 'wiki');
}

function getTypeDir(projectPath: string, type: string): string {
  return path.join(getWikiDir(projectPath), type);
}

function loadIndex(projectPath: string): WikiIndex {
  const indexPath = path.join(getWikiDir(projectPath), INDEX_FILE);
  if (!fileService.exists(indexPath)) {
    return { entries: [], updatedAt: new Date().toISOString() };
  }
  return JSON.parse(fileService.readFile(indexPath)) as WikiIndex;
}

function saveIndex(projectPath: string, index: WikiIndex): void {
  index.updatedAt = new Date().toISOString();
  fileService.writeFile(
    path.join(getWikiDir(projectPath), INDEX_FILE),
    JSON.stringify(index, null, 2)
  );
}

export const wikiService = {
  saveEntry(projectPath: string, entry: WikiEntry): void {
    const typeDir = getTypeDir(projectPath, entry.type);
    fileService.mkdir(typeDir);

    entry.updatedAt = new Date().toISOString();
    if (!entry.createdAt) entry.createdAt = entry.updatedAt;
    if (!entry.id) entry.id = randomUUID();

    const filePath = path.join(typeDir, `${entry.id}.json`);
    fileService.writeFile(filePath, JSON.stringify(entry, null, 2));

    const index = loadIndex(projectPath);
    const existing = index.entries.findIndex((e) => e.id === entry.id);
    const idxEntry = { id: entry.id, type: entry.type, title: entry.title, aliases: entry.aliases };
    if (existing >= 0) {
      index.entries[existing] = idxEntry;
    } else {
      index.entries.push(idxEntry);
    }
    saveIndex(projectPath, index);
  },

  getEntry(projectPath: string, type: string, id: string): WikiEntry | null {
    const filePath = path.join(getTypeDir(projectPath, type), `${id}.json`);
    if (!fileService.exists(filePath)) return null;
    return JSON.parse(fileService.readFile(filePath)) as WikiEntry;
  },

  listEntries(projectPath: string, type?: string): { id: string; type: string; title: string; aliases: string[] }[] {
    const index = loadIndex(projectPath);
    if (type) return index.entries.filter((e) => e.type === type);
    return index.entries;
  },

  deleteEntry(projectPath: string, type: string, id: string): void {
    const index = loadIndex(projectPath);
    index.entries = index.entries.filter((e) => e.id !== id);
    saveIndex(projectPath, index);
  },

  search(projectPath: string, query: string): WikiEntry[] {
    const q = query.toLowerCase();
    const results: WikiEntry[] = [];
    const index = loadIndex(projectPath);

    for (const idxEntry of index.entries) {
      if (
        idxEntry.title.toLowerCase().includes(q) ||
        idxEntry.aliases.some((a) => a.toLowerCase().includes(q))
      ) {
        const entry = wikiService.getEntry(projectPath, idxEntry.type, idxEntry.id);
        if (entry) results.push(entry);
      }
    }

    return results;
  },

  getRelatedEntries(projectPath: string, entryId: string): WikiEntry[] {
    const index = loadIndex(projectPath);
    const related: WikiEntry[] = [];

    for (const idxEntry of index.entries) {
      const entry = wikiService.getEntry(projectPath, idxEntry.type, idxEntry.id);
      if (!entry) continue;
      if (entry.relations.some((r) => r.targetId === entryId)) {
        related.push(entry);
      }
    }

    return related;
  },
};
