import fs from 'fs';
import path from 'path';
import { dialog, shell } from 'electron';
import zlib from 'zlib';
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
    const ext = format === 'epub' ? 'epub' : format === 'markdown' ? 'md' : 'txt';
    const filterName = format === 'markdown' ? 'Markdown' : ext.toUpperCase();
    const result = await dialog.showSaveDialog({
      title: '导出小说',
      defaultPath: path.join(projectPath, 'export', `${projectTitle}.${ext}`),
      filters: [{ name: filterName, extensions: [ext] }],
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
    } else if (format === 'markdown') {
      const lines: string[] = [];
      lines.push(`# ${projectTitle}`);
      lines.push('');
      for (const ch of chapters) {
        lines.push(`## ${ch.title || '未命名章节'}`);
        lines.push('');
        lines.push(ch.content || '');
        lines.push('');
      }
      fileService.writeFile(result.filePath, lines.join('\n'));
    } else if (format === 'epub') {
      const epubBuffer = generateEpub(projectTitle, chapters);
      // fileService.writeFile only accepts string; write binary buffer directly
      fs.writeFileSync(result.filePath, epubBuffer);
    }

    // Open in file explorer
    shell.showItemInFolder(result.filePath);
    return result.filePath;
  },

  async exportChapter(projectPath: string, chapterId: string, format: string): Promise<string> {
    const chapterPath = path.join(projectPath, 'chapters', `${chapterId}.json`);
    if (!fileService.exists(chapterPath)) throw new Error('没有找到该章节');

    let chapter: Chapter;
    try {
      chapter = JSON.parse(fileService.readFile(chapterPath));
    } catch {
      throw new Error('章节数据损坏');
    }

    const ext = format === 'markdown' ? 'md' : 'txt';
    const result = await dialog.showSaveDialog({
      title: '导出章节',
      defaultPath: path.join(projectPath, 'export', `${chapter.title || chapterId}.${ext}`),
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    });

    if (result.canceled || !result.filePath) throw new Error('用户取消导出');

    ensureDir(path.dirname(result.filePath));

    if (format === 'markdown') {
      fileService.writeFile(result.filePath, `# ${chapter.title || '未命名章节'}\n\n${chapter.content || ''}`);
    } else {
      fileService.writeFile(result.filePath, `${chapter.title || '未命名章节'}\n${'='.repeat(20)}\n\n${chapter.content || ''}`);
    }

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

  async exportComicLongImage(projectPath: string, html: string): Promise<string> {
    let projectTitle = '未命名作品';
    try {
      const configPath = path.join(projectPath, 'astrolabe.json');
      if (fileService.exists(configPath)) {
        const config = JSON.parse(fileService.readFile(configPath));
        projectTitle = config.title || projectTitle;
      }
    } catch { /* use default */ }

    const result = await dialog.showSaveDialog({
      title: '导出漫画长图',
      defaultPath: path.join(projectPath, 'export', `${projectTitle}-长图.html`),
      filters: [{ name: 'HTML', extensions: ['html'] }],
    });

    if (result.canceled || !result.filePath) throw new Error('用户取消导出');

    ensureDir(path.dirname(result.filePath));
    fileService.writeFile(result.filePath, html);

    shell.showItemInFolder(result.filePath);
    return result.filePath;
  },
};

