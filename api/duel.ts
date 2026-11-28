/**
 * Friend challenges and friend requests (src/engine/friends/challenge.ts has the shared rules).
 *   POST /api/duel { op, pin, key, ... }   `key` is the device secret that published `pin` (api/pin.ts): it proves
 *                                          who is asking, so nobody can answer or read someone else's challenges.
 *   op 'send'    { to, mode, bestOf, seed, side, card } → challenge `to`; it lands in their mailbox
 *   op 'accept'  { id, side }   → the friend brings their team; the server settles the face-off once, for both
 *   op 'decline' { id }
 *   op 'sync'    { ids?, final? } → your mailbox (challenges for you, friend requests) plus the challenges you sent
 *                                 (`ids`), skipping the ones you already have settled (`final`)
 *   op 'hello'   { to, card }   → "I added you": they get you as a friend too
 * Stored privately in Vercel Blob: duels/c/<id>.json (the challenge) and duels/m/<pin>.json (a player's mailbox).
 */
import { decodeFriend, parsePin } from '../src/engine/friends/code';
import {
  CHALLENGE_ID, CHALLENGE_MODES, SEED, bestOfFor, newChallengeId, parseChallenge, settle, sideFits, sideOf, statusOf,
  type Challenge, type ChallengeMode,
} from '../src/engine/friends/challenge';
import { jsonStore, ownsPin, readPin } from './_jsonstore';
import { rateLimit } from './_ratelimit';

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS } });

/** Mailbox entries, newest last. A friend request carries the sender's friend code. */
export type MailItem = { t: 'duel'; id: string; from: string; at: number; card?: string } | { t: 'friend'; from: string; at: number; card: string };
interface Mailbox { items: MailItem[] }
const MAIL_MAX = 40;
const BODY_MAX = 16_000;
const FRIEND_CODE = /^TD1[A-Za-z0-9_-]{8,5997}$/;

const challengePath = (id: string) => `duels/c/${id}.json`;
const mailPath = (pin: string) => `duels/m/${pin}.json`;
const readChallenge = async (id: string) => parseChallenge(await jsonStore().read(challengePath(id)));
const writeChallenge = (c: Challenge) => jsonStore().write(challengePath(c.id), c);

async function deliver(to: string, item: MailItem) {
  const box = (await jsonStore().read<Mailbox>(mailPath(to))) ?? { items: [] };
  // One friend request per sender is enough: a newer one replaces the old.
  const items = box.items.filter((x) => !(item.t === 'friend' && x.t === 'friend' && x.from === item.from));
  await jsonStore().write(mailPath(to), { items: [...items, item].slice(-MAIL_MAX) });
}

/** A friend code that really is this sender's (their name and avatar come from it). */
const cardOf = (card: unknown, pin: string) => (typeof card === 'string' && FRIEND_CODE.test(card) && decodeFriend(card)?.pin === pin ? card : null);
const nameOf = (code: string) => decodeFriend(code)?.name ?? 'Friend';
const avatarOf = (code: string) => decodeFriend(code)?.avatar ?? '';

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

type Body = Record<string, unknown>;

