/**
 * Live Party rooms (Upstash Redis via the Vercel Marketplace). The server stores only the room and each
 * player's own picks with server timestamps; src/engine/party.ts derives everything else, here and on phones.
 *
 *   GET  /api/party?code=ABCDE                                   → { now, meta, members }
 *   POST /api/party { op: 'create', pin, key, name, avatar }      → { code }
 *   POST /api/party { op: 'join' | 'leave' | 'start', code, pin, key, name?, avatar? }
 *   POST /api/party { op: 'pick', code, pin, key, r, pid, slot }  → 409 { error: 'taken' } if someone beat you to him
 *
 * `key` is the device secret from the friends store: it proves you are the PIN you claim to be in this room.
 * Every key expires 3 hours after the room was last touched.
 */
import { get } from '@vercel/blob';
import { Redis } from '@upstash/redis';
import type { Store } from './_memstore';
import { runtimeStore, sharedCache } from './_runtimestore';
import { OPEN, rateLimit } from './_ratelimit';
import { autoPick } from '../src/engine/party';
import { MODE_BY_ID } from '../src/data/modes';
import { affordableSlots, fallbackPick, options } from '../src/engine/draft';
import { cleanDeltas, formPool } from '../src/engine/form';
import { PARTY_MAX, newRoomCode, parseFlex, parseRoomCode, resolve, seatOf, seatState, type PartyMember, type PartyMeta } from '../src/engine/party';
import type { SlotId } from '../src/engine/types';

const TTL = 3 * 3600;
const PIN = /^[A-HJKMNP-Z2-9]{6}$/;
const SLOTS = ['PG', 'SG', 'SF', 'PF', 'C', 'B1', 'B2', 'B3', 'B4', 'B5'];

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? '';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? '';
/** Upstash Redis when it's connected to the project; otherwise Vercel's Runtime Cache; elsewhere unavailable. */
let storeName: 'redis' | 'runtime-cache' | 'memory' | 'none' = REDIS_URL && REDIS_TOKEN ? 'redis' : process.env.VERCEL ? 'runtime-cache' : 'none';
let configured = storeName !== 'none';
let redis: Store = (storeName === 'redis' ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : storeName === 'runtime-cache' ? runtimeStore() : null) as unknown as Store;
/** Local end-to-end tests swap in an in-memory store. */
export const useStore = (s: Store) => { redis = s; configured = true; storeName = 'memory'; };

type StoredMember = PartyMember & { keyHash: string };
const K = {
  meta: (c: string) => `party:${c}:meta`,
  set: (c: string) => `party:${c}:members`,
  m: (c: string, pin: string) => `party:${c}:m:${pin}`,
  claim: (c: string, pid: string) => `party:${c}:claim:${pid}`,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' } });

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function load(code: string): Promise<{ meta: PartyMeta; members: StoredMember[] } | null> {
  const [meta, pins] = await Promise.all([redis.get<PartyMeta>(K.meta(code)), redis.smembers(K.set(code))]);
  if (!meta) return null;
  const members = pins.length ? (await redis.mget<StoredMember[]>(...pins.map((p) => K.m(code, p)))).filter(Boolean) : [];
  return { meta, members };
}
const strip = (m: StoredMember): PartyMember => ({ pin: m.pin, name: m.name, avatar: m.avatar, joined: m.joined, picks: m.picks, ...(m.flex ? { flex: m.flex } : {}) });
const touch = (code: string, pins: string[]) => Promise.all([K.meta(code), K.set(code), ...pins.map((p) => K.m(code, p))].map((k) => redis.expire(k, TTL)));

/** Today's form, frozen into the room so every device rates players the same way. */
async function todaysForm(): Promise<Record<string, number>> {
  try {
    const r = await get('form/latest.json', { access: 'private' });
    if (!r || r.statusCode !== 200) return {};
    const latest = JSON.parse(await new Response(r.stream).text()) as { model?: number; deltas?: Record<string, { d: number }> };
    // Older form counted owner-rated players' whole season (it would stack on their owner-set rating).
    return Object.fromEntries(Object.entries(cleanDeltas(latest.deltas ?? {}, latest.model)).map(([k, v]) => [k, v.d]));
  } catch {
    return {};
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' } });
}

export async function GET(req: Request) {
  if (!configured) return json({ error: 'unavailable' }, 503);
  if (new URL(req.url).searchParams.get('selftest') === '1') return (await rateLimit(req, 'selftest', OPEN)) ?? json(await selfTest());
  const code = parseRoomCode(new URL(req.url).searchParams.get('code') ?? '');
  if (!code) return json({ error: 'bad-code' }, 400);
  const room = await load(code);
  if (!room) return json({ error: 'not-found' }, 404);
  // After the first load the phone already has the room's frozen form table: skip it (it's most of the payload).
  const { form, ...rest } = room.meta;
  const meta = new URL(req.url).searchParams.get('lite') === '1' ? rest : { ...rest, form };
  return json({ now: Date.now(), meta, members: room.members.map(strip) });
}

export async function POST(req: Request) {
  if (!configured) return json({ error: 'unavailable' }, 503);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: 'bad-json' }, 400); }
  const limited = await rateLimit(req, b.op === 'create' ? 'partyCreate' : 'partyWrite', OPEN);
  if (limited) return limited;
  return handle(b);
}

