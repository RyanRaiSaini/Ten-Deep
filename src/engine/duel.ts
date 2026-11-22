/**
 * Head-to-head draft: two players, one shared spin per round, snake order, separate caps,
 * no player on both rosters. Pass-and-play today; the same state drives online duels later.
 */
import {
  affordableSlots, fallbackPick, isComplete, options, pick, pickFallback, startDraft, type DraftOption, type DraftState,
} from './draft';
import { createRng } from './rng';
import type { Pool, Roster, RosterSlots, SlotId, TeamSeason } from './types';

export type Side = 'a' | 'b';

export interface DuelState {
  seed: string;
  round: number;
  turn: Side;
  picksThisRound: number;
  spin: TeamSeason | null;
  a: DraftState;
  b: DraftState;
}

const other = (s: Side): Side => (s === 'a' ? 'b' : 'a');
/** Snake: A opens odd rounds (1, 3, ...), B opens even rounds. */
const firstOf = (round: number): Side => (round % 2 === 0 ? 'a' : 'b');
const taken = (s: DuelState) => [...new Set([...s.a.used, ...s.b.used])];

function land(pool: Pool, seed: string, round: number, used: string[]): TeamSeason | null {
  const cands = pool.teams.filter((t) => t.players.some((p) => !used.includes(p.id)));
  return cands.length ? createRng(`${seed}:duel-spin:${round}`).pick(cands) : null;
}

export function startDuel(pool: Pool, seed: string): DuelState {
  return {
    seed, round: 0, turn: 'a', picksThisRound: 0,
    spin: land(pool, seed, 0, []),
    a: startDraft(pool, `${seed}:a`),
    b: startDraft(pool, `${seed}:b`),
  };
}

export const isDuelComplete = (s: DuelState) => isComplete(s.a) && isComplete(s.b);

/** The current player's draft, seeing the shared spin and everything either player has taken. */
function view(s: DuelState): DraftState {
  return { ...s[s.turn], used: taken(s), spin: s.spin };
}

export function duelOptions(s: DuelState, pool: Pool): DraftOption[] {
  return s.spin ? options(view(s), pool) : [];
}

function advance(s: DuelState, me: DraftState, pool: Pool): DuelState {
  const next: DuelState = { ...s, [s.turn]: { ...me, spin: null } };
  if (s.picksThisRound === 0) return { ...next, turn: other(s.turn), picksThisRound: 1 };
  const round = s.round + 1;
  const done = isComplete(next.a) && isComplete(next.b);
  return { ...next, round, turn: firstOf(round), picksThisRound: 0, spin: done ? null : land(pool, s.seed, round, taken(next)) };
}

export function duelPick(s: DuelState, playerId: string, slot: SlotId, pool: Pool): DuelState {
  return advance(s, pick(view(s), playerId, slot, pool), pool);
}

/** Nothing on the spin fits: sign the cheapest eligible player left in the pool. */
export function duelFallback(s: DuelState, pool: Pool): DuelState {
  const v = view(s);
  const p = fallbackPick(v, pool);
  return advance(s, pickFallback(v, p, affordableSlots(v, p, pool)[0], pool), pool);
}

export function rosterOf(d: DraftState, name: string, colors: [string, string] = ['#E8833A', '#3DF2C2']): Roster {
  return { id: name, name, colors, slots: d.roster as Required<RosterSlots> };
}
