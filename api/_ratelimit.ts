/**
 * Rate limits for the API: a fixed window per client IP and bucket, kept in Upstash Redis when it's connected,
 * else Vercel's Runtime Cache, else memory (local runs and tests). Over the limit → 429 with Retry-After.
 *
 * Counts are read-then-write (Runtime Cache has no atomic increment), so a burst can slip a few requests past the
 * limit; that's fine for its job, which is stopping brute-force guessing, spam and runaway storage bills, not
 * exact metering. If the store itself fails the request is let through: a broken limiter must not break the game.
 *
 * Files starting with "_" in api/ are not deployed as functions.
 */
import { getCache } from '@vercel/functions';
import { Redis } from '@upstash/redis';

/** Requests allowed per window, per IP (or for everyone, when `global`). */
export interface Limit { max: number; windowSec: number; global?: boolean }

export const LIMITS = {
  /** Sign in / link / unlink / delete account: the "login" endpoint. */
  account: { max: 20, windowSec: 600 },
  /** Wrong admin keys: a handful an hour, then locked out for the hour. */
  adminFail: { max: 10, windowSec: 3600 },
  admin: { max: 120, windowSec: 60 },
  save: { max: 30, windowSec: 60 },
  pinRead: { max: 60, windowSec: 60 },
  pinWrite: { max: 10, windowSec: 60 },
  weeklyRead: { max: 30, windowSec: 60 },
  weeklyWrite: { max: 10, windowSec: 60 },
  /** Creating party rooms (each one is stored for 3 hours). */
  partyCreate: { max: 10, windowSec: 3600 },
  /** Join / leave / start / pick (a full draft is about 10 picks a player). */
  partyWrite: { max: 120, windowSec: 60 },
  track: { max: 30, windowSec: 60 },
  /** Share-card images: rendered on a CDN miss, which costs compute. */
  image: { max: 60, windowSec: 60 },
  /** Live self-tests write to real storage: a few an hour for the whole world. */
  selftest: { max: 6, windowSec: 3600, global: true },
} satisfies Record<string, Limit>;
export type Bucket = keyof typeof LIMITS;

export interface Counter {
  get(key: string): Promise<number | null>;
  set(key: string, n: number, ttlSec: number): Promise<void>;
}

export function memoryCounter(): Counter {
  const m = new Map<string, { n: number; until: number }>();
  return {
    async get(k) { const e = m.get(k); return e && e.until > Date.now() ? e.n : null; },
    async set(k, n, ttl) { m.set(k, { n, until: Date.now() + ttl * 1000 }); },
  };
}

function defaultCounter(): Counter {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? '';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? '';
  if (url && token) {
    const r = new Redis({ url, token });
    return { get: (k) => r.get<number>(k), set: async (k, n, ttl) => { await r.set(k, n, { ex: ttl }); } };
  }
  if (process.env.VERCEL) {
    const cache = getCache({ namespace: 'ratelimit' });
    return {
      get: async (k) => ((await cache.get(k)) as number | null) ?? null,
      set: (k, n, ttl) => cache.set(k, n, { ttl, name: 'rate-limit' }),
    };
  }
  return memoryCounter();
}

let counter: Counter | null = null;
/** Tests swap in their own counter (or a fresh memory one between cases). */
export const useCounter = (c: Counter) => { counter = c; };

/** The caller's IP as Vercel reports it (x-real-ip, else the first x-forwarded-for hop). */
export function clientIp(req: Request): string {
  const real = req.headers.get('x-real-ip')?.trim();
  if (real) return real;
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

/**
 * Count this request against `bucket`. Returns a 429 response when the caller is over the limit, else null.
 * `headers` are merged into the 429 (CORS, so browsers can read it).
 */
export function rateLimit(req: Request, bucket: Bucket, headers: Record<string, string> = {}): Promise<Response | null> {
  return check(req, bucket, headers, true);
}

/** Like rateLimit, but only looks: for buckets that count failures (a wrong admin key), checked before trying. */
export function overLimit(req: Request, bucket: Bucket, headers: Record<string, string> = {}): Promise<Response | null> {
  return check(req, bucket, headers, false);
}

async function check(req: Request, bucket: Bucket, headers: Record<string, string>, count: boolean): Promise<Response | null> {
  const lim: Limit = LIMITS[bucket];
  const now = Math.floor(Date.now() / 1000);
  const window = Math.floor(now / lim.windowSec);
  const who = lim.global ? 'all' : clientIp(req);
  const key = `rl:${bucket}:${who}:${window}`;
  try {
    const c = (counter ??= defaultCounter());
    const n = ((await c.get(key)) ?? 0) + (count ? 1 : 0);
    if (n > lim.max || (!count && n >= lim.max)) {
      const retry = (window + 1) * lim.windowSec - now;
      return new Response(JSON.stringify({ error: 'rate-limited', retryAfter: retry }), {
        status: 429,
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'retry-after': String(retry), ...headers },
      });
    }
    if (count) await c.set(key, n, lim.windowSec);
    return null;
  } catch {
    return null;
  }
}

/** CORS header every limited endpoint already sends, so a browser can read the 429. */
export const OPEN = { 'access-control-allow-origin': '*' } as const;

/** Wrap a handler so each request is counted against `bucket` first. */
export const withLimit = (bucket: Bucket | ((req: Request) => Bucket), handler: (req: Request) => Promise<Response>) =>
  async (req: Request): Promise<Response> =>
    (await rateLimit(req, typeof bucket === 'function' ? bucket(req) : bucket, OPEN)) ?? handler(req);