async function handle(b: Record<string, unknown>) {
  const pin = String(b.pin ?? '');
  const key = String(b.key ?? '');
  if (!PIN.test(pin) || key.length < 16 || key.length > 128) return json({ error: 'bad-identity' }, 400);
  const keyHash = await sha256(key);
  const name = String(b.name ?? 'Coach').slice(0, 18).trim() || 'Coach';
  const avatar = String(b.avatar ?? 'captain').slice(0, 40);
  // Their rarest pull for the seat; anything that isn't a real card + finish is dropped.
  const flexed = parseFlex(b.flex);
  const flex = flexed ? `${flexed.id}:${flexed.finish}` : undefined;
  const now = Date.now();

  if (b.op === 'create') {
    let code = '';
    for (let i = 0; i < 6 && !code; i++) {
      const c = newRoomCode();
      if (await redis.set(K.meta(c), { code: c, host: pin, seed: `party-${c}-${now.toString(36)}`, poolId: 'current-2026', created: now, form: await todaysForm() }, { nx: true, ex: TTL })) code = c;
    }
    if (!code) return json({ error: 'busy' }, 503);
    await redis.set(K.m(code, pin), { pin, name, avatar, joined: now, picks: [], keyHash, ...(flex ? { flex } : {}) } satisfies StoredMember, { ex: TTL });
    await redis.sadd(K.set(code), pin);
    await redis.expire(K.set(code), TTL);
    return json({ code });
  }

  const code = parseRoomCode(String(b.code ?? ''));
  if (!code) return json({ error: 'bad-code' }, 400);
  const room = await load(code);
  if (!room) return json({ error: 'not-found' }, 404);
  const { meta, members } = room;
  const me = members.find((m) => m.pin === pin);
  if (me && me.keyHash !== keyHash) return json({ error: 'not-you' }, 403);

  switch (b.op) {
    case 'join': {
      if (me) return json({ ok: true });
      if (meta.started) return json({ error: 'started' }, 409);
      if (members.length >= PARTY_MAX) return json({ error: 'full' }, 409);
      await redis.set(K.m(code, pin), { pin, name, avatar, joined: now, picks: [], keyHash, ...(flex ? { flex } : {}) } satisfies StoredMember, { ex: TTL });
      await redis.sadd(K.set(code), pin);
      await touch(code, members.map((m) => m.pin).concat(pin));
      return json({ ok: true });
    }
    case 'leave': {
      if (!me || meta.started) return json({ ok: true });
      await redis.srem(K.set(code), pin);
      await redis.del(K.m(code, pin));
      return json({ ok: true });
    }
    case 'start': {
      if (meta.host !== pin || !me) return json({ error: 'not-host' }, 403);
      if (meta.started) return json({ ok: true });
      if (members.length < 2) return json({ error: 'need-two' }, 409);
      await redis.set(K.meta(code), { ...meta, started: now + 3000 }, { ex: TTL });
      await touch(code, members.map((m) => m.pin));
      return json({ ok: true });
    }
    case 'pick': {
      if (!me) return json({ error: 'not-in-room' }, 403);
      const r = Number(b.r);
      const pid = String(b.pid ?? '');
      const slot = String(b.slot ?? '') as SlotId;
      if (!SLOTS.includes(slot)) return json({ error: 'bad-slot' }, 400);
      const mode = MODE_BY_ID[meta.poolId];
      if (!mode) return json({ error: 'bad-pool' }, 400);
      const pool = formPool(mode.pool, meta.form ?? {});
      const state = resolve(meta, members.map(strip), pool, now);
      if (state.phase !== 'draft' || state.round !== r) return json({ error: 'round-closed' }, 409);
      const seat = seatOf(members, pin);
      if (state.picked[seat]) return json({ error: 'already-picked' }, 409);
      const st = seatState(pool, seat, state.rosters, state.taken, state.spin, meta.seed);
      let player = state.spin?.players.find((p) => p.id === pid);
      // Nothing on the spin fits under your cap: the cheapest fallback signing is allowed instead.
      if (!player && !options(st, pool).some((o) => o.affordable)) {
        const fb = fallbackPick(st, pool);
        if (fb.id === pid) player = fb;
      }
      if (!player) return json({ error: 'not-in-spin', spin: state.spin?.id ?? null }, 409);
      if (state.taken.has(pid)) return json({ error: 'taken' }, 409);
      if (!affordableSlots(st, player, pool).includes(slot)) return json({ error: 'not-allowed' }, 409);
      // Who got this player in this round (for "X grabbed him first").
      const winner = (ms: StoredMember[]) => ms.find((m) => m.pin !== pin && m.picks.some((x) => x.r === r && x.pid === pid))?.name;
      // Atomic claim: two simultaneous picks of the same player can't both win.
      if (!(await redis.set(K.claim(code, pid), pin, { nx: true, ex: TTL }))) return json({ error: 'claimed', by: winner(members) ?? null }, 409);
      await redis.set(K.m(code, pin), { ...me, picks: [...me.picks, { r, pid, slot, t: now }] } satisfies StoredMember, { ex: TTL });
      // Without a true atomic store (runtime cache) two claims can both land: re-read and let the timestamps decide,
      // so the loser hears it now and picks again, instead of finding out when the round ends.
      const after = await load(code);
      if (after) {
        const settled = resolve(meta, after.members.map(strip), pool, Date.now());
        if (settled.phase === 'draft' && settled.round === r && !settled.picked[seatOf(after.members, pin)]) {
          return json({ error: 'claimed', by: winner(after.members) ?? null }, 409);
        }
      }
      return json({ ok: true, t: now });
    }
    default:
      return json({ error: 'bad-op' }, 400);
  }
}

