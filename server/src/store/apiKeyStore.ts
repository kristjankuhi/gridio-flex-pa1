export type Scope = 'read' | 'write' | 'admin';

export interface ApiKey {
  id: string;
  key: string;
  label: string;
  scopes: Scope[];
  createdAt: Date;
  lastUsedAt: Date | null;
}

const store = new Map<string, ApiKey>();

// Seed a default admin key for local development
const DEV_KEY = 'gf_dev_0000000000000000';
store.set(DEV_KEY, {
  id: 'key_dev',
  key: DEV_KEY,
  label: 'Dev admin key',
  scopes: ['read', 'write', 'admin'],
  createdAt: new Date('2025-01-01T00:00:00Z'),
  lastUsedAt: null,
});

export function listKeys(): ApiKey[] {
  return [...store.values()].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
}

export function getKeyByValue(key: string): ApiKey | undefined {
  return store.get(key);
}

export function markUsed(key: string): void {
  const entry = store.get(key);
  if (entry) {
    entry.lastUsedAt = new Date();
  }
}

export function createKey(label: string, scopes: Scope[]): ApiKey {
  const raw = `gf_${crypto.randomUUID().replace(/-/g, '')}`;
  const entry: ApiKey = {
    id: `key_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
    key: raw,
    label,
    scopes,
    createdAt: new Date(),
    lastUsedAt: null,
  };
  store.set(raw, entry);
  return entry;
}

export function revokeKey(id: string): boolean {
  for (const [raw, entry] of store.entries()) {
    if (entry.id === id) {
      store.delete(raw);
      return true;
    }
  }
  return false;
}
