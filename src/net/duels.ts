/**
 * Friend challenges over the network (api/duel.ts): send one, answer one, and check in for news. Everything the
 * server sends back goes into store/challenges.ts; settled results go into both friends' head-to-head records.
 */
import { CONFIG } from '../config';
import { cardLevel } from '../engine/collect/lineup';
import { decodeFriend, encodeFriend } from '../engine/friends/code';
import {
  outcomeFor, parseChallenge, scoreFor, sideCode, sideOf, type Challenge, type ChallengeMode,
} from '../engine/friends/challenge';
import type { FriendMode } from '../engine/friends/match';
import { ALL_SLOTS, type Player, type SlotId } from '../engine/types';
import { allChallenges, useChallenges } from '../store/challenges';
import { useCollection } from '../store/collection';
import { mySnapshot, useFriends } from '../store/friends';
import { useProfile } from '../store/profile';
import { publishMe } from './pins';

// Same origin on the web (so local builds never touch the live server); the live site from the apps.
const URL_ = typeof document !== 'undefined' ? '/api/duel' : `${CONFIG.webUrl}/api/duel`;

export type Fail = 'offline' | 'not-found' | 'no-friend' | 'bad-team' | 'expired' | 'rate-limited' | 'error';
export type Res<T> = { ok: true; data: T } | { ok: false; reason: Fail };

async function post<T>(body: Record<string, unknown>, retried = false): Promise<Res<T>> {
  const { pin, key } = useFriends.getState();
  let r: Response;
  try {
    r = await fetch(URL_, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, pin, key }) });
  } catch {
    return { ok: false, reason: 'offline' };
  }
  // Your PIN isn't online yet (or moved): publish it, then try once more.
  if (r.status === 403 && !retried) {
    await publishMe(true);
    return post(body, true);
  }
  const data = await r.json().catch(() => null);
  if (r.status === 429) return { ok: false, reason: 'rate-limited' };
  if (r.status === 410) return { ok: false, reason: 'expired' };
  if (!r.ok || !data) {
    const e = String(data?.error ?? '');
    return { ok: false, reason: e === 'no-friend' ? 'no-friend' : e === 'bad-team' ? 'bad-team' : r.status === 404 ? 'not-found' : r.status >= 500 || !data ? 'offline' : 'error' };
  }
  return { ok: true, data: data as T };
}

const me = () => {
  const p = useProfile.getState();
  return { pin: useFriends.getState().pin, name: p.name || 'Coach', avatar: p.avatarId };
};

/** Your card lineup with each card's level, as a challenge side. */
function myLineup() {
  const col = useCollection.getState();
  const lineup: Partial<Record<SlotId, { id: string; lv: number }>> = {};
  for (const k of ALL_SLOTS) { const id = col.lineup[k]; if (id) lineup[k] = { id, lv: cardLevel(col.owned[id]?.count ?? 1) }; }
  return lineup;
}

/** What you'd bring to a format, or why you can't yet. */
export function mySide(mode: ChallengeMode, drafted?: Partial<Record<SlotId, Player>>): { code: string } | { missing: 'lineup' | 'team' | 'draft' } {
  if (mode === 'clash') {
    const lineup = myLineup();
    return Object.keys(lineup).length ? { code: sideCode(me(), { lineup }) } : { missing: 'lineup' };
  }
  if (mode === 'finals') {
    const t = useFriends.getState().lastTeam;
    return t && ALL_SLOTS.every((k) => t.players[k]) ? { code: sideCode(me(), { players: t.players }) } : { missing: 'team' };
  }
  return drafted && ALL_SLOTS.every((k) => drafted[k]) ? { code: sideCode(me(), { players: drafted }) } : { missing: 'draft' };
}

const FRIEND_MODE: Record<ChallengeMode, FriendMode> = { draft: 'draft', clash: 'clash', finals: 'finals' };

/** Make sure the other person is on your friends list (from their friend code if we have it). */
function befriend(pin: string, code?: string) {
  const f = useFriends.getState();
  if (pin === f.pin || f.friends.some((x) => x.pin === pin)) return;
  const snap = code ? decodeFriend(code) : null;
  if (snap && snap.pin === pin) f.add(snap);
}

