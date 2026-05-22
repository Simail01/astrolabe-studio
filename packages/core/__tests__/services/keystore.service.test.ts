import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDelete = vi.fn();

vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: mockGet,
    set: mockSet,
    delete: mockDelete,
  })),
}));

describe('KeyStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores and retrieves a key', async () => {
    const { KeyStore } = await import('../../src/main/services/keystore.service');
    const store = new KeyStore('test-ns');

    mockGet.mockImplementation((key: string) => {
      if (key === '__keys__') return undefined;
      if (key === 'deepseek') return 'encrypted-value';
      return undefined;
    });

    store.setKey('deepseek', 'sk-test-123');
    expect(mockSet).toHaveBeenCalledWith('deepseek', 'sk-test-123');
    expect(mockSet).toHaveBeenCalledWith('__keys__', ['deepseek']);

    const key = store.getKey('deepseek');
    expect(key).toBe('encrypted-value');
  });

  it('returns null for missing key', async () => {
    const { KeyStore } = await import('../../src/main/services/keystore.service');
    const store = new KeyStore('test-ns');

    mockGet.mockReturnValue(undefined);
    expect(store.getKey('nonexistent')).toBeNull();
  });

  it('deletes a key and removes from index', async () => {
    const { KeyStore } = await import('../../src/main/services/keystore.service');
    const store = new KeyStore('test-ns');

    mockGet.mockImplementation((key: string) => {
      if (key === '__keys__') return ['deepseek', 'volcengine'];
      return undefined;
    });

    store.deleteKey('deepseek');
    expect(mockDelete).toHaveBeenCalledWith('deepseek');
    expect(mockSet).toHaveBeenCalledWith('__keys__', ['volcengine']);
  });

  it('lists all stored key names from index', async () => {
    const { KeyStore } = await import('../../src/main/services/keystore.service');
    const store = new KeyStore('test-ns');

    mockGet.mockImplementation((key: string) => {
      if (key === '__keys__') return ['deepseek', 'volcengine-ak'];
      return undefined;
    });

    const keys = store.listKeys();
    expect(keys).toContain('deepseek');
    expect(keys).toContain('volcengine-ak');
    expect(keys).toHaveLength(2);
  });

  it('setKey does not duplicate provider in index', async () => {
    const { KeyStore } = await import('../../src/main/services/keystore.service');
    const store = new KeyStore('test-ns');

    mockGet.mockImplementation((key: string) => {
      if (key === '__keys__') return ['deepseek'];
      return undefined;
    });

    store.setKey('deepseek', 'sk-new');
    // Should have called set for the key value, but NOT updated __keys__ with a duplicate
    expect(mockSet).toHaveBeenCalledWith('deepseek', 'sk-new');
    // __keys__ should only be set if it changed — since 'deepseek' already exists, no second set
    const setCalls = (mockSet as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call: unknown[]) => call[0] === '__keys__'
    );
    expect(setCalls).toHaveLength(0);
  });
});
