/** Player Picks: 5 cards, keep 1. Seeded, with published odds per pick type. */
import { createRng, shuffle } from '../rng';
import type { Rng } from '../types';
import { TIERS, type Card, type Tier } from './tiers';

export const PICK_TYPES = [
  'daily', 'run', 'good', 'playoffs', 'weekly', 'confFinals', 'finals', 'champion', 'sweep', 'mythic', 'legendary', 'ultimate',
] as const;
export type PickType = (typeof PICK_TYPES)[number];

type Odds = Record<Tier, number>;
const BASE: Odds = { common: 50, uncommon: 28, rare: 15, epic: 5.5, mythic: 1.3, ultra: 0.2 };
const PLAYOFFS: Odds = { common: 35, uncommon: 30, rare: 22, epic: 9, mythic: 3.3, ultra: 0.7 };
const WEEKLY: Odds = { common: 15, uncommon: 25, rare: 39, epic: 15.5, mythic: 4.5, ultra: 1 };
const FINALS: Odds = { common: 0, uncommon: 10, rare: 45, epic: 32, mythic: 10, ultra: 3 };
const CHAMPION: Odds = { common: 0, uncommon: 0, rare: 40, epic: 40, mythic: 16, ultra: 4 };
const ULTIMATE: Odds = { common: 0, uncommon: 0, rare: 0, epic: 0, mythic: 0, ultra: 100 };

/** Per-card tier odds (percent) shown in the UI, plus each pick type's guarantee. */
export const PICK_ODDS: Record<PickType, Odds> = {
  daily: BASE, run: BASE, good: PLAYOFFS, playoffs: PLAYOFFS, weekly: WEEKLY, confFinals: WEEKLY, finals: FINALS,
  champion: CHAMPION, sweep: CHAMPION, mythic: WEEKLY, legendary: WEEKLY, ultimate: ULTIMATE,
};
/** One card in these picks is forced into these tiers. */
const GUARANTEE: Partial<Record<PickType, Partial<Odds>>> = {
  sweep: { mythic: 70, ultra: 30 },
  mythic: { mythic: 85, ultra: 15 },
  legendary: { ultra: 100 },
};
/** Floors: Finals picks 80+, Champion 83+, Sweep 85+, and the Ultimate pick only the 98+ greats. */
const MIN_OVR: Partial<Record<PickType, number>> = { finals: 80, champion: 83, sweep: 85, ultimate: 98 };

function rollTier(odds: Partial<Odds>, rng: Rng): Tier {
  const entries = TIERS.map((t) => [t, odds[t] ?? 0] as const).filter(([, w]) => w > 0);
  let roll = rng.next() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [t, w] of entries) if ((roll -= w) < 0) return t;
  return entries[entries.length - 1][0];
}

export function generatePick(cards: Card[], type: PickType, seed: string): Card[] {
  const rng = createRng(`pick:${type}:${seed}`);
  const minOvr = MIN_OVR[type] ?? 0;
  const byTier = new Map<Tier, Card[]>(TIERS.map((t) => [t, cards.filter((c) => c.tier === t && c.ovr >= minOvr)]));
  const chosen: Card[] = [];
  for (let i = 0; i < 5; i++) {
    const odds = i === 0 && GUARANTEE[type] ? GUARANTEE[type]! : PICK_ODDS[type];
    // Re-roll if a tier is empty or exhausted (can't happen with real data, but never loop forever).
    for (let tries = 0; tries < 50; tries++) {
      const pool = (byTier.get(rollTier(odds, rng)) ?? []).filter((c) => !chosen.some((x) => x.id === c.id));
      if (pool.length) {
        chosen.push(rng.pick(pool));
        break;
      }
    }
  }
  return shuffle(chosen, rng);
}

/** How a finished draft run went, for its rewards. */
export interface RunOutcome {
  wins: number;
  losses: number;
  champion: boolean;
  madePlayoffs: boolean;
  /** Deepest playoff round reached: 0 first round … 3 Finals; -1 if you never made a series. */
  round: number;
  /** Won the Finals 4-0. */
  finalsSweep: boolean;
  /** Playoff games lost (0 with a title = 16-0). */
  playoffLosses: number;
}

/**
 * The picks a finished run earns. Every run: a Run Pick, a Good Pick for 60+ wins, a Legendary Pick for 82-0.
 * A deep playoff run stacks a second pick that grows with how far you went: lost in the conference finals,
 * lost in the Finals, champions, champions with a Finals sweep, and for 82-0 plus 16-0 the Ultimate (98+ only).
 */
export function runRewards(r: RunOutcome): PickType[] {
  const season: PickType = r.wins >= 82 && r.losses === 0 ? 'legendary' : r.wins >= GOOD_WINS ? 'good' : 'run';
  const playoff: PickType | null = r.champion
    ? (r.wins >= 82 && r.losses === 0 && r.playoffLosses === 0 ? 'ultimate' : r.finalsSweep ? 'sweep' : 'champion')
    : r.round === 3 ? 'finals' : r.round === 2 ? 'confFinals' : null;
  return playoff ? [season, playoff] : [season];
}
/** Regular-season wins for a Good Pick instead of a Run Pick. */
export const GOOD_WINS = 60;

/** A better pick to aim for next time. */
export type Goal = 'good' | 'confFinals' | 'finals' | 'champion' | 'sweep' | 'ultimate';

/**
 * What would have earned more: a Good Pick if you won under 60, and the next playoff pick up from where you
 * finished. Empty once you've earned the Ultimate Pick.
 */
export function nextGoals(r: RunOutcome): Goal[] {
  const out: Goal[] = [];
  if (r.wins < GOOD_WINS) out.push('good');
  const got = runRewards(r)[1];
  const next: Goal | null = !got ? 'confFinals' : got === 'confFinals' ? 'finals' : got === 'finals' ? 'champion'
    : got === 'champion' ? 'sweep' : got === 'sweep' ? 'ultimate' : null;
  if (next) out.push(next);
  return out;
}
