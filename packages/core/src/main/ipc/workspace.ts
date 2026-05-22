import { ipcMain } from 'electron';
import { fileService } from '../services/file.service';
import { sessionService } from '../services/session.service';
import path from 'path';
import type { Workspace } from '@astrolabe/shared';
import { randomUUID } from 'crypto';

const WORKSPACE_CONFIG = 'astrolabe-workspace.json';
const PROJECT_CONFIG = 'astrolabe.json';

export function registerWorkspaceHandlers(): void {
  ipcMain.handle('workspace:open', async (_event, folderPath: string) => {
    const configPath = path.join(folderPath, WORKSPACE_CONFIG);

    let workspace: Workspace;
    if (fileService.exists(configPath)) {
      workspace = JSON.parse(fileService.readFile(configPath));
    } else {
      workspace = {
        id: randomUUID(),
        name: path.basename(folderPath),
        path: folderPath,
        projects: [],
        fanlibPath: path.join(folderPath, 'fanlib'),
      };
      fileService.writeFile(configPath, JSON.stringify(workspace, null, 2));
      // Create fanlib directory
      fileService.mkdir(path.join(folderPath, 'fanlib'));
    }

    // Scan for existing projects — check astrolabe.json OR outline/ directory
    const entries = fileService.readDir(folderPath);
    const projects: string[] = [];
    for (const entry of entries) {
      const entryPath = path.join(folderPath, entry);
      // Skip non-directories and the fanlib folder
      if (entry === 'fanlib') continue;
      if (!fileService.exists(path.join(entryPath, 'outline')) &&
          !fileService.exists(path.join(entryPath, PROJECT_CONFIG))) {
        // Check for any project files (chapters, characters, wiki)
        const hasChapters = fileService.exists(path.join(entryPath, 'chapters'));
        const hasCharacters = fileService.exists(path.join(entryPath, 'characters'));
        const hasWiki = fileService.exists(path.join(entryPath, 'wiki'));
        if (!hasChapters && !hasCharacters && !hasWiki) continue;
      }
      // Auto-repair: recreate astrolabe.json if missing but project files exist
      const projectConfig = path.join(entryPath, PROJECT_CONFIG);
      if (!fileService.exists(projectConfig)) {
        const config = {
          version: 1,
          id: randomUUID(),
          title: entry,
          cover: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          settings: { language: 'zh-CN', autoSaveInterval: 30 },
        };
        fileService.writeFile(projectConfig, JSON.stringify(config, null, 2));
      }
      projects.push(entry);
    }
    workspace.projects = projects;

    // Save the last workspace path for session restore
    sessionService.saveSession({
      openedProjects: projects,
      activeProject: folderPath,
      tabs: [],
      panelLayout: { grid: '1x1', sizes: [1] },
      scrollPositions: {},
    });

    return workspace;
  });

  ipcMain.handle('workspace:getLast', async () => {
    const session = sessionService.loadSession();
    if (!session || !session.activeProject) return null;
    return session.activeProject;
  });
}
