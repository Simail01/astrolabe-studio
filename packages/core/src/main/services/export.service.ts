import path from 'path';
import { dialog, shell } from 'electron';
import { fileService } from './file.service';
import type { Chapter, Storyboard } from '@astrolabe/shared';

function ensureDir(dir: string): void {
  if (!fileService.exists(dir)) fileService.mkdir(dir);
}

export const exportService = {
  async exportNovel(projectPath: string, format: string): Promise<string> {
    // Read all chapters
    const chaptersDir = path.join(projectPath, 'chapters');
    if (!fileService.exists(chaptersDir)) throw new Error('没有找到章节数据');

    const files = fileService.readDir(chaptersDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) throw new Error('没有章节可导出');

    const chapters: Chapter[] = [];
    for (const f of files) {
      try {
        const ch = JSON.parse(fileService.readFile(path.join(chaptersDir, f)));
        if (ch.content) chapters.push(ch);
      } catch { /* skip malformed */ }
    }

    if (chapters.length === 0) throw new Error('所有章节内容为空');

    // Sort by order
    chapters.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Read project title
    let projectTitle = '未命名作品';
    try {
      const configPath = path.join(projectPath, 'astrolabe.json');
      if (fileService.exists(configPath)) {
        const config = JSON.parse(fileService.readFile(configPath));
        projectTitle = config.title || projectTitle;
      }
    } catch { /* use default */ }

    // Ask user where to save
    const ext = format === 'epub' ? 'epub' : 'txt';
    const result = await dialog.showSaveDialog({
      title: '导出小说',
      defaultPath: path.join(projectPath, 'export', `${projectTitle}.${ext}`),
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    });

    if (result.canceled || !result.filePath) throw new Error('用户取消导出');

    ensureDir(path.dirname(result.filePath));

    if (format === 'txt') {
      const lines: string[] = [];
      lines.push(projectTitle);
      lines.push('='.repeat(projectTitle.length * 2));
      lines.push('');
      for (const ch of chapters) {
        lines.push(`\n${'#'.repeat(4)} ${ch.title || '未命名章节'}\n`);
        lines.push(ch.content || '');
      }
      fileService.writeFile(result.filePath, lines.join('\n'));
    } else if (format === 'epub') {
      // Generate a simple EPUB (zip with XHTML)
      const epubContent = generateEpub(projectTitle, chapters);
      fileService.writeFile(result.filePath, epubContent);
    }

    // Open in file explorer
    shell.showItemInFolder(result.filePath);
    return result.filePath;
  },

  async exportCard(_cardPath: string, _format: string): Promise<string> {
    throw new Error('同人库导出功能尚未实现');
  },

  async exportComic(projectPath: string, _format: string): Promise<string> {
    // Find all storyboards with images
    const storyboardsDir = path.join(projectPath, 'storyboards');
    if (!fileService.exists(storyboardsDir)) throw new Error('没有找到分镜数据');

    const files = fileService.readDir(storyboardsDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) throw new Error('没有分镜可导出');

    const allShots: { chapterId: string; shots: any[] }[] = [];
    for (const f of files) {
      try {
        const sb: Storyboard = JSON.parse(fileService.readFile(path.join(storyboardsDir, f)));
        if (sb.shots?.length) allShots.push({ chapterId: sb.chapterId, shots: sb.shots });
      } catch { /* skip */ }
    }

    if (allShots.length === 0) throw new Error('没有分镜数据可导出');

    // Read project title
    let projectTitle = '未命名作品';
    try {
      const configPath = path.join(projectPath, 'astrolabe.json');
      if (fileService.exists(configPath)) {
        const config = JSON.parse(fileService.readFile(configPath));
        projectTitle = config.title || projectTitle;
      }
    } catch { /* use default */ }

    const result = await dialog.showSaveDialog({
      title: '导出漫画',
      defaultPath: path.join(projectPath, 'export', `${projectTitle}-漫画.html`),
      filters: [{ name: 'HTML', extensions: ['html'] }],
    });

    if (result.canceled || !result.filePath) throw new Error('用户取消导出');

    ensureDir(path.dirname(result.filePath));

    const html = generateComicHtml(projectTitle, allShots);
    fileService.writeFile(result.filePath, html);

    shell.showItemInFolder(result.filePath);
    return result.filePath;
  },
};

function generateEpub(title: string, chapters: Chapter[]): string {
  // Minimal EPUB 3 structure (actually a zip, but we'll generate a standalone XHTML for simplicity)
  const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(title)}</title>
  <style>
    body { font-family: serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.8; }
    h1 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
    h2 { margin-top: 2em; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
    .chapter { margin-bottom: 2em; }
    p { text-indent: 2em; margin: 0.5em 0; }
  </style>
</head>
<body>
  <h1>${escapeXml(title)}</h1>
${chapters.map(ch => `  <div class="chapter">
    <h2>${escapeXml(ch.title || '未命名章节')}</h2>
${(ch.content || '').split('\n').filter(l => l.trim()).map(l => `    <p>${escapeXml(l)}</p>`).join('\n')}
  </div>`).join('\n')}
</body>
</html>`;
  // Note: Real EPUB needs zip packaging. For now, output as XHTML (rename to .epub for most readers)
  return xhtml;
}

function generateComicHtml(title: string, allShots: { chapterId: string; shots: any[] }[]): string {
  const shotRows = allShots.map(({ chapterId, shots }) => {
    const imgCells = shots
      .filter(s => s.notes && s.notes.startsWith('http'))
      .map(s => `      <div class="panel">
        <img src="${escapeXml(s.notes)}" alt="镜头 ${s.order}" />
        <div class="caption">镜头 ${s.order}: ${escapeXml(s.scene || '')}</div>
      </div>`)
      .join('\n');
    return imgCells ? `    <div class="chapter">
      <h2>章节: ${escapeXml(chapterId)}</h2>
      <div class="grid">
${imgCells}
      </div>
    </div>` : '';
  }).filter(Boolean).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(title)} — 漫画</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Microsoft YaHei", sans-serif; background: #1a1b1e; color: #d4d4d4; padding: 20px; }
    h1 { text-align: center; color: #B08D57; margin-bottom: 24px; }
    h2 { color: #B08D57; margin: 16px 0 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
    .panel { border: 1px solid #333; border-radius: 4px; overflow: hidden; }
    .panel img { width: 100%; display: block; }
    .caption { padding: 8px 12px; font-size: 13px; color: #999; }
    .chapter { margin-bottom: 32px; }
    .no-images { color: #666; font-style: italic; padding: 20px; text-align: center; }
  </style>
</head>
<body>
  <h1>${escapeXml(title)}</h1>
${shotRows || '  <div class="no-images">暂无已生成的漫画图片</div>'}
</body>
</html>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
