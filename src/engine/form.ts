/**
 * Live form: nudge Current Day ratings from real box scores. A player outplaying his rating this season (and
 * especially this week) moves up; one underperforming moves down. Pure, so the server job and tests share it.
 *
 * Model: Hollinger Game Score per game. Ratings are calibrated against production across the league each run
 * (a least-squares fit of rating on Game Score), so the scale adapts as the season goes on. The season gap is
 * trusted more as games pile up; the last 7 days add a hot/cold swing on top.
 */

export interface StatLine {
  min: number; pts: number; fgm: number; fga: number; ftm: number; fta: number;
  oreb: number; dreb: number; ast: number; stl: number; blk: number; tov: number; pf: number;
}

export interface Production { gp: number; min: number; gmsc: number }

export interface RatedPlayer { name: string; ovr: number; age?: number }

export interface FormDelta { d: number; gp: number; gmsc: number; recent?: number }

/** Max nudge each way; rookies and young players can climb further (a breakout first season). */
export const FORM_CAP = { down: -5, up: 6, youngUp: 9 };

export function gameScore(s: StatLine): number {
  return s.pts + 0.4 * s.fgm - 0.7 * s.fga - 0.4 * (s.fta - s.ftm) + 0.7 * s.oreb + 0.3 * s.dreb + s.stl + 0.7 * s.ast + 0.7 * s.blk - 0.4 * s.pf - s.tov;
}

/** "Kristaps Porziņģis" and "Kristaps Porzingis" match; suffixes and punctuation are ignored. */
export function normName(name: string): string {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l').replace(/ø/g, 'o').replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/[.'’-]/g, ' ')
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Least-squares fit of rating on Game Score per game, among rotation players with a real sample. */
export function calibrate(rows: { ovr: number; gmsc: number }[]): { a: number; b: number } {
  const n = rows.length;
  if (n < 20) return { a: 70, b: 1.1 };
  const mx = rows.reduce((s, r) => s + r.gmsc, 0) / n;
  const my = rows.reduce((s, r) => s + r.ovr, 0) / n;
  let sxy = 0, sxx = 0;
  for (const r of rows) { sxy += (r.gmsc - mx) * (r.ovr - my); sxx += (r.gmsc - mx) ** 2; }
  const b = sxx > 0 ? Math.max(0.4, Math.min(2.5, sxy / sxx)) : 1.1;
  return { a: my - b * mx, b };
}

export function computeForm(
  players: RatedPlayer[],
  season: Map<string, Production>,
  recent: Map<string, Production>,
): Record<string, FormDelta> {
  const rows = players
    .map((p) => ({ p, s: season.get(normName(p.name)) }))
    .filter((x): x is { p: RatedPlayer; s: Production } => !!x.s && x.s.gp >= 5 && x.s.min / x.s.gp >= 15);
  const { a, b } = calibrate(rows.map(({ p, s }) => ({ ovr: p.ovr, gmsc: s.gmsc })));
  const out: Record<string, FormDelta> = {};
  for (const p of players) {
    const key = normName(p.name);
    const s = season.get(key);
    if (!s || s.gp < 3) continue;
    const mpg = s.min / s.gp;
    // How much to trust the season: grows with games and minutes.
    const trust = Math.min(1, s.gp / 15) * Math.min(1, mpg / 22);
    const earned = a + b * s.gmsc;
    let d = (earned - p.ovr) * 0.55 * trust;
    const r = recent.get(key);
    if (r && r.gp >= 2) d += (r.gmsc - s.gmsc) * b * 0.35 * Math.min(1, r.gp / 3);
    const young = (p.age ?? 30) <= 21;
    const delta = Math.round(Math.max(FORM_CAP.down, Math.min(young ? FORM_CAP.youngUp : FORM_CAP.up, d)));
    if (delta !== 0) out[key] = { d: delta, gp: s.gp, gmsc: Math.round(s.gmsc * 10) / 10, ...(r && r.gp >= 2 ? { recent: Math.round(r.gmsc * 10) / 10 } : {}) };
  }
  return out;
}

/** Add one game's line into a running production total. */
export function addGame(total: Production | undefined, line: StatLine): Production {
  const t = total ?? { gp: 0, min: 0, gmsc: 0 };
  const gp = t.gp + 1;
  return { gp, min: t.min + line.min, gmsc: (t.gmsc * t.gp + gameScore(line)) / gp };
}
