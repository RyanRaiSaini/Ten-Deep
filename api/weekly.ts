/**
 * Weekly Challenge leaderboard.
 *   GET  /api/weekly?week=YYYY-MM-DD[&pin=K7Q2XM] → { week, total, top: Row[] (best 100), me?: Row & { rank } }
 *   POST /api/weekly { week, pin, key, name, w, l, depth, sr }   → { ok, rank, total } (one entry per PIN per week)
 * Each entry is its own private Blob whose path carries the row (see src/engine/weekly.ts), so a single listing
 * reads the whole board and two players finishing at once can't overwrite each other. `key` (a secret kept on the
 * device, the same one that owns the PIN in api/pin.ts) is stored hashed inside the entry. PINs never leave the
 * server: rows carry a name, record, depth and Squad Rating only.
 */
import { get, list, put } from '@vercel/blob';
import {
  acceptedWeeks, cleanName, entryPath, entryPrefix, isPin, isWeek, parseEntry, sortBoard, validEntry, type WeeklyEntry,
} from '../src/engine/weekly';
import { withLimit } from './_ratelimit';

export interface Store {
  /** Every entry stored under a prefix: its path and when it was written. */
  list: (prefix: string) => Promise<{ pathname: string; uploadedAt: string }[]>;
  write: (path: string, body: string) => Promise<void>;
  /** The PIN directory's owner key hash for this PIN (api/pin.ts), if the PIN is registered. */
  pinOwner: (pin: string) => Promise<string | null>;
}

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' };
const json = (body: unknown, status = 200, cache = 'no-store') => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': cache, ...CORS } });

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

type Row = Omit<WeeklyEntry, 'pin' | 'at'>;
const row = ({ name, w, l, depth, sr }: WeeklyEntry): Row => ({ name, w, l, depth, sr });

export function makeHandler(store: Store, now: () => Date = () => new Date()) {
  const board = async (week: string) => sortBoard(
    (await store.list(entryPrefix(week))).map((b) => parseEntry(b.pathname, b.uploadedAt)).filter((e): e is WeeklyEntry => !!e),
  );

  async function GET(req: Request) {
    const q = new URL(req.url).searchParams;
    const week = q.get('week') ?? '';
    if (!isWeek(week)) return json({ error: 'bad-week' }, 400);
    const pin = (q.get('pin') ?? '').toUpperCase();
    const all = await board(week);
    const i = isPin(pin) ? all.findIndex((e) => e.pin === pin) : -1;
    return json({ week, total: all.length, top: all.slice(0, 100).map(row), ...(i >= 0 ? { me: { ...row(all[i]), rank: i + 1 } } : {}) });
  }

  async function POST(req: Request) {
    let b: Record<string, unknown>;
    try { b = await req.json(); } catch { return json({ error: 'bad-json' }, 400); }
    const week = String(b.week ?? '');
    const pin = String(b.pin ?? '').toUpperCase();
    const key = b.key;
    if (!isWeek(week) || !acceptedWeeks(now()).includes(week)) return json({ error: 'bad-week' }, 400);
    if (!isPin(pin)) return json({ error: 'bad-pin' }, 400);
    if (typeof key !== 'string' || key.length < 16 || key.length > 128) return json({ error: 'bad-key' }, 400);
    const e = { pin, name: cleanName(String(b.name ?? '')), w: Number(b.w), l: Number(b.l), depth: Number(b.depth) as WeeklyEntry['depth'], sr: Number(b.sr) };
    if (!validEntry(e)) return json({ error: 'bad-entry' }, 400);
    const keyHash = await sha256(key);
    const owner = await store.pinOwner(pin);
    if (owner && owner !== keyHash) return json({ error: 'not-your-pin' }, 403);
    // One attempt per week: an entry already there stays (resending the same run is fine).
    if ((await store.list(entryPrefix(week, pin))).length === 0) {
      await store.write(entryPath(week, e), JSON.stringify({ keyHash, at: now().toISOString() }));
    }
    const all = await board(week);
    const rank = all.findIndex((x) => x.pin === pin) + 1;
    return json({ ok: true, rank, total: all.length });
  }

  return { GET, POST };
}

const blobStore: Store = {
  async list(prefix) {
    const out: { pathname: string; uploadedAt: string }[] = [];
    let cursor: string | undefined;
    // A busy week is a few thousand rows; stop at 10k so one request stays quick.
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      out.push(...page.blobs.map((x) => ({ pathname: x.pathname, uploadedAt: new Date(x.uploadedAt).toISOString() })));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor && out.length < 10_000);
    return out;
  },
  async write(path, body) {
    await put(path, body, { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json' });
  },
  async pinOwner(pin) {
    const r = await get(`pins/${pin}.json`, { access: 'private', useCache: false }).catch(() => null);
    if (!r || r.statusCode !== 200) return null;
    try { return (JSON.parse(await new Response(r.stream).text()) as { keyHash?: string }).keyHash ?? null; } catch { return null; }
  },
};

const handler = makeHandler(blobStore);
export const GET = withLimit('weeklyRead', handler.GET);
export const POST = withLimit('weeklyWrite', handler.POST);
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
