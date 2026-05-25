import fs from 'fs';
import path from 'path';

export const fileService = {
  readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
  },

  writeFile(filePath: string, data: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, data, 'utf-8');
  },

  readDir(dirPath: string): string[] {
    return fs.readdirSync(dirPath);
  },

  exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  },

  mkdir(dirPath: string): void {
    fs.mkdirSync(dirPath, { recursive: true });
  },

  deleteFile(filePath: string): void {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  },
};
