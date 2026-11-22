import type { GameResult } from './game';
import { createRng } from './rng';
import { playGame, standings, type SeasonState } from './season';

export interface Series {
  /** Team indexes into SeasonState.teams; hi = higher seed (home court). */
  hi: number;
  lo: number;
  seedHi: number;
  seedLo: number;
  winsHi: number;
  winsLo: number;
  games: { result: GameResult; homeIsHi: boolean }[];
}

export interface PlayoffState {
  season: SeasonState;
  rounds: Series[][];
  injuries: { [playerId: string]: number };
  day: number;
}

const FIRST_ROUND: [number, number][] = [[1, 16], [8, 9], [5, 12], [4, 13], [3, 14], [6, 11], [7, 10], [2, 15]];
/** 2-2-1-1-1 home court for the higher seed. */
const HI_HOME = [true, true, false, false, true, false, true];

export const seriesOver = (s: Series) => s.winsHi === 4 || s.winsLo === 4;
export const seriesWinner = (s: Series) => (s.winsHi === 4 ? s.hi : s.winsLo === 4 ? s.lo : null);

export function startPlayoffs(season: SeasonState): PlayoffState {
  const table = standings(season);
  const bySeed = (seed: number) => table[seed - 1].team;
  const rounds = [FIRST_ROUND.map(([a, b]) => mk(bySeed(a), bySeed(b), a, b))];
  return { season, rounds, injuries: { ...season.injuries }, day: 0 };
}

function mk(hi: number, lo: number, seedHi: number, seedLo: number): Series {
  return { hi, lo, seedHi, seedLo, winsHi: 0, winsLo: 0, games: [] };
}

/** Play the next game of every unfinished series in the current round; opens the next round when it's done. */
export function playNextGame(ps: PlayoffState): PlayoffState {
  if (champion(ps) !== null) return ps;
  const injuries = { ...ps.injuries };
  for (const id of Object.keys(injuries)) injuries[id] = Math.max(0, injuries[id] - 1);
  const totals = { ...ps.season.totals };
  const rng = createRng(`${ps.season.seed}:playoffs:${ps.day}`);
  const current = ps.rounds[ps.rounds.length - 1].map((s) => {
    if (seriesOver(s)) return s;
    const g = s.games.length;
    const homeIsHi = HI_HOME[g];
    const [home, away] = homeIsHi ? [s.hi, s.lo] : [s.lo, s.hi];
    const result = playGame(ps.season.teams, injuries, totals, home, away, rng, () => {});
    const homeWon = result.homeScore > result.awayScore;
    const hiWon = homeWon === homeIsHi;
    return {
      ...s,
      winsHi: s.winsHi + (hiWon ? 1 : 0),
      winsLo: s.winsLo + (hiWon ? 0 : 1),
      games: [...s.games, { result, homeIsHi }],
    };
  });
  const rounds = [...ps.rounds.slice(0, -1), current];
  if (current.every(seriesOver) && current.length > 1) {
    const next: Series[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const a = current[i];
      const b = current[i + 1];
      const wa = seriesWinner(a)!;
      const wb = seriesWinner(b)!;
      const sa = wa === a.hi ? a.seedHi : a.seedLo;
      const sb = wb === b.hi ? b.seedHi : b.seedLo;
      next.push(sa <= sb ? mk(wa, wb, sa, sb) : mk(wb, wa, sb, sa));
    }
    rounds.push(next);
  }
  return { ...ps, rounds, injuries, day: ps.day + 1, season: { ...ps.season, totals } };
}

export function champion(ps: PlayoffState): number | null {
  if (ps.rounds.length < 4) return null;
  const final = ps.rounds[3][0];
  return seriesWinner(final);
}

export function simPlayoffsToEnd(ps: PlayoffState): PlayoffState {
  let s = ps;
  for (let i = 0; i < 40 && champion(s) === null; i++) s = playNextGame(s);
  return s;
}

/** The series the given team is in (or was eliminated in), latest round first. */
export function seriesFor(ps: PlayoffState, team: number): { round: number; series: Series } | null {
  for (let r = ps.rounds.length - 1; r >= 0; r--) {
    const s = ps.rounds[r].find((x) => x.hi === team || x.lo === team);
    if (s) return { round: r, series: s };
  }
  return null;
}
