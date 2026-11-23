/**
 * Card finishes: a second, independent rarity on top of the player's tier. Any card can come out in any finish,
 * so a Violet Wembanyama or a Rainbow bench guy is its own chase. Finishes are fixed by the pick and the card
 * (seeded), so reopening a pick never rerolls them. Odds are published in the app.
 * (The names are our own.)
 */
import { createRng } from '../rng';

export const FINISHES = ['base', 'holo', 'chrome', 'gold', 'violet', 'rainbow', 'cosmic'] as const;
export type Finish = (typeof FINISHES)[number];

/** "1 in N" per card for each special finish (base is everything else). */
export const ONE_IN: Record<Exclude<Finish, 'base'>, number> = { holo: 10, chrome: 25, gold: 60, violet: 150, rainbow: 1000, cosmic: 5000 };

export const finishRank = (f: Finish) => FINISHES.indexOf(f);

/** Roll a finish from a uniform number in [0, 1): rarest first. */
export function finishFromRoll(u: number): Finish {
  let edge = 0;
  for (const f of [...FINISHES].reverse()) {
    if (f === 'base') break;
    edge += 1 / ONE_IN[f];
    if (u < edge) return f;
  }
  return 'base';
}

/** The finish of `cardId` in pick `pickId` (deterministic). */
export function finishFor(pickId: string, cardId: string): Finish {
  return finishFromRoll(createRng(`finish:${pickId}:${cardId}`).next());
}

/** Best finish among owned copies. */
export function bestFinish(finishes: Partial<Record<Finish, number>> | undefined): Finish {
  let best: Finish = 'base';
  for (const f of FINISHES) if ((finishes?.[f] ?? 0) > 0 && finishRank(f) > finishRank(best)) best = f;
  return best;
}