export async function POST(req: Request) {
  let body: Body;
  try {
    const text = await req.text();
    if (text.length > BODY_MAX) return json({ error: 'too-big' }, 413);
    body = JSON.parse(text);
  } catch { return json({ error: 'bad-json' }, 400); }
  if (!body || typeof body !== 'object') return json({ error: 'bad-json' }, 400);
  const op = String(body.op ?? '');
  const limited = await rateLimit(req, op === 'sync' ? 'duelRead' : 'duelWrite', CORS);
  if (limited) return limited;
  const pin = parsePin(String(body.pin ?? ''));
  if (!pin || String(body.pin) !== pin) return json({ error: 'bad-pin' }, 400);
  if (!(await ownsPin(pin, body.key))) return json({ error: 'not-yours' }, 403);
  const now = Date.now();

  switch (op) {
    case 'send': {
      const to = parsePin(String(body.to ?? ''));
      if (!to || to === pin) return json({ error: 'bad-friend' }, 400);
      if (!(await readPin(to))) return json({ error: 'no-friend' }, 404);
      const mode = String(body.mode) as ChallengeMode;
      if (!CHALLENGE_MODES.includes(mode)) return json({ error: 'bad-mode' }, 400);
      const seed = String(body.seed ?? '');
      if (!SEED.test(seed)) return json({ error: 'bad-seed' }, 400);
      const side = String(body.side ?? '');
      if (side.length > 6000 || !sideFits(mode, side, pin)) return json({ error: 'bad-team' }, 400);
      const card = cardOf(body.card, pin) ?? undefined;
      const c: Challenge = {
        v: 1, id: newChallengeId(), from: pin, to, mode, bestOf: bestOfFor(mode, Number(body.bestOf)), seed, created: now,
        a: { pin, name: nameOf(card ?? side), avatar: avatarOf(card ?? side), code: side }, status: 'open',
      };
      await writeChallenge(c);
      await deliver(to, { t: 'duel', id: c.id, from: pin, at: now, ...(card ? { card } : {}) });
      return json({ challenge: c });
    }
    case 'accept':
    case 'decline': {
      const id = String(body.id ?? '');
      if (!CHALLENGE_ID.test(id)) return json({ error: 'bad-id' }, 400);
      const c = await readChallenge(id);
      if (!c || c.to !== pin) return json({ error: 'not-found' }, 404);
      // Already answered (a second tap, or the other device): hand back what happened.
      if (statusOf(c, now) !== 'open') return json({ challenge: { ...c, status: statusOf(c, now) } }, c.status === 'open' ? 410 : 200);
      if (op === 'decline') {
        const d: Challenge = { ...c, status: 'declined', done: now };
        await writeChallenge(d);
        return json({ challenge: d });
      }
      const side = String(body.side ?? '');
      if (side.length > 6000 || !sideFits(c.mode, side, pin)) return json({ error: 'bad-team' }, 400);
      const card = cardOf(body.card, pin);
      const done = settle(c, { pin, name: nameOf(card ?? side), avatar: avatarOf(card ?? side), code: side }, now);
      await writeChallenge(done);
      return json({ challenge: done });
    }
    case 'sync': {
      const box = (await jsonStore().read<Mailbox>(mailPath(pin))) ?? { items: [] };
      const asked = Array.isArray(body.ids) ? body.ids.map(String).filter((x) => CHALLENGE_ID.test(x)).slice(0, 30) : [];
      // Challenges the caller already has settled never change again: don't read them back.
      const settled = new Set(Array.isArray(body.final) ? body.final.map(String).slice(0, 100) : []);
      const ids = [...new Set([...box.items.filter((x) => x.t === 'duel').map((x) => (x as { id: string }).id), ...asked])]
        .filter((x) => !settled.has(x)).slice(-50);
      const found = await Promise.all(ids.map(readChallenge));
      // Only challenges you're part of, with lapsed ones marked.
      const challenges = found.filter((c): c is Challenge => !!c && sideOf(c, pin) !== null).map((c) => ({ ...c, status: statusOf(c, now) }));
      const cards = box.items.filter((x) => x.card).map((x) => ({ t: x.t, from: x.from, at: x.at, card: x.card! }));
      return json({ challenges, mail: cards });
    }
    case 'hello': {
      const to = parsePin(String(body.to ?? ''));
      if (!to || to === pin) return json({ error: 'bad-friend' }, 400);
      const card = cardOf(body.card, pin);
      if (!card) return json({ error: 'bad-card' }, 400);
      if (!(await readPin(to))) return json({ error: 'no-friend' }, 404);
      await deliver(to, { t: 'friend', from: pin, at: now, card });
      return json({ ok: true });
    }
    default:
      return json({ error: 'bad-op' }, 400);
  }
}
