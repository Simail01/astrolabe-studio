import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockReadDir = vi.fn();
const mockExists = vi.fn();
const mockMkdir = vi.fn();

vi.mock('../../src/main/services/file.service', () => ({
  fileService: {
    readFile: (p: string) => mockReadFile(p),
    writeFile: (p: string, d: string) => mockWriteFile(p, d),
    readDir: (p: string) => mockReadDir(p),
    exists: (p: string) => mockExists(p),
    mkdir: (p: string) => mockMkdir(p),
  },
}));

describe('WikiService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a wiki entry and updates index', async () => {
    mockExists.mockReturnValue(true);
    mockReadFile.mockReturnValue(JSON.stringify({ entries: [], updatedAt: '' }));

    const { wikiService } = await import('../../src/main/services/wiki.service');

    const entry = {
      id: 'w1', type: 'person' as const, title: '诸葛亮', aliases: ['孔明'],
      summary: '蜀汉丞相', content: '详细描述...', attributes: { 身份: '丞相' },
      relations: [], sourceChapters: ['ch-001'], confidence: 1,
      createdAt: '', updatedAt: '', confirmedByUser: true,
    };

    wikiService.saveEntry('/project', entry);
    expect(mockMkdir).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalled();
  });

  it('reads a wiki entry by type and id', async () => {
    const entryData = { id: 'w1', type: 'person', title: '诸葛亮', aliases: [], summary: '', content: '', attributes: {}, relations: [], sourceChapters: [], confidence: 1, createdAt: '', updatedAt: '', confirmedByUser: true };
    mockExists.mockReturnValue(true);
    mockReadFile.mockReturnValue(JSON.stringify(entryData));

    const { wikiService } = await import('../../src/main/services/wiki.service');
    const entry = wikiService.getEntry('/project', 'person', 'w1');
    expect(entry?.title).toBe('诸葛亮');
  });

  it('returns null for missing entry', async () => {
    mockExists.mockReturnValue(false);
    const { wikiService } = await import('../../src/main/services/wiki.service');
    expect(wikiService.getEntry('/project', 'person', 'nonexistent')).toBeNull();
  });

  it('lists entries by type from index', async () => {
    mockExists.mockReturnValue(true);
    mockReadFile.mockReturnValue(JSON.stringify({
      entries: [
        { id: 'w1', type: 'person', title: '诸葛亮', aliases: [] },
        { id: 'w2', type: 'location', title: '成都', aliases: [] },
      ],
      updatedAt: '',
    }));

    const { wikiService } = await import('../../src/main/services/wiki.service');
    const list = wikiService.listEntries('/project', 'person');
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('诸葛亮');
  });

  it('deletes an entry and removes from index', async () => {
    mockExists.mockReturnValue(true);
    mockReadFile.mockReturnValue(JSON.stringify({
      entries: [{ id: 'w1', type: 'person', title: '诸葛亮', aliases: [] }],
      updatedAt: '',
    }));

    const { wikiService } = await import('../../src/main/services/wiki.service');
    wikiService.deleteEntry('/project', 'person', 'w1');
    // Should write updated index without the entry
    const writeCalls = mockWriteFile.mock.calls;
    const indexCall = writeCalls.find((c: string[]) => c[0].includes('wiki-index'));
    expect(indexCall).toBeTruthy();
  });

  it('searches entries by keyword matching title and aliases', async () => {
    mockExists.mockReturnValue(true);
    mockReadFile
      .mockReturnValueOnce(JSON.stringify({
        entries: [
          { id: 'w1', type: 'person', title: '诸葛亮', aliases: ['孔明'] },
          { id: 'w2', type: 'person', title: '曹操', aliases: ['孟德'] },
        ],
        updatedAt: '',
      }))
      .mockReturnValueOnce(JSON.stringify({ id: 'w1', type: 'person', title: '诸葛亮', aliases: ['孔明'], summary: '蜀汉丞相', content: '', attributes: {}, relations: [], sourceChapters: [], confidence: 1, createdAt: '', updatedAt: '', confirmedByUser: true }))
      .mockReturnValueOnce(JSON.stringify({ id: 'w2', type: 'person', title: '曹操', aliases: ['孟德'], summary: '魏王', content: '', attributes: {}, relations: [], sourceChapters: [], confidence: 1, createdAt: '', updatedAt: '', confirmedByUser: true }));

    const { wikiService } = await import('../../src/main/services/wiki.service');
    const results = wikiService.search('/project', '诸葛');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('诸葛亮');
  });
});