/**
 * Live self-test on the real storage: two simulated players create and join a room, start, and draft the first
 * two rounds through this same API; reports every step. Rooms it makes expire like any other.
 */
async function selfTest() {
  const steps: { step: string; ok: boolean; detail?: unknown }[] = [];
  const hex = () => Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => b.toString(16).padStart(2, '0')).join('');
  const pinOf = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[b % 31]).join('');
  const players = [{ pin: pinOf(), key: hex(), name: 'Test A' }, { pin: pinOf(), key: hex(), name: 'Test B' }];
  const post = async (body: Record<string, unknown>) => {
    const r = await handle(body);
    return { status: r.status, body: await r.json() };
  };
  const t0 = Date.now();
  const created = await post({ op: 'create', ...players[0], avatar: 'captain' });
  const code = created.body.code as string;
  steps.push({ step: 'create', ok: created.status === 200 && !!code, detail: created.body });
  const joined = await post({ op: 'join', code, ...players[1], avatar: 'ace' });
  steps.push({ step: 'join', ok: joined.status === 200, detail: joined.body });
  let room = await load(code);
  steps.push({ step: 'both in room', ok: room?.members.length === 2, detail: room?.members.map((m) => m.name) });
  const started = await post({ op: 'start', code, ...players[0] });
  steps.push({ step: 'start', ok: started.status === 200, detail: started.body });
  await new Promise((ok) => setTimeout(ok, 3300)); // the draft opens 3 s after start
  for (let r = 0; r < 2; r++) {
    for (const p of players) {
      room = await load(code);
      const pool = formPool(MODE_BY_ID[room!.meta.poolId].pool, room!.meta.form ?? {});
      const state = resolve(room!.meta, room!.members.map(strip), pool, Date.now());
      const seat = seatOf(room!.members, p.pin);
      const { player, slot } = autoPick(seatState(pool, seat, state.rosters, state.taken, state.spin, room!.meta.seed), pool);
      const res = await post({ op: 'pick', code, ...p, r: state.round, pid: player.id, slot });
      steps.push({ step: `round ${r + 1} pick ${p.name}`, ok: res.status === 200, detail: `${player.name} → ${slot} (${res.status})` });
    }
    await new Promise((ok) => setTimeout(ok, 3700)); // next spin lands
  }
  room = await load(code);
  const pool = formPool(MODE_BY_ID[room!.meta.poolId].pool, room!.meta.form ?? {});
  const final = resolve(room!.meta, room!.members.map(strip), pool, Date.now());
  steps.push({ step: 'two rounds resolved for both', ok: final.round === 2 && final.rosters.every((x) => Object.keys(x).length === 2), detail: { round: final.round, rosters: final.rosters.map((x) => Object.values(x).map((p) => p!.name)) } });
  return { store: storeName, sharedCache: storeName === 'runtime-cache' ? sharedCache() : null, ms: Date.now() - t0, ok: steps.every((s) => s.ok), code, steps };
}
