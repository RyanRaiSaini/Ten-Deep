/**
 * Weekly leagues: ten tiers from Bronze III to Legend. Each week you're in a group of 30; the top 7 move up and
 * the bottom 5 move down. Until online play exists, the other 29 are AI GMs (clearly labeled) whose scores
 * climb through the week on seeded curves, so the same week always plays out the same way.
 */
import type { PickType } from '../collect/picks';
import { createRng } from '../rng';

export type Group = 'bronze' | 'silver' | 'gold' | 'platinum' | 'legend';
export interface Tier { group: Group; level: number }

export const LADDER: Tier[] = [
  { group: 'bronze', level: 3 }, { group: 'bronze', level: 2 }, { group: 'bronze', level: 1 },
  { group: 'silver', level: 3 }, { group: 'silver', level: 2 }, { group: 'silver', level: 1 },
  { group: 'gold', level: 3 }, { group: 'gold', level: 2 }, { group: 'gold', level: 1 },
  { group: 'legend', level: 0 },
];
export const TOP = LADDER.length - 1;
export const PROMOTE = 7;
export const RELEGATE = 5;
export const GROUP_SIZE = 30;

export interface Rival {
  name: string;
  /** Points this rival will have by the end of the week. */
  target: number;
  /** Curve shape: <1 scores early in the week, >1 late. */
  shape: number;
}

const FIRST = ['Atlas', 'Blaze', 'Coach', 'Dash', 'Echo', 'Flash', 'Ghost', 'Hustle', 'Iso', 'Jumper', 'Kicks', 'Lob', 'Moxie', 'Nova', 'Orbit',
  'Pivot', 'Quick', 'Rook', 'Swish', 'Turbo', 'Uptown', 'Vibe', 'Wing', 'Xtra', 'Yeti', 'Zone', 'Ace', 'Bolt', 'Clutch', 'Drift', 'Edge', 'Fade'];
const LAST = ['GM', 'Hoops', 'Buckets', 'Dynasty', 'Ballers', 'Hardwood', 'Splash', 'Rebound', 'Crossover', 'Fastbreak', 'Boards', 'Dimes'];

/** Typical weekly total for a tier: Bronze III ~120, each step about 30% more. */
const median = (tier: number) => 120 * 1.3 ** tier;

/** The 29 AI rivals for a week and tier. */
export function cohort(week: string, tier: number): Rival[] {
  const rng = createRng(`league:${week}:${tier}`);
  const names = new Set<string>();
  const out: Rival[] = [];
  while (out.length < GROUP_SIZE - 1) {
    const name = `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
    if (names.has(name)) continue;
    names.add(name);
    out.push({ name, target: Math.max(0, Math.round(median(tier) * Math.exp(rng.normal(0, 0.55)))), shape: 0.6 + rng.next() * 1.2 });
  }
  return out;
}

/** How much of its weekly total a rival has at `t` (0 = Monday start, 1 = Sunday night). */
export function weekProgress(r: Rival, t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x ** r.shape;
}

export type Zone = 'promote' | 'safe' | 'relegate';
export interface Row { name: string; points: number; you: boolean; rank: number; zone: Zone }

export function standings(week: string, tier: number, myPoints: number, t: number): Row[] {
  const rows = [
    { name: '', points: myPoints, you: true },
    ...cohort(week, tier).map((r) => ({ name: r.name, points: Math.round(r.target * weekProgress(r, t)), you: false })),
  ].sort((a, b) => b.points - a.points || Number(b.you) - Number(a.you));
  return rows.map((r, i) => ({
    ...r,
    rank: i + 1,
    zone: tier < TOP && i < PROMOTE ? 'promote' : tier > 0 && i >= GROUP_SIZE - RELEGATE ? 'relegate' : 'safe',
  }));
}

export interface Settlement { week: string; from: number; tier: number; rank: number; reward: PickType | null }

/** Close a week: where you finished, your new tier, and a reward for a top finish. */
export function settle(week: string, tier: number, myPoints: number): Settlement {
  const me = standings(week, tier, myPoints, 1).find((r) => r.you)!;
  const next = me.zone === 'promote' ? Math.min(TOP, tier + 1) : me.zone === 'relegate' ? Math.max(0, tier - 1) : tier;
  const reward: PickType | null = me.rank === 1 ? 'mythic' : me.rank <= PROMOTE ? 'weekly' : null;
  return { week, from: tier, tier: next, rank: me.rank, reward };
}

/** League points for something that happened in the game. */
export function pointsFor(e: { type: 'run'; wins: number; champion: boolean; madePlayoffs: boolean } | { type: 'daily' }): number {
  if (e.type === 'daily') return 5;
  return Math.round(e.wins / 2) + (e.madePlayoffs ? 10 : 0) + (e.champion ? 25 : 0);
}

/** Fraction of the week elapsed (Monday 00:00 → next Monday 00:00, local time). */
export function weekFraction(now: Date): number {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime();
  return Math.max(0, Math.min(1, (now.getTime() - start) / (7 * 24 * 3600 * 1000)));
}
