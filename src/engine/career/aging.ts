import type { Player, Rng } from '../types';
import { developDelta } from './development';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Age a player one year (development.ts: the aging curve, prospects, injuries). Overall stays 64–99; sub-ratings
 * move by the same amount the overall actually moved.
 */
export function progressPlayer(p: Player, rng: Rng): Player {
  const ovr = clamp(Math.round(p.ovr + developDelta(p, rng)), 64, 99);
  const d = ovr - p.ovr;
  const sub = (v: number) => clamp(v + d, 40, 99);
  return { ...p, age: (p.age ?? 27) + 1, ovr, off: sub(p.off), def: sub(p.def), reb: sub(p.reb), ast: sub(p.ast), three: sub(p.three) };
}

/** Chance of retiring after a season, by age (the age he's about to turn). */
const RETIRE: Record<number, number> = { 34: 0.03, 35: 0.08, 36: 0.15, 37: 0.25, 38: 0.4, 39: 0.6, 40: 0.8 };

/**
 * Does this player hang it up this offseason? Stars play on longer (88+ halves the odds), fringe veterans go sooner
 * (under 72 from 33 on adds 20%), everyone's done by 41. `declined`: his rating dropped this offseason.
 */
export function retires(p: Player, declined: boolean, rng: Rng): boolean {
  const age = p.age ?? 27;
  if (age >= 41) return true;
  let odds = RETIRE[age] ?? 0;
  if (p.ovr >= 88) odds /= 2;
  else if (p.ovr < 72 && age >= 33) odds += 0.2;
  if (rng.next() < odds) return true;
  return p.ovr <= 64 && declined; // aged out at the rating floor
}
