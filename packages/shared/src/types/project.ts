export interface AstrolabeConfig {
  version: 1;
  id: string;
  title: string;
  cover: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  settings: ProjectSettings;
}

export interface ProjectSettings {
  language: string;
  autoSaveInterval: number;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: string;
  name: string;
  avatar: string;
  description: string;
  traits: string[];
  designImage?: string;
  source: 'original' | 'fanlib';
  sourceCardId?: string;
}

export interface Outline {
  id: string;
  nodes: OutlineNode[];
}

export interface OutlineNode {
  id: string;
  title: string;
  summary: string;
  children: OutlineNode[];
}

export type ExportFormat = 'epub' | 'pdf' | 'txt';
export type ComicExportFormat = 'png' | 'pdf' | 'video';
export type CardExportFormat = 'json' | 'markdown' | 'image';
