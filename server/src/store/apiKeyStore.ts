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

function seed(id: string, key: string, label: string, scopes: Scope[]) {
  store.set(key, {
    id,
    key,
    label,
    scopes,
    createdAt: new Date(),
    lastUsedAt: null,
  });
}

seed('key_1', 'gf_dev_readonly_aabbccddeeff0011', 'Dev readonly', ['read']);
seed('key_2', 'gf_dev_trader_aabbccddeeff0022', 'Dev trader', [
  'read',
  'write',
]);
seed('key_3', 'gf_dev_admin_aabbccddeeff0033', 'Dev admin', [
  'read',
  'write',
  'admin',
]);

export function lookup(key: string): ApiKey | undefined {
  return store.get(key);
}

export function touch(key: string) {
  const k = store.get(key);
  if (k) k.lastUsedAt = new Date();
}

export function createKey(label: string, scopes: Scope[]): ApiKey {
  const id = `key_${Date.now()}`;
  const key = `gf_${crypto.randomUUID().replace(/-/g, '')}`;
  const entry: ApiKey = {
    id,
    key,
    label,
    scopes,
    createdAt: new Date(),
    lastUsedAt: null,
  };
  store.set(key, entry);
  return entry;
}

export function revokeKey(id: string): boolean {
  for (const [k, v] of store.entries()) {
    if (v.id === id) {
      store.delete(k);
      return true;
    }
  }
  return false;
}

export function listKeys(): ApiKey[] {
  return [...store.values()].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
}
