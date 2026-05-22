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

describe('FanlibService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a card and updates index', async () => {
    mockExists.mockReturnValue(true);
    mockReadFile.mockReturnValue(JSON.stringify({ cards: [], updatedAt: '' }));

    const { fanlibService } = await import('../../src/main/services/fanlib.service');

    const card = {
      id: 'c1', type: 'character' as const, name: '吕布', aliases: [], tags: ['三国'],
      source: { type: 'novel' as const, title: '三国演义' },
      appearance: '', personality: '勇武', abilities: [], background: '',
      relationships: [], designImages: [],
      createdAt: '', updatedAt: '',
    };

    fanlibService.saveCard('/workspace', card);
    expect(mockMkdir).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalled();
  });

  it('reads a card by type and id', async () => {
    const cardData = { id: 'c1', type: 'character', name: '吕布', aliases: [], tags: [], source: { type: 'novel', title: '三国演义' }, createdAt: '', updatedAt: '' };
    mockExists.mockReturnValue(true);
    mockReadFile.mockReturnValue(JSON.stringify(cardData));

    const { fanlibService } = await import('../../src/main/services/fanlib.service');
    const card = fanlibService.getCard('/workspace', 'character', 'c1');
    expect(card?.name).toBe('吕布');
  });

  it('lists cards by type from index', async () => {
    mockExists.mockReturnValue(true);
    mockReadFile.mockReturnValue(JSON.stringify({
      cards: [
        { id: 'c1', type: 'character', name: '吕布', tags: [] },
        { id: 'c2', type: 'worldview', name: '三国', tags: [] },
      ],
      updatedAt: '',
    }));

    const { fanlibService } = await import('../../src/main/services/fanlib.service');
    const list = fanlibService.listCards('/workspace', 'character');
    expect(list).toHaveLength(1);
  });

  it('searches cards by name and tags', async () => {
    mockExists.mockReturnValue(true);
    mockReadFile
      .mockReturnValueOnce(JSON.stringify({
        cards: [
          { id: 'c1', type: 'character', name: '吕布', tags: ['武将'] },
          { id: 'c2', type: 'character', name: '赵云', tags: ['武将'] },
        ],
        updatedAt: '',
      }))
      .mockReturnValueOnce(JSON.stringify({ id: 'c1', type: 'character', name: '吕布', aliases: [], tags: ['武将'], source: { type: 'novel', title: '' }, createdAt: '', updatedAt: '' }));

    const { fanlibService } = await import('../../src/main/services/fanlib.service');
    const results = fanlibService.search('/workspace', '吕布');
    expect(results).toHaveLength(1);
  });
});
