/**
 * Friend challenges: you pick a friend and a format, they accept, and your two teams face off. The record lives on
 * the server (api/duel.ts) so both of you see the same result; this file is the pure part both sides share:
 * what a challenge holds, how each side's team travels (a friend code: engine/friends/code.ts), and how the
 * face-off is settled (a seeded series, engine/friends/match.ts), so the result never depends on who settles it.
 */
import { ALL_SLOTS, type Player, type Roster, type SlotId } from '../types';
import { decodeFriend, encodeFriend, parsePin, type FriendSnapshot } from './code';
import { BEST_OF, friendLineupRoster, friendSeries, teamRoster, type BestOf, type Outcome } from './match';

/**
 * - draft: both of you draft from the same ten spins (Current Day), then your two teams play a best-of-7.
 * - clash: your card lineups, best of 3, 5 or 7.
 * - finals: your last drafted teams, best of 7 for the ring.
 */
export type ChallengeMode = 'draft' | 'clash' | 'finals';
export const CHALLENGE_MODES: ChallengeMode[] = ['draft', 'clash', 'finals'];
export type ChallengeStatus = 'open' | 'done' | 'declined' | 'expired';
/** The pool a draft duel's spins come from. */
export const DUEL_DRAFT_POOL = 'current-2026';
/** An open challenge nobody answers lapses after two weeks. */
export const CHALLENGE_TTL_MS = 14 * 24 * 3600 * 1000;

/** One side of a challenge: who, and the team they bring (a friend code holding just that team). */
export interface ChallengeSide { pin: string; name: string; avatar: string; code: string }

export interface ChallengeResult { winsA: number; winsB: number; winner: 'a' | 'b'; games: [number, number][] }

export interface Challenge {
  v: 1;
  id: string;
  /** Challenger (side a) and the friend challenged (side b), by PIN. */
  from: string;
  to: string;
  mode: ChallengeMode;
  bestOf: BestOf;
  /** Draft duels: the spins both sides draft from. Every mode: the series seed. */
  seed: string;
  created: number;
  a: ChallengeSide;
  /** Filled in when the friend accepts. */
  b?: ChallengeSide;
  status: ChallengeStatus;
  result?: ChallengeResult;
  /** When it was settled or declined. */
  done?: number;
}

const ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export const CHALLENGE_ID = /^[a-hj-km-np-z2-9]{10}$/;
export const SEED = /^[a-z0-9-]{4,48}$/;

export function newChallengeId(random: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 10; i++) s += ID_ALPHABET[Math.floor(random() * ID_ALPHABET.length)];
  return s;
}

/** Series length for a format: Clash picks 3, 5 or 7; the draft duel and the Finals are always best of 7. */
export const bestOfFor = (mode: ChallengeMode, n: number): BestOf =>
  mode === 'clash' && (BEST_OF as readonly number[]).includes(n) ? (n as BestOf) : 7;

/** A side's friend code: just the team it brings (a lineup for Clash, ten players otherwise). */
export function sideCode(s: { pin: string; name: string; avatar: string }, team: { lineup?: FriendSnapshot['lineup']; players?: Partial<Record<SlotId, Player>> }): string {
  return encodeFriend({
    pin: s.pin, name: s.name, avatar: s.avatar,
    stats: { drafts: 0, titles: 0, streak: 0, cards: 0, tier: 0 },
    lineup: team.lineup ?? {}, showcase: [],
    team: team.players ? { mode: 'duel', w: 0, l: 0, result: '', players: team.players } : null,
  });
}

/** Does this side bring what the format needs? (Clash: a card lineup; the others: a full team of ten.) */
export function sideFits(mode: ChallengeMode, code: string, pin?: string): FriendSnapshot | null {
  const snap = decodeFriend(code);
  if (!snap || (pin && snap.pin !== pin)) return null;
  if (mode === 'clash') return Object.keys(snap.lineup).length > 0 ? snap : null;
  const players = snap.team?.players ?? {};
  return ALL_SLOTS.every((k) => players[k]) ? snap : null;
}

