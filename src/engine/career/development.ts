/**
 * Career development: how a player's rating moves over one offseason. Built on published NBA aging curves (peak at
 * 26–27, fastest growth at 19–21, decline speeding up after 30), converted at about 1.75 rating points per BPM point,
 * plus the owner's calls:
 * - the top 15 picks of the 2026 class always improve through age 22, barring a serious injury, and grow faster than
 *   the curve up to a ceiling by draft slot;
 * - promising late picks and second-rounders who already outplay their slot get a smaller boost and never stall;
 * - elite young stars (25 or younger and 93+, or a 21-or-younger 90+ like Flagg) keep climbing every year unless hurt (Wembanyama is a near-lock for 99).
 * The spread per age, cliff years after 32 and injury odds from durability are estimates on top of the research.
 * The proposal page (scripts/career/progression.mts) is generated from this same model.
 */
import { ROOKIES_2026 } from '../../data/current2026';
import type { Player, Rng } from '../types';

/** Average change in overall rating over one offseason, by age at the start of the season. */
export const MEAN: Record<number, number> = {
  19: 2.6, 20: 2.4, 21: 2.0, 22: 1.6, 23: 1.1, 24: 0.7, 25: 0.4, 26: 0.2, 27: 0, 28: -0.3, 29: -0.6,
  30: -0.9, 31: -1.0, 32: -1.1, 33: -1.3, 34: -1.6, 35: -2.0, 36: -2.3, 37: -2.6, 38: -2.8, 39: -3.0, 40: -3.2,
};
/** Spread (standard deviation) of that change: young players swing the most. */
export const spread = (age: number) => (age <= 22 ? 3.2 : age <= 24 ? 2.7 : age <= 29 ? 2.2 : age <= 32 ? 2.4 : 2.8);
export const meanAt = (age: number) => MEAN[Math.max(19, Math.min(40, Math.round(age)))];

/** The 2026 draft's top 15 picks (ROOKIES_2026 is in draft order). */
export const TOP_PROSPECTS = new Set(ROOKIES_2026.slice(0, 15));
/** Late picks and second-rounders already outplaying their draft slot. */
export const PROMISING = new Set([
  'Ajay Mitchell', 'Kyshawn George', 'Jaylen Wells', 'Meleek Thomas', 'Jaylon Tyson', 'Dominick Barlow', 'Tyrese Proctor',
  'Hugo González', 'Bennett Stirtz', 'Koa Peat',
]);

export type Outlook = 'elite' | 'top' | 'promising' | null;

/**
 * A prospect's ceiling: how high the guaranteed growth carries him (past it he follows the normal curve). By 2026
 * draft slot: picks 1–3 can reach 99 (Dybantsa, Peterson, Boozer), 4–8 94, 9–15 90; promising picks 88; elite young
 * stars 99.
 */
export function ceilingOf(p: Pick<Player, 'name' | 'age' | 'ovr'>, outlook = outlookOf(p)): number {
  if (outlook === 'elite') return 99;
  if (outlook === 'promising') return 88;
  if (outlook !== 'top') return 0;
  const pick = ROOKIES_2026.indexOf(p.name);
  return pick < 3 ? 99 : pick < 8 ? 94 : 90;
}

/** How a player is expected to develop (only young players have an outlook). */
export function outlookOf(p: Pick<Player, 'name' | 'age' | 'ovr'>): Outlook {
  const age = p.age ?? 27;
  if ((age <= 25 && p.ovr >= 93) || (age <= 21 && p.ovr >= 90)) return 'elite';
  // Guaranteed growth for the first few seasons: top picks through 22, promising picks through 24.
  if (age <= 22 && TOP_PROSPECTS.has(p.name)) return 'top';
  if (age <= 24 && PROMISING.has(p.name)) return 'promising';
  return null;
}

/** Odds of a serious injury in an offseason's worth of games: 3%, up to about 15% for the most fragile. */
export const injuryOdds = (p: Pick<Player, 'dur'>) => 0.03 + ((100 - (p.dur ?? 80)) / 100) * 0.12;

/** One offseason's change, unrounded and before the 64–99 limits. */
export function developDelta(p: Pick<Player, 'name' | 'age' | 'ovr' | 'dur' | 'rookie'>, rng: Pick<Rng, 'next' | 'normal'>): number {
  const age = p.age ?? 27;
  const outlook = outlookOf(p);
  // Already-good young players grow less in absolute terms (research: a higher prior level means less progression),
  // so the expected gain shrinks toward 99: an 80 keeps almost all of it, a 90 half, a 95 a fifth.
  const mean = meanAt(age) + (p.rookie ? 0.5 : 0);
  const room = Math.max(0, Math.min(1, (99 - p.ovr) / 18));
  let d = (mean > 0 ? mean * room : mean) + spread(age) * rng.normal(0, 1);
  // Prospects below their ceiling grow faster and don't go backwards (an injury still can set them back).
  if (outlook && p.ovr < ceilingOf(p, outlook)) {
    const room = ceilingOf(p, outlook) - p.ovr;
    if (outlook === 'top') d = Math.min(Math.max(1, d + 1.5), Math.max(d, room));
    else if (outlook === 'promising') d = Math.min(Math.max(0, d + 1), Math.max(d, room));
    else d = Math.max(1, d + 0.5);
  }
  // Cliff seasons after 32: about 1 in 10 lose 4–8 more.
  if (age >= 32 && rng.next() < 0.1) d -= 4 + 4 * rng.next();
  // A serious injury takes 3–7 off.
  if (rng.next() < injuryOdds(p)) d -= 3 + 4 * rng.next();
  return d;
}
