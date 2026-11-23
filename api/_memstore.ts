/**
 * In-memory stand-in for the few Redis commands api/party.ts uses, for local end-to-end tests
 * (scripts/party-e2e.mjs). Files starting with "_" in api/ are not deployed as functions.
 */
export interface Store {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { nx?: boolean; ex?: number }): Promise<'OK' | null>;
  mget<T extends unknown[]>(...keys: string[]): Promise<T>;
  smembers(key: string): Promise<string[]>;
  sadd(key: string, member: string): Promise<number>;
  srem(key: string, member: string): Promise<number>;
  del(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
}

export function memoryStore(): Store {
  const kv = new Map<string, unknown>();
  const sets = new Map<string, Set<string>>();
  return {
    async get<T>(k: string) { return (kv.has(k) ? structuredClone(kv.get(k)) : null) as T | null; },
    async set(k, v, o) {
      if (o?.nx && kv.has(k)) return null;
      kv.set(k, structuredClone(v));
      return 'OK';
    },
    async mget<T extends unknown[]>(...ks: string[]) { return ks.map((k) => (kv.has(k) ? structuredClone(kv.get(k)) : null)) as T; },
    async smembers(k) { return [...(sets.get(k) ?? [])]; },
    async sadd(k, m) { const s = sets.get(k) ?? new Set(); const had = s.has(m); s.add(m); sets.set(k, s); return had ? 0 : 1; },
    async srem(k, m) { return sets.get(k)?.delete(m) ? 1 : 0; },
    async del(k) { return kv.delete(k) ? 1 : 0; },
    async expire() { return 1; },
  };
}
