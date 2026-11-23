/**
 * A game recap from a final score and box score: period-by-period scoring and the key moments.
 * Seeded, so the same game always tells the same story.
 */
import type { GameResult } from '../game';
import { createRng } from '../rng';
import type { Roster } from '../types';

export type MomentKind = 'top' | 'double' | 'run' | 'clutch' | 'ot' | 'blowout';

export interface Moment {
  /** 0-based period (0–3 regulation, 4+ overtime). */
  period: number;
  kind: MomentKind;
  /** 0 = home side, 1 = away side. */
  side: 0 | 1;
  name?: string;
  n?: number;
  line?: string;
}

export interface Recap {
  /** [home periods, away periods]. */
  periods: [number[], number[]];
  moments: Moment[];
}

/** Split `total` into `parts` integers with a little noise, summing exactly to `total`. */
function split(total: number, parts: number, rnd: () => number): number[] {
  const w = Array.from({ length: parts }, () => 0.82 + rnd() * 0.36);
  const sum = w.reduce((a, b) => a + b, 0);
  const raw = w.map((x) => (x / sum) * total);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - out[i], i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) if (left-- > 0) out[i]++;
  return out;
}

export function recap(g: GameResult, home: Roster, away: Roster, seed: string): Recap {
  const rng = createRng(`recap:${seed}`);
  const rnd = () => rng.next();
  const margin = g.homeScore - g.awayScore;
  const winner: 0 | 1 = margin > 0 ? 0 : 1;

  // Overtime: tied after each OT period except the last, which the winner takes by the final margin.
  const otH: number[] = [];
  const otA: number[] = [];
  for (let k = 0; k < g.ot; k++) {
    const base = 6 + Math.floor(rnd() * 8);
    const last = k === g.ot - 1;
    otH.push(base + (last && winner === 0 ? Math.abs(margin) : 0));
    otA.push(base + (last && winner === 1 ? Math.abs(margin) : 0));
  }
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const periods: [number[], number[]] = [
    [...split(g.homeScore - sum(otH), 4, rnd), ...otH],
    [...split(g.awayScore - sum(otA), 4, rnd), ...otA],
  ];

  const homeIds = new Set(Object.values(home.slots).map((p) => p.id));
  const awayIds = new Set(Object.values(away.slots).map((p) => p.id));
  // Call-ups (not on either roster) are credited by elimination.
  const sideById = (id: string): 0 | 1 => (homeIds.has(id) ? 0 : awayIds.has(id) ? 1 : 1);
  const sideOfLine = new Map(g.box.map((b) => [b.playerId + (b.home === undefined ? '' : String(b.home)), b.home === undefined ? sideById(b.playerId) : b.home ? 0 as const : 1 as const]));
  const sideOf = (id: string, home?: boolean): 0 | 1 => sideOfLine.get(id + (home === undefined ? '' : String(home))) ?? sideById(id);
  const box = [...g.box].sort((a, b) => b.pts - a.pts || a.playerId.localeCompare(b.playerId));
  const moments: Moment[] = [];

  // The winner's best quarter.
  const diffs = [0, 1, 2, 3].map((q) => (winner === 0 ? 1 : -1) * (periods[0][q] - periods[1][q]));
  const bestQ = diffs.indexOf(Math.max(...diffs));
  if (diffs[bestQ] >= 5) moments.push({ period: bestQ, kind: 'run', side: winner, n: diffs[bestQ] });

  for (const b of box) {
    if (b.pts >= 10 && ((b.reb >= 10 && b.ast >= 10) || (b.pts >= 20 && (b.reb >= 12 || b.ast >= 12)))) {
      moments.push({ period: 2, kind: 'double', side: sideOf(b.playerId, b.home), name: b.name, line: `${b.pts}/${b.reb}/${b.ast}` });
      break;
    }
  }

  const winners = box.filter((b) => sideOf(b.playerId, b.home) === winner);
  const closer = winners[0];
  if (g.ot) moments.push({ period: 3 + g.ot, kind: 'ot', side: winner, name: closer?.name, n: g.ot });
  else if (Math.abs(margin) <= 4 && closer) moments.push({ period: 3, kind: 'clutch', side: winner, name: closer.name });
  else if (Math.abs(margin) >= 20) moments.push({ period: 3, kind: 'blowout', side: winner, n: Math.abs(margin) });

  if (box[0]) moments.push({ period: 3 + g.ot, kind: 'top', side: sideOf(box[0].playerId, box[0].home), name: box[0].name, n: box[0].pts });
  return { periods, moments: moments.sort((a, b) => a.period - b.period) };
}
