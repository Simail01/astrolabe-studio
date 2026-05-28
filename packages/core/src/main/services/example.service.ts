import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

function getExamplesDir(): string {
  if (app.isPackaged) return path.join(process.resourcesPath, 'examples');
  return path.join(__dirname, '../../..', 'resources', 'examples');
}

function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function seedExampleProject(workspacePath: string): string | null {
  const examplesDir = getExamplesDir();
  if (!fs.existsSync(examplesDir)) return null;

  const entries = fs.readdirSync(examplesDir, { withFileTypes: true }).filter(d => d.isDirectory());
  if (entries.length === 0) return null;

  const sourceDir = path.join(examplesDir, entries[0].name);
  let name = entries[0].name;

  // Avoid name conflict
  const destDir = path.join(workspacePath, name);
  if (fs.existsSync(destDir)) {
    name = `${name}-${Date.now()}`;
    const uniqueDest = path.join(workspacePath, name);
    copyDirSync(sourceDir, uniqueDest);
    return name;
  }

  copyDirSync(sourceDir, destDir);
  return name;
}
