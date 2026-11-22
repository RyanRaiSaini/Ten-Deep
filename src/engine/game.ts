import { lineupMinutes, teamStrength, type LineupEntry } from './rotation';
import { SIM } from './simConfig';
import type { Rng, Roster } from './types';

export interface BoxLine {
  playerId: string;
  name: string;
  pts: number;
  reb: number;
  ast: number;
  min: number;
}

export interface GameResult {
  homeScore: number;
  awayScore: number;
  ot: number;
  box: BoxLine[];
}

export interface GameContext {
  rng: Rng;
  outHome: Set<string>;
  outAway: Set<string>;
}

export { SIM };

/** Split an integer total across weights so the parts sum exactly to the total (largest remainder). */
function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (w / sum) * total);
  const floors = raw.map(Math.floor);
  let left = total - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - floors[i], i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    floors[i]++;
    left--;
  }
  return floors;
}

function boxFor(lineup: LineupEntry[], pts: number, rng: Rng): BoxLine[] {
  const noise = () => Math.exp(rng.normal(0, 0.35));
  const ptsW = lineup.map((e) => e.minutes * (e.player.off / 80) ** 4 * noise());
  const rebW = lineup.map((e) => e.minutes * (e.player.reb / 80) ** 3 * noise());
  const astW = lineup.map((e) => e.minutes * (e.player.ast / 80) ** 4 * noise());
  const p = allocate(pts, ptsW);
  const r = allocate(Math.max(30, Math.round(rng.normal(44, 4))), rebW);
  const a = allocate(Math.max(12, Math.round(rng.normal(25, 3.5))), astW);
  return lineup.map((e, i) => ({
    playerId: e.player.id, name: e.player.name, pts: p[i], reb: r[i], ast: a[i], min: Math.round(e.minutes),
  }));
}

export function simGame(home: Roster, away: Roster, ctx: GameContext): GameResult {
  const { rng } = ctx;
  const lh = lineupMinutes(home, ctx.outHome);
  const la = lineupMinutes(away, ctx.outAway);
  const sh = teamStrength(lh, home.mod ?? 0);
  const sa = teamStrength(la, away.mod ?? 0);
  const pace = rng.normal(SIM.pace, SIM.paceSd);
  const exp = (off: number, def: number) => pace * (SIM.basePpp + SIM.k * (off - def));
  let hs = Math.round(exp(sh.off, sa.def) + SIM.homeAdv / 2 + rng.normal(0, SIM.scoreSd));
  let as = Math.round(exp(sa.off, sh.def) - SIM.homeAdv / 2 + rng.normal(0, SIM.scoreSd));
  hs = Math.max(80, Math.min(155, hs));
  as = Math.max(80, Math.min(155, as));
  let ot = 0;
  while (hs === as) {
    ot++;
    hs += Math.max(2, Math.round(rng.normal(11, 3) + SIM.k * 10 * (sh.off - sa.def)));
    as += Math.max(2, Math.round(rng.normal(11, 3) + SIM.k * 10 * (sa.off - sh.def)));
  }
  return { homeScore: hs, awayScore: as, ot, box: [...boxFor(lh, hs, rng), ...boxFor(la, as, rng)] };
}
