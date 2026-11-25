/**
 * "Why 64 wins?": the regular season explained in a few facts, for the result screen.
 *   - Squad Rating against the league (rank and league average)
 *   - point differential, and the wins it usually means (Pythagorean expectation, exponent 14 for the NBA)
 *   - close games (5 points or fewer, or overtime): luck above or below what the margin earned
 *   - injuries: games missed by your players, by starters, and the hardest hit
 *   - season form: the swing every team draws each season (above or below its ratings)
 *   - longest win streak
 */
import { squadRating } from '../rotation';
import type { SeasonState } from '../season';
import { STARTER_SLOTS } from '../types';

export interface Breakdown {
  wins: number;
  losses: number;
  sr: number;
  srRank: number;
  teams: number;
  leagueSr: number;
  /** Average point differential per game. */
  diff: number;
  /** Wins a team with this point differential usually gets. */
  expected: number;
  /** Actual minus expected (positive: close games went your way). */
  luck: number;
  close: { w: number; l: number };
  injuries: { games: number; starterGames: number; worst: { name: string; games: number } | null };
  /** Your season-long form swing (rating points), 0 if none. */
  form: number;
  longestStreak: number;
}

/** NBA Pythagorean exponent: wins ≈ PF^14 / (PF^14 + PA^14) of the games played. */
const PYTH = 14;
/** A game decided by this many points or fewer (or in overtime) counts as close. */
const CLOSE = 5;

export function seasonBreakdown(s: SeasonState): Breakdown {
  const rec = s.records[0];
  const games = Math.max(1, rec.w + rec.l);
  const ratings = s.teams.map(squadRating);
  const sr = ratings[0];
  const srRank = 1 + ratings.filter((r) => r > sr).length;
  const leagueSr = ratings.slice(1).reduce((a, b) => a + b, 0) / Math.max(1, ratings.length - 1);
  const diff = (rec.pf - rec.pa) / games;
  const share = rec.pf ** PYTH / (rec.pf ** PYTH + rec.pa ** PYTH || 1);
  const expected = Math.round(share * games);

  const close = { w: 0, l: 0 };
  let streak = 0;
  let longestStreak = 0;
  for (const e of s.log) {
    if (e.kind !== 'game') continue;
    const mine = e.home === 0 ? e.result.homeScore : e.result.awayScore;
    const theirs = e.home === 0 ? e.result.awayScore : e.result.homeScore;
    const won = mine > theirs;
    if (Math.abs(mine - theirs) <= CLOSE || e.result.ot > 0) close[won ? 'w' : 'l']++;
    streak = won ? streak + 1 : 0;
    longestStreak = Math.max(longestStreak, streak);
  }

  // Games actually missed: an injury in game r keeps him out of the next N, capped by the season's end.
  const starters = new Set(STARTER_SLOTS.map((k) => s.teams[0].slots[k].id));
  const missed = new Map<string, { name: string; games: number; starter: boolean }>();
  for (const e of s.log) {
    if (e.kind !== 'injury' || e.team !== 0) continue;
    const n = Math.max(0, Math.min(e.games, games - 1 - e.round));
    const cur = missed.get(e.playerId) ?? { name: e.name, games: 0, starter: starters.has(e.playerId) };
    cur.games += n;
    missed.set(e.playerId, cur);
  }
  const all = [...missed.values()];
  const worst = all.reduce<{ name: string; games: number } | null>((w, x) => (x.games > (w?.games ?? 0) ? { name: x.name, games: x.games } : w), null);

  return {
    wins: rec.w, losses: rec.l, sr: Math.round(sr), srRank, teams: s.teams.length, leagueSr: Math.round(leagueSr),
    diff: Math.round(diff * 10) / 10, expected, luck: rec.w - expected, close,
    injuries: { games: all.reduce((n, x) => n + x.games, 0), starterGames: all.filter((x) => x.starter).reduce((n, x) => n + x.games, 0), worst },
    form: Math.round((s.teams[0].seasonForm ?? 0) * 10) / 10,
    longestStreak,
  };
}
