/**
 * Party room storage on Vercel's Runtime Cache (no Marketplace setup needed). Rooms are short-lived, so an
 * expiring regional key-value cache fits; all functions run in one region (iad1), so every request sees the
 * same room. Runtime Cache has no atomic set-if-absent or sets, so those are read-then-write here: the party
 * engine already settles pick races by server timestamp, so first-come-first-served still holds.
 * Upstash Redis is used instead whenever it's connected (see api/party.ts).
 */
import { getCache } from '@vercel/functions';
import type { Store } from './_memstore';

const TTL = 3 * 3600;

export function runtimeStore(): Store {
  const cache = getCache({ namespace: 'party' });
  const get = async <T>(k: string) => ((await cache.get(k)) ?? null) as T | null;
  const put = (k: string, v: unknown, ex = TTL) => cache.set(k, v, { ttl: ex, name: 'party-room' });
  return {
    get,
    async set(k, v, o) {
      if (o?.nx && (await cache.get(k)) != null) return null;
      await put(k, v, o?.ex ?? TTL);
      return 'OK';
    },
    async mget<T extends unknown[]>(...ks: string[]) { return (await Promise.all(ks.map((k) => get(k)))) as T; },
    async smembers(k) { return (await get<string[]>(k)) ?? []; },
    async sadd(k, m) {
      const s = (await get<string[]>(k)) ?? [];
      if (s.includes(m)) return 0;
      await put(k, [...s, m]);
      return 1;
    },
    async srem(k, m) {
      const s = (await get<string[]>(k)) ?? [];
      if (!s.includes(m)) return 0;
      await put(k, s.filter((x) => x !== m));
      return 1;
    },
    async del(k) { await cache.delete(k); return 1; },
    // Every write already carries the room's 3-hour expiry.
    async expire() { return 1; },
  };
}

/** Whether this request got Vercel's shared Runtime Cache (not the per-instance in-memory fallback). */
export function sharedCache(): boolean {
  // Same lookup @vercel/functions does internally (its getContext isn't a public export).
  const ctx = (globalThis as Record<symbol, { get?: () => { cache?: unknown } } | undefined>)[Symbol.for('@vercel/request-context')]?.get?.();
  return !!ctx?.cache || !!(process.env.RUNTIME_CACHE_ENDPOINT && process.env.RUNTIME_CACHE_HEADERS);
}