/** The roster a side plays with. */
export function sideRoster(mode: ChallengeMode, side: ChallengeSide, colors: [string, string]): Roster | null {
  const snap = sideFits(mode, side.code);
  if (!snap) return null;
  if (mode === 'clash') return { ...friendLineupRoster(snap, colors), name: side.name };
  return teamRoster(snap.team!.players, `duel-${side.pin}`, side.name, colors);
}

export const SIDE_COLORS: Record<'a' | 'b', [string, string]> = { a: ['#FF7417', '#0B0F17'], b: ['#6AA8FF', '#0B0F17'] };

/** Settle the face-off: the challenger's team (a) against the friend's (b), a seeded series. */
export function settle(ch: Challenge, b: ChallengeSide, now: number): Challenge {
  const ra = sideRoster(ch.mode, ch.a, SIDE_COLORS.a);
  const rb = sideRoster(ch.mode, b, SIDE_COLORS.b);
  if (!ra || !rb) throw new Error('A side is missing its team');
  const s = friendSeries(ra, rb, ch.bestOf, `${ch.id}:${ch.seed}`);
  return {
    ...ch, b, status: 'done', done: now,
    result: { winsA: s.winsA, winsB: s.winsB, winner: s.winner, games: s.games.map((g) => [g.scoreA, g.scoreB]) },
  };
}

/** Open past its two weeks: shown (and treated) as expired. */
export const statusOf = (ch: Challenge, now: number): ChallengeStatus =>
  ch.status === 'open' && now - ch.created > CHALLENGE_TTL_MS ? 'expired' : ch.status;

/** Which side `pin` is on, or null if it isn't theirs. */
export const sideOf = (ch: Challenge, pin: string): 'a' | 'b' | null => (ch.from === pin ? 'a' : ch.to === pin ? 'b' : null);

/** The result for `pin`: a win, a loss, or null while it isn't settled. */
export function outcomeFor(ch: Challenge, pin: string): Outcome | null {
  const side = sideOf(ch, pin);
  if (!side || ch.status !== 'done' || !ch.result) return null;
  return ch.result.winner === side ? 'w' : 'l';
}

/** "4-2" from `pin`'s side. */
export function scoreFor(ch: Challenge, pin: string): string {
  if (!ch.result) return '';
  const mine = sideOf(ch, pin) === 'b' ? ch.result.winsB : ch.result.winsA;
  const theirs = sideOf(ch, pin) === 'b' ? ch.result.winsA : ch.result.winsB;
  return `${mine}-${theirs}`;
}

/** The other person in the challenge. */
export const opponentOf = (ch: Challenge, pin: string) => (ch.from === pin ? { pin: ch.to, name: ch.b?.name ?? null } : { pin: ch.from, name: ch.a.name });

/** Validate a challenge record that came over the wire (anything malformed is dropped). */
export function parseChallenge(x: unknown): Challenge | null {
  const c = x as Partial<Challenge> | null;
  if (!c || typeof c !== 'object' || c.v !== 1) return null;
  if (typeof c.id !== 'string' || !CHALLENGE_ID.test(c.id)) return null;
  if (!parsePin(String(c.from)) || !parsePin(String(c.to)) || c.from === c.to) return null;
  if (!CHALLENGE_MODES.includes(c.mode as ChallengeMode) || !(BEST_OF as readonly number[]).includes(Number(c.bestOf))) return null;
  if (typeof c.seed !== 'string' || !SEED.test(c.seed) || typeof c.created !== 'number') return null;
  if (!['open', 'done', 'declined', 'expired'].includes(String(c.status))) return null;
  const side = (s: unknown): s is ChallengeSide => !!s && typeof s === 'object' && typeof (s as ChallengeSide).code === 'string'
    && typeof (s as ChallengeSide).name === 'string' && typeof (s as ChallengeSide).pin === 'string';
  if (!side(c.a) || (c.b !== undefined && !side(c.b))) return null;
  return c as Challenge;
}
