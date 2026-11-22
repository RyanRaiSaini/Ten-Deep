import type { Player, Rng } from '../types';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** One offseason of development by age band (plus ±1 noise): kids grow, primes hold, veterans fade. */
export function ageDelta(age: number, rng: Rng): number {
  const [lo, hi] = age <= 22 ? [2, 5] : age <= 26 ? [0, 3] : age <= 30 ? [-1, 1] : age <= 33 ? [-3, 0] : [-6, -2];
  return rng.int(lo, hi) + rng.int(-1, 1);
}

/** Age a player one year. Overall stays 64–99; sub-ratings move by the same amount the overall actually moved. */
export function progressPlayer(p: Player, rng: Rng): Player {
  const ovr = clamp(p.ovr + ageDelta(p.age ?? 27, rng), 64, 99);
  const d = ovr - p.ovr;
  const sub = (v: number) => clamp(v + d, 40, 99);
  return { ...p, age: (p.age ?? 27) + 1, ovr, off: sub(p.off), def: sub(p.def), reb: sub(p.reb), ast: sub(p.ast), three: sub(p.three) };
}

const RETIRE: [number, number][] = [[36, 0.1], [37, 0.25], [38, 0.45], [39, 0.7]];

/** Does this player hang it up this offseason? `declined`: his rating dropped this offseason. */
export function retires(p: Player, declined: boolean, rng: Rng): boolean {
  const age = p.age ?? 27;
  if (age >= 40) return true;
  const odds = RETIRE.find(([a]) => a === age)?.[1] ?? 0;
  if (rng.next() < odds) return true;
  return p.ovr <= 64 && declined; // aged out at the rating floor
}
