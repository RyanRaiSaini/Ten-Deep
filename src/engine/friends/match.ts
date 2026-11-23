/** Friend duels, simulated locally from a friend's snapshot. Seeded, so a result can be replayed. */
import { lineupRoster } from '../collect/lineup';
import { createRng } from '../rng';
import { bestOf, type SeriesResult } from '../series';
import { ALL_SLOTS, STARTER_SLOTS, type Player, type Pos, type Roster, type RosterSlots, type SlotId } from '../types';
import type { FriendSnapshot } from './code';

export type FriendMode = 'clash' | 'finals' | 'race' | 'party';
export type Outcome = 'w' | 'l' | 'd';
export const BEST_OF = [3, 5, 7] as const;
export type BestOf = (typeof BEST_OF)[number];

/** A friend's card lineup as a roster (their card levels and chemistry apply). */
export function friendLineupRoster(s: FriendSnapshot, colors: [string, string]): Roster {
  const lineup = Object.fromEntries(Object.entries(s.lineup).map(([k, v]) => [k, v!.id]));
  const levels = Object.fromEntries(Object.values(s.lineup).map((v) => [v!.id, v!.lv]));
  return { ...lineupRoster(lineup, levels), id: `friend-${s.pin}`, name: s.name, colors };
}

const callup = (slot: SlotId): Player => {
  const pos = (STARTER_SLOTS.includes(slot) ? slot : 'SF') as Pos;
  return { id: `callup-${slot}`, name: 'Call-up', pos, ovr: 64, off: 62, def: 62, reb: 60, ast: 58, three: 58, dur: 90 };
};

/** A drafted team (slot → player) as a roster; gaps get call-ups. */
export function teamRoster(players: Partial<Record<SlotId, Player>>, id: string, name: string, colors: [string, string]): Roster {
  const slots = Object.fromEntries(ALL_SLOTS.map((k) => [k, players[k] ?? callup(k)])) as Required<RosterSlots>;
  return { id, name, colors, slots };
}

/** First to ceil(n/2): best-of-3, 5 or 7. */
export function friendSeries(mine: Roster, theirs: Roster, n: BestOf, seed: string): SeriesResult {
  return bestOf(mine, theirs, createRng(`friend:${seed}`), Math.ceil(n / 2));
}

/** A draft race: more regular-season wins wins; a tie on wins goes to the deeper playoff run, else a draw. */
export function raceOutcome(mine: { w: number; depth: number }, theirs: { w: number; depth: number }): Outcome {
  if (mine.w !== theirs.w) return mine.w > theirs.w ? 'w' : 'l';
  if (mine.depth !== theirs.depth) return mine.depth > theirs.depth ? 'w' : 'l';
  return 'd';
}
