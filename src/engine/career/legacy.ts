/** Franchise records across a career, and the Hall of Fame that comes from them. */
import type { PlayerTotals } from '../season';
import type { Player } from '../types';

export type PlayoffResult = 'champion' | 'finals' | 'semis' | 'quarters' | 'first' | 'missed';

export interface CareerLine {
  name: string;
  gp: number;
  pts: number;
  reb: number;
  ast: number;
  seasons: number;
  titles: number;
  /** Label of the last season played for you. */
  last: string;
}
export type CareerStats = Record<string, CareerLine>;

export function addSeason(stats: CareerStats, roster: Player[], totals: Record<string, PlayerTotals>, champion: boolean, label: string): CareerStats {
  const out = { ...stats };
  for (const p of roster) {
    const t = totals[p.id];
    if (!t?.gp) continue;
    const prev = out[p.id] ?? { name: p.name, gp: 0, pts: 0, reb: 0, ast: 0, seasons: 0, titles: 0, last: label };
    out[p.id] = {
      name: p.name, gp: prev.gp + t.gp, pts: prev.pts + t.pts, reb: prev.reb + t.reb, ast: prev.ast + t.ast,
      seasons: prev.seasons + 1, titles: prev.titles + (champion ? 1 : 0), last: label,
    };
  }
  return out;
}

/** Four seasons with you, plus either 20+ a night, 2+ titles, or 6,000 points. */
export const HOF_RULES = { seasons: 4, ppg: 20, titles: 2, points: 6000 } as const;

export function hallOfFame(stats: CareerStats): (CareerLine & { id: string })[] {
  return Object.entries(stats)
    .map(([id, s]) => ({ id, ...s }))
    .filter((s) => s.seasons >= HOF_RULES.seasons && (s.pts / s.gp >= HOF_RULES.ppg || s.titles >= HOF_RULES.titles || s.pts >= HOF_RULES.points))
    .sort((a, b) => b.pts - a.pts);
}

/** Top franchise scorers, for the records page. */
export function franchiseLeaders(stats: CareerStats, n = 10) {
  return Object.entries(stats).map(([id, s]) => ({ id, ...s })).sort((a, b) => b.pts - a.pts).slice(0, n);
}
