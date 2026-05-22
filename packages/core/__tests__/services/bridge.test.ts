import { describe, it, expect, vi } from 'vitest';

const mockInvoke = vi.fn();
const mockOn = vi.fn(() => vi.fn());

vi.stubGlobal('window', {
  astrolabe: {
    invoke: mockInvoke,
    on: mockOn,
  },
});

describe('bridge', () => {
  it('readFile calls invoke with correct channel', async () => {
    mockInvoke.mockResolvedValueOnce('{"title":"test"}');
    const { bridge } = await import('../../src/renderer/services/bridge');
    await bridge.readFile('/test.json');
    expect(mockInvoke).toHaveBeenCalledWith('fs:readFile', '/test.json');
  });

  it('createProject calls invoke with path and name', async () => {
    mockInvoke.mockResolvedValueOnce({ id: '1', title: 'test' });
    const { bridge } = await import('../../src/renderer/services/bridge');
    await bridge.createProject('/workspace/test', 'test');
    expect(mockInvoke).toHaveBeenCalledWith('project:create', '/workspace/test', 'test');
  });
});