/** Store what came back, and put every newly settled result into the head-to-head record (once). */
function absorb(cs: Challenge[]) {
  const myPin = useFriends.getState().pin;
  useChallenges.getState().put(cs);
  const counted = new Set(useChallenges.getState().counted);
  const fresh: string[] = [];
  for (const c of cs) {
    const out = outcomeFor(c, myPin);
    if (!out || counted.has(c.id)) continue;
    const side = sideOf(c, myPin)!;
    const them = side === 'a' ? c.b! : c.a;
    befriend(them.pin, them.code);
    useFriends.getState().result(them.pin, FRIEND_MODE[c.mode], out, scoreFor(c, myPin));
    fresh.push(c.id);
  }
  if (fresh.length) useChallenges.setState((s) => ({ counted: [...s.counted, ...fresh].slice(-400) }));
}

let syncing: Promise<boolean> | null = null;
/** Check in: new challenges, results of the ones you sent, and friends who added you. */
export function syncDuels(): Promise<boolean> {
  if (syncing) return syncing;
  syncing = (async () => {
    try {
      const myPin = useFriends.getState().pin;
      const mine = allChallenges(useChallenges.getState().byId);
      const waiting = mine.filter((c) => c.from === myPin && c.status === 'open').map((c) => c.id);
      // Settled ones never change: the server needn't read them again.
      const final = mine.filter((c) => c.status === 'done' || c.status === 'declined').map((c) => c.id);
      const r = await post<{ challenges: unknown[]; mail: { t: string; from: string; at: number; card: string }[] }>({ op: 'sync', ids: waiting, final });
      if (!r.ok) return false;
      const seen = new Set(useChallenges.getState().seenMail);
      const handled: string[] = [];
      for (const m of r.data.mail ?? []) {
        const k = `${m.from}:${m.at}`;
        if (seen.has(k)) continue;
        befriend(m.from, m.card);
        handled.push(k);
      }
      if (handled.length) useChallenges.setState((s) => ({ seenMail: [...s.seenMail, ...handled].slice(-300) }));
      absorb((r.data.challenges ?? []).map(parseChallenge).filter((c): c is Challenge => !!c));
      useChallenges.setState({ lastSync: Date.now() });
      return true;
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}

/** Load one challenge by id (a challenge link opened on this device): only works if it's yours. */
export async function fetchChallenge(id: string): Promise<Res<Challenge>> {
  const r = await post<{ challenges: unknown[] }>({ op: 'sync', ids: [id] });
  if (!r.ok) return r;
  const c = (r.data.challenges ?? []).map(parseChallenge).find((x) => x?.id === id);
  if (!c) return { ok: false, reason: 'not-found' };
  absorb([c]);
  return { ok: true, data: c };
}

const myCard = () => encodeFriend(mySnapshot());

/** Challenge a friend. `side` is the team you bring (see mySide). */
export async function sendChallenge(to: string, mode: ChallengeMode, bestOf: number, side: string, seed: string): Promise<Res<Challenge>> {
  const r = await post<{ challenge: unknown }>({ op: 'send', to, mode, bestOf, seed, side, card: myCard() });
  if (!r.ok) return r;
  const c = parseChallenge(r.data.challenge);
  if (!c) return { ok: false, reason: 'error' };
  absorb([c]);
  return { ok: true, data: c };
}

/** Accept with the team you bring (the face-off is settled on the spot), or decline. */
export async function answerChallenge(id: string, accept: boolean, side?: string): Promise<Res<Challenge>> {
  const r = await post<{ challenge: unknown }>(accept ? { op: 'accept', id, side, card: myCard() } : { op: 'decline', id });
  if (!r.ok) return r;
  const c = parseChallenge(r.data.challenge);
  if (!c) return { ok: false, reason: 'error' };
  absorb([c]);
  return { ok: true, data: c };
}

/** Tell someone you added them, so they get you as a friend too (quiet if it can't get through). */
export async function sayHello(to: string): Promise<void> {
  await post({ op: 'hello', to, card: myCard() }).catch(() => undefined);
}

/** A fresh seed for a draft duel's spins. */
export const duelSeed = () => `duel-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;

/** The link that opens a challenge (a fallback when they haven't opened the app since you sent it). */
export const challengeLink = (id: string) => `${CONFIG.webUrl}/vs/${id}`;
