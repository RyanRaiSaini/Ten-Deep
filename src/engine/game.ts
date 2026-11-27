import { lineupMinutes, teamStrength, type LineupEntry } from './rotation';
import { SIM } from './simConfig';
import type { Rng, Roster } from './types';

export interface BoxLine {
  playerId: string;
  name: string;
  pts: number;
  reb: number;
  ast: number;
  /** Steals and blocks (older saves don't have them). */
  stl?: number;
  blk?: number;
  min: number;
  /** Which side the player played for (older saves don't have it). */
  home?: boolean;
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
  /** A playoff game: team quality counts for more (SIM.playoffK). */
  playoff?: boolean;
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

function boxFor(lineup: LineupEntry[], pts: number, rng: Rng, home: boolean): BoxLine[] {
  const noise = () => Math.exp(rng.normal(0, 0.35));
  const ptsW = lineup.map((e) => e.minutes * (e.player.off / 80) ** SIM.ptsExp * noise());
  const rebW = lineup.map((e) => e.minutes * (e.player.reb / 80) ** 3 * noise());
  const astW = lineup.map((e) => e.minutes * (e.player.ast / 80) ** 4 * noise());
  // Steals: defense, more for guards and wings. Blocks: defense and size (rebounding), most for rim protectors.
  const guard = (e: LineupEntry) => (e.player.pos === 'PG' || e.player.pos === 'SG' ? 1.3 : e.player.pos === 'SF' ? 1.1 : 0.8);
  const rim = (e: LineupEntry) => (e.player.tag === 'rim' || e.player.tag === 'unicorn' ? 1.8 : e.player.pos === 'C' ? 1.3 : e.player.pos === 'PF' ? 1.1 : 0.45);
  const stlW = lineup.map((e) => e.minutes * guard(e) * (e.player.def / 80) ** 4 * noise());
  const blkW = lineup.map((e) => e.minutes * rim(e) * (e.player.def / 80) ** 3 * (e.player.reb / 80) ** 2 * noise());
  const p = allocate(pts, ptsW);
  const r = allocate(Math.max(30, Math.round(rng.normal(44, 4))), rebW);
  const a = allocate(Math.max(12, Math.round(rng.normal(25, 3.5))), astW);
  const st = allocate(Math.max(2, Math.round(rng.normal(7.6, 2.2))), stlW);
  const bl = allocate(Math.max(1, Math.round(rng.normal(5, 1.9))), blkW);
  return lineup.map((e, i) => ({
    playerId: e.player.id, name: e.player.name, pts: p[i], reb: r[i], ast: a[i], stl: st[i], blk: bl[i], min: Math.round(e.minutes), home,
  }));
}

export function simGame(home: Roster, away: Roster, ctx: GameContext): GameResult {
  const { rng } = ctx;
  const lh = lineupMinutes(home, ctx.outHome);
  const la = lineupMinutes(away, ctx.outAway);
  const sh = teamStrength(lh, (home.mod ?? 0) + (home.seasonForm ?? 0));
  const sa = teamStrength(la, (away.mod ?? 0) + (away.seasonForm ?? 0));
  const pace = rng.normal(SIM.pace, SIM.paceSd);
  const k = SIM.k * (ctx.playoff ? SIM.playoffK : 1);
  const exp = (off: number, def: number) => pace * (SIM.basePpp + k * (off - def));
  let hs = Math.round(exp(sh.off, sa.def) + SIM.homeAdv / 2 + rng.normal(0, SIM.scoreSd));
  let as = Math.round(exp(sa.off, sh.def) - SIM.homeAdv / 2 + rng.normal(0, SIM.scoreSd));
  hs = Math.max(80, Math.min(155, hs));
  as = Math.max(80, Math.min(155, as));
  let ot = 0;
  while (hs === as) {
    ot++;
    hs += Math.max(2, Math.round(rng.normal(11, 3) + k * 10 * (sh.off - sa.def)));
    as += Math.max(2, Math.round(rng.normal(11, 3) + k * 10 * (sa.off - sh.def)));
  }
  return { homeScore: hs, awayScore: as, ot, box: [...boxFor(lh, hs, rng, true), ...boxFor(la, as, rng, false)] };
}
