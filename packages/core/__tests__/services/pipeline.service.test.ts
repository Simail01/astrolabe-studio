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

describe('PipelineService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves and reads an outline', async () => {
    mockExists.mockReturnValue(true);
    const outline = { id: 'o1', title: 'Test', premise: '', genre: [], volumes: [], nodes: [], createdAt: '', updatedAt: '' };
    mockReadFile.mockReturnValue(JSON.stringify(outline));

    const { pipelineService } = await import('../../src/main/services/pipeline.service');

    pipelineService.saveOutline('/project', outline);
    expect(mockWriteFile).toHaveBeenCalled();

    const result = pipelineService.getOutline('/project');
    expect(result?.title).toBe('Test');
  });

  it('saves and lists chapters', async () => {
    mockReadDir.mockReturnValue(['ch-001.json', 'ch-002.json']);
    const { pipelineService } = await import('../../src/main/services/pipeline.service');
    const chapters = pipelineService.listChapters('/project');
    expect(chapters).toHaveLength(2);
  });

  it('saves and reads a storyboard', async () => {
    mockExists.mockReturnValue(true);
    const sb = { id: 's1', chapterId: 'ch1', shots: [], createdAt: '', updatedAt: '' };
    mockReadFile.mockReturnValue(JSON.stringify(sb));

    const { pipelineService } = await import('../../src/main/services/pipeline.service');
    pipelineService.saveStoryboard('/project', sb);
    const result = pipelineService.getStoryboard('/project', 'ch1');
    expect(result?.chapterId).toBe('ch1');
  });

  it('manages pipeline state', async () => {
    const state = { projectId: 'p1', currentStage: 'outline' as const, stages: { outline: { status: 'done' as const, updatedAt: '' }, characters: { status: 'pending' as const, updatedAt: '' }, chapters: { status: 'pending' as const, updatedAt: '' }, storyboard: { status: 'pending' as const, updatedAt: '' }, comic: { status: 'pending' as const, updatedAt: '' }, video: { status: 'pending' as const, updatedAt: '' } } };
    mockReadFile.mockReturnValue(JSON.stringify(state));
    mockExists.mockReturnValue(true);

    const { pipelineService } = await import('../../src/main/services/pipeline.service');
    pipelineService.savePipelineState('/project', state);
    const result = pipelineService.getPipelineState('/project');
    expect(result?.currentStage).toBe('outline');
  });
});
