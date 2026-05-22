import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { WorkspaceSession, RecoveryDraft } from '@astrolabe/shared';

function sessionsDir(): string {
  return path.join(app.getPath('userData'), 'sessions');
}

function workspaceSessionPath(): string {
  return path.join(sessionsDir(), 'workspace.json');
}

function draftPath(draftId: string): string {
  return path.join(sessionsDir(), `draft-${draftId}.json`);
}

function ensureSessionsDir(): void {
  const dir = sessionsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export const sessionService = {
  saveSession(session: WorkspaceSession): void {
    ensureSessionsDir();
    fs.writeFileSync(workspaceSessionPath(), JSON.stringify(session, null, 2), 'utf-8');
  },

  loadSession(): WorkspaceSession | null {
    const p = workspaceSessionPath();
    if (!fs.existsSync(p)) {
      return null;
    }
    const raw = fs.readFileSync(p, 'utf-8');
    return JSON.parse(raw) as WorkspaceSession;
  },

  checkDrafts(): RecoveryDraft[] {
    const dir = sessionsDir();
    if (!fs.existsSync(dir)) {
      return [];
    }
    const files = fs.readdirSync(dir).filter(f => f.startsWith('draft-') && f.endsWith('.json'));
    return files.map(f => {
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, 'utf-8').slice(0, 100);
      return {
        path: fullPath,
        lastModified: stat.mtime.toISOString(),
        preview: content,
      };
    });
  },

  saveDraft(draftId: string, content: string): void {
    ensureSessionsDir();
    fs.writeFileSync(draftPath(draftId), content, 'utf-8');
  },

  clearDraft(draftId: string): void {
    const p = draftPath(draftId);
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
    }
  },
};
