/**
 * "Run it back": draft the same spins again (same mode, same seed) and try to beat your best on them.
 * With fair spins every round lands the same team, so only your picks differ (a respin or reroll changes that
 * round's team). Knowing the spins makes a replay easier, so a replay pays no packs, league points, missions or
 * achievements: it's for beating your own record.
 */
import { depthOf, type Depth } from './weekly';

/** Your best finish on a set of spins, and how many times you've drafted them. */
export interface ReplayMark {
  w: number;
  l: number;
  /** 0 missed the playoffs … 4 lost the Finals, 5 champions. */
  depth: Depth;
  tries: number;
}

export interface RunFinish {
  w: number;
  l: number;
  depth: Depth;
}

export const finishOf = (r: { wins: number; losses: number; champion: boolean; round: number }): RunFinish =>
  ({ w: r.wins, l: r.losses, depth: depthOf(r) });

/** Positive when `a` is the better finish: more wins, then a deeper playoff run, then fewer losses. */
export function compareFinish(a: RunFinish, b: RunFinish): number {
  return a.w - b.w || a.depth - b.depth || b.l - a.l;
}

/** The mark to carry into the next try: the better of your best so far and this run. */
export function nextMark(prev: ReplayMark | null, run: RunFinish): ReplayMark {
  const best = !prev || compareFinish(run, prev) > 0 ? run : prev;
  return { w: best.w, l: best.l, depth: best.depth, tries: (prev?.tries ?? 1) + 1 };
}

/**
 * Only a plain run can be run back. The Daily, the Weekly Challenge and friends' races are one shot each, and
 * Management Crisis and Career have their own flow.
 */
export function canRunItBack(g: { daily: string | null; weekly: string | null; challenge: unknown; crisis: unknown; career: boolean; draft: { seed: string } | null }): boolean {
  return !!g.draft && !g.daily && !g.weekly && !g.challenge && !g.crisis && !g.career && !g.draft.seed.startsWith('race-');
}
