/**
 * Rate limits for the API: a fixed window per client IP and bucket. Over the limit → 429 with Retry-After.
 *
 * Counts live in Upstash Redis when it's connected (atomic INCR, shared by every function instance). Without it
 * they live in this instance's memory: Fluid Compute runs many requests on one instance, so a burst from one
 * address mostly lands on the same counter, which blunts brute-force guessing and spam without being exact
 * metering. Vercel's Runtime Cache was tried first and dropped: it is eventually consistent, so a read right
 * after a write misses and the count never climbs. If the store fails the request is let through: a broken
 * limiter must not break the game.
 *
 * Files starting with "_" in api/ are not deployed as functions.
 */
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
  /** Friend challenges: checking your mailbox (polled while the Duels tab is open), and sending or answering one. */
  duelRead: { max: 60, windowSec: 60 },
  duelWrite: { max: 20, windowSec: 60 },
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
  /** Count one hit against `key` and return the new total; the key expires `ttlSec` after its first hit. */
  hit(key: string, ttlSec: number): Promise<number>;
  /** The current total for `key`, without counting. */
  peek(key: string): Promise<number>;
}

export function memoryCounter(): Counter {
  const m = new Map<string, { n: number; until: number }>();
  const live = (k: string) => {
    const e = m.get(k);
    if (e && e.until > Date.now()) return e;
    if (e) m.delete(k);
    return null;
  };
  return {
    async hit(k, ttl) {
      // Windows roll over every minute to an hour; sweep dead keys before the map can grow without bound.
      if (m.size > 20_000) for (const [key, e] of m) if (e.until <= Date.now()) m.delete(key);
      const e = live(k);
      if (e) return ++e.n;
      m.set(k, { n: 1, until: Date.now() + ttl * 1000 });
      return 1;
    },
    async peek(k) { return live(k)?.n ?? 0; },
  };
}

function redisCounter(url: string, token: string): Counter {
  const r = new Redis({ url, token });
  return {
    async hit(k, ttl) {
      const n = await r.incr(k);
      if (n === 1) await r.expire(k, ttl);
      return n;
    },
    async peek(k) { return Number((await r.get<number | string>(k)) ?? 0); },
  };
}

function defaultCounter(): Counter {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? '';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? '';
  return url && token ? redisCounter(url, token) : memoryCounter();
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
    const n = count ? await c.hit(key, lim.windowSec) : await c.peek(key);
    if (n > lim.max || (!count && n >= lim.max)) {
      const retry = (window + 1) * lim.windowSec - now;
      return new Response(JSON.stringify({ error: 'rate-limited', retryAfter: retry }), {
        status: 429,
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'retry-after': String(retry), ...headers },
      });
    }
    return null;
  } catch (e) {
    console.warn('rate limit store failed; letting the request through', e);
    return null;
  }
}

/** CORS header every limited endpoint already sends, so a browser can read the 429. */
export const OPEN = { 'access-control-allow-origin': '*' } as const;

/** Wrap a handler so each request is counted against `bucket` first. */
export const withLimit = (bucket: Bucket | ((req: Request) => Bucket), handler: (req: Request) => Promise<Response>) =>
  async (req: Request): Promise<Response> =>
    (await rateLimit(req, typeof bucket === 'function' ? bucket(req) : bucket, OPEN)) ?? handler(req);
