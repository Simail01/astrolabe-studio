import fs from 'fs';
import path from 'path';
import type { PromptLogEntry } from '@astrolabe/shared';

const LOG_FILE = 'prompt-log.json';
const MAX_ENTRIES = 200;

function getLogPath(workspacePath: string): string {
  return path.join(workspacePath, '.astrolabe', LOG_FILE);
}

function ensureDir(workspacePath: string): void {
  const dir = path.join(workspacePath, '.astrolabe');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadLogs(workspacePath: string): PromptLogEntry[] {
  const logPath = getLogPath(workspacePath);
  if (!fs.existsSync(logPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(logPath, 'utf-8')) as PromptLogEntry[];
  } catch {
    return [];
  }
}

function saveLogs(workspacePath: string, logs: PromptLogEntry[]): void {
  ensureDir(workspacePath);
  fs.writeFileSync(getLogPath(workspacePath), JSON.stringify(logs, null, 2), 'utf-8');
}

export const promptLogService = {
  appendLog(workspacePath: string, entry: PromptLogEntry): void {
    const logs = loadLogs(workspacePath);
    logs.push(entry);
    if (logs.length > MAX_ENTRIES) {
      logs.splice(0, logs.length - MAX_ENTRIES);
    }
    saveLogs(workspacePath, logs);
  },

  getLogs(workspacePath: string, limit?: number): PromptLogEntry[] {
    const logs = loadLogs(workspacePath);
    if (limit) return logs.slice(-limit);
    return logs;
  },
};
