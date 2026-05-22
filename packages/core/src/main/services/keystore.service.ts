import Store from 'electron-store';

export class KeyStore {
  private store: Store;

  constructor(namespace: string) {
    this.store = new Store({ name: namespace });
  }

  setKey(provider: string, value: string): void {
    this.store.set(provider, value);
  }

  getKey(provider: string): string | null {
    const val = this.store.get(provider);
    return typeof val === 'string' ? val : null;
  }

  deleteKey(provider: string): void {
    this.store.delete(provider);
  }

  listKeys(): string[] {
    const keys: string[] = [];
    for (const [key] of Object.entries(this.store.store)) {
      keys.push(key);
    }
    return keys;
  }
}

export const aiKeyStore = new KeyStore('astrolabe-ai-keys');