function generateEpub(title: string, chapters: Chapter[]): Buffer {
  const files: { name: string; data: Buffer; compress: boolean }[] = [];

  // 1. mimetype — must be first and uncompressed
  files.push({ name: 'mimetype', data: Buffer.from('application/epub+zip', 'utf-8'), compress: false });

  // 2. META-INF/container.xml
  files.push({
    name: 'META-INF/container.xml',
    data: Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`, 'utf-8'),
    compress: true,
  });

  // 3. OEBPS/content.opf
  const manifestItems = [
    '  <item id="style" href="style.css" media-type="text/css"/>',
    '  <item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>',
    ...chapters.map((_ch, i) => `  <item id="ch${i}" href="chapter-${i}.xhtml" media-type="application/xhtml+xml"/>`),
    '  <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
  ];
  const spineItems = [
    '  <itemref idref="title"/>',
    ...chapters.map((_ch, i) => `  <itemref idref="ch${i}"/>`),
  ];
  files.push({
    name: 'OEBPS/content.opf',
    data: Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>zh-CN</dc:language>
    <dc:creator>星盘工坊</dc:creator>
    <dc:identifier id="bookid">urn:uuid:${Date.now().toString(36)}</dc:identifier>
  </metadata>
  <manifest>
${manifestItems.join('\n')}
  </manifest>
  <spine toc="ncx">
${spineItems.join('\n')}
  </spine>
</package>`, 'utf-8'),
    compress: true,
  });

  // 4. OEBPS/toc.ncx
  const navPoints = chapters.map((ch, i) => `    <navPoint id="navPoint-${i}" playOrder="${i + 1}">
      <navLabel><text>${escapeXml(ch.title || '未命名章节')}</text></navLabel>
      <content src="chapter-${i}.xhtml"/>
    </navPoint>`).join('\n');
  files.push({
    name: 'OEBPS/toc.ncx',
    data: Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${Date.now().toString(36)}"/>
  </head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>`, 'utf-8'),
    compress: true,
  });

  // 5. OEBPS/style.css
  files.push({
    name: 'OEBPS/style.css',
    data: Buffer.from(`body { font-family: serif; line-height: 1.8; margin: 1em; }
h1 { text-align: center; margin-bottom: 2em; }
h2 { margin-top: 1.5em; margin-bottom: 0.5em; }
p { text-indent: 2em; margin: 0.3em 0; }`, 'utf-8'),
    compress: true,
  });

  // 6. Title page
  files.push({
    name: 'OEBPS/title.xhtml',
    data: Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeXml(title)}</title><link rel="stylesheet" href="style.css"/></head>
<body><h1>${escapeXml(title)}</h1><p style="text-align:center;color:#888;">由星盘工坊生成</p></body>
</html>`, 'utf-8'),
    compress: true,
  });

  // 7. Chapter XHTML files
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const bodyLines = (ch.content || '').split('\n').filter(l => l.trim()).map(l => `    <p>${escapeXml(l)}</p>`).join('\n');
    files.push({
      name: `OEBPS/chapter-${i}.xhtml`,
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeXml(ch.title || '未命名章节')}</title><link rel="stylesheet" href="style.css"/></head>
<body>
  <h2>${escapeXml(ch.title || '未命名章节')}</h2>
${bodyLines}
</body>
</html>`, 'utf-8'),
      compress: true,
    });
  }

  return buildEpubZip(files);
}

// --- Minimal EPUB zip builder (no external dependencies) ---

const CRC32_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC32_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function writeUint16LE(buf: Buffer, offset: number, value: number): void {
  buf[offset] = value & 0xFF;
  buf[offset + 1] = (value >>> 8) & 0xFF;
}

function writeUint32LE(buf: Buffer, offset: number, value: number): void {
  buf[offset] = value & 0xFF;
  buf[offset + 1] = (value >>> 8) & 0xFF;
  buf[offset + 2] = (value >>> 16) & 0xFF;
  buf[offset + 3] = (value >>> 24) & 0xFF;
}

function buildEpubZip(files: { name: string; data: Buffer; compress: boolean }[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralEntries: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuffer = Buffer.from(file.name, 'utf-8');
    const compressed = file.compress ? zlib.deflateRawSync(file.data) : file.data;
    const method = file.compress ? 8 : 0; // 8=DEFLATE, 0=STORE
    const fileCrc = crc32(file.data);

    // Local file header (30 bytes + name + data)
    const localHeader = Buffer.alloc(30 + nameBuffer.length);
    writeUint32LE(localHeader, 0, 0x04034b50);  // signature
    writeUint16LE(localHeader, 4, 20);            // version needed
    writeUint16LE(localHeader, 6, 0);             // flags
    writeUint16LE(localHeader, 8, method);        // compression method
    writeUint16LE(localHeader, 10, 0);            // mod time
    writeUint16LE(localHeader, 12, 0);            // mod date
    writeUint32LE(localHeader, 14, fileCrc);      // crc32
    writeUint32LE(localHeader, 18, compressed.length);  // compressed size
    writeUint32LE(localHeader, 22, file.data.length);   // uncompressed size
    writeUint16LE(localHeader, 26, nameBuffer.length);  // name length
    writeUint16LE(localHeader, 28, 0);            // extra length
    nameBuffer.copy(localHeader, 30);

    localHeaders.push(localHeader, compressed);

    // Central directory entry (46 bytes + name)
    const centralEntry = Buffer.alloc(46 + nameBuffer.length);
    writeUint32LE(centralEntry, 0, 0x02014b50);  // signature
    writeUint16LE(centralEntry, 4, 20);            // version made by
    writeUint16LE(centralEntry, 6, 20);            // version needed
    writeUint16LE(centralEntry, 8, 0);             // flags
    writeUint16LE(centralEntry, 10, method);       // compression method
    writeUint16LE(centralEntry, 12, 0);            // mod time
    writeUint16LE(centralEntry, 14, 0);            // mod date
    writeUint32LE(centralEntry, 16, fileCrc);      // crc32
    writeUint32LE(centralEntry, 20, compressed.length);  // compressed size
    writeUint32LE(centralEntry, 24, file.data.length);   // uncompressed size
    writeUint16LE(centralEntry, 28, nameBuffer.length);  // name length
    writeUint16LE(centralEntry, 30, 0);            // extra length
    writeUint16LE(centralEntry, 32, 0);            // comment length
    writeUint16LE(centralEntry, 34, 0);            // disk number
    writeUint16LE(centralEntry, 36, 0);            // internal attrs
    writeUint32LE(centralEntry, 38, 0);            // external attrs
    writeUint32LE(centralEntry, 42, offset);       // local header offset
    nameBuffer.copy(centralEntry, 46);

    centralEntries.push(centralEntry);
    offset += localHeader.length + compressed.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralEntries.reduce((sum, b) => sum + b.length, 0);

  // End of central directory (22 bytes)
  const endRecord = Buffer.alloc(22);
  writeUint32LE(endRecord, 0, 0x06054b50);         // signature
  writeUint16LE(endRecord, 4, 0);                   // disk number
  writeUint16LE(endRecord, 6, 0);                   // disk with central dir
  writeUint16LE(endRecord, 8, files.length);        // entries on this disk
  writeUint16LE(endRecord, 10, files.length);       // total entries
  writeUint32LE(endRecord, 12, centralDirSize);     // central dir size
  writeUint32LE(endRecord, 16, centralDirOffset);   // central dir offset
  writeUint16LE(endRecord, 20, 0);                   // comment length

  return Buffer.concat([...localHeaders, ...centralEntries, endRecord]);
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
