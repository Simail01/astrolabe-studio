import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { AstrolabeConfig } from '@astrolabe/shared';

const CONFIG_FILE = 'astrolabe.json';

export const projectService = {
  readProject(projectPath: string): AstrolabeConfig {
    const configPath = path.join(projectPath, CONFIG_FILE);
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as AstrolabeConfig;
  },

  createProject(projectPath: string, name: string): AstrolabeConfig {
    const now = new Date().toISOString();
    const config: AstrolabeConfig = {
      version: 1,
      id: randomUUID(),
      title: name,
      cover: '',
      createdAt: now,
      updatedAt: now,
      tags: [],
      settings: {
        language: 'zh-CN',
        autoSaveInterval: 300,
      },
    };

    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'chapters'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'characters'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'outlines'), { recursive: true });

    const configPath = path.join(projectPath, CONFIG_FILE);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    return config;
  },

  deleteProject(projectPath: string): void {
    fs.rmSync(projectPath, { recursive: true, force: true });
  },
};
