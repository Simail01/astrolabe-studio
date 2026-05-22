import Store from 'electron-store';

export class KeyStore {
  private store: Store;

  constructor(namespace: string) {
    this.store = new Store({ name: namespace });
  }

  setKey(provider: string, value: string): void {
    this.store.set(provider, value);
    const keys = (this.store.get('__keys__') as string[]) ?? [];
    if (!keys.includes(provider)) {
      keys.push(provider);
      this.store.set('__keys__', keys);
    }
  }

  getKey(provider: string): string | null {
    const val = this.store.get(provider);
    return typeof val === 'string' ? val : null;
  }

  deleteKey(provider: string): void {
    this.store.delete(provider);
    const keys = (this.store.get('__keys__') as string[]) ?? [];
    this.store.set('__keys__', keys.filter((k) => k !== provider));
  }

  listKeys(): string[] {
    return (this.store.get('__keys__') as string[]) ?? [];
  }
}

export const aiKeyStore = new KeyStore('astrolabe-ai-keys');
