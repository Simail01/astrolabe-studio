import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDelete = vi.fn();
const mockStore: Record<string, unknown> = {};

vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: mockGet,
    set: mockSet,
    delete: mockDelete,
    store: mockStore,
  })),
}));

describe('KeyStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mockStore
    for (const key of Object.keys(mockStore)) {
      delete mockStore[key];
    }
  });

  it('stores and retrieves a key', async () => {
    const { KeyStore } = await import('../../src/main/services/keystore.service');
    const store = new KeyStore('test-ns');

    mockGet.mockReturnValue('encrypted-value');

    store.setKey('deepseek', 'sk-test-123');
    expect(mockSet).toHaveBeenCalledWith('deepseek', 'sk-test-123');

    const key = store.getKey('deepseek');
    expect(key).toBe('encrypted-value');
    expect(mockGet).toHaveBeenCalledWith('deepseek');
  });

  it('returns null for missing key', async () => {
    const { KeyStore } = await import('../../src/main/services/keystore.service');
    const store = new KeyStore('test-ns');

    mockGet.mockReturnValue(undefined);
    expect(store.getKey('nonexistent')).toBeNull();
  });

  it('deletes a key', async () => {
    const { KeyStore } = await import('../../src/main/services/keystore.service');
    const store = new KeyStore('test-ns');

    store.deleteKey('deepseek');
    expect(mockDelete).toHaveBeenCalledWith('deepseek');
  });

  it('lists all stored key names', async () => {
    const { KeyStore } = await import('../../src/main/services/keystore.service');
    const store = new KeyStore('test-ns');

    mockStore['deepseek'] = 'sk-a';
    mockStore['volcengine-ak'] = 'ak-b';

    const keys = store.listKeys();
    expect(keys).toContain('deepseek');
    expect(keys).toContain('volcengine-ak');
    expect(keys).toHaveLength(2);
  });
});
