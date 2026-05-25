import { ipcMain } from 'electron';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const request = client.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Follow redirect
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed with status ${response.statusCode}`));
        return;
      }
      const dir = path.dirname(destPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const fileStream = fs.createWriteStream(destPath);
      response.pipe(fileStream);
      fileStream.on('finish', () => { fileStream.close(); resolve(); });
      fileStream.on('error', (err) => { fs.unlinkSync(destPath); reject(err); });
    });
    request.on('error', reject);
    request.setTimeout(30000, () => { request.destroy(); reject(new Error('Download timeout')); });
  });
}

export function registerImageHandlers(): void {
  ipcMain.handle('image:download', async (_event, url: string, destPath: string) => {
    await downloadFile(url, destPath);
    return destPath;
  });
}
