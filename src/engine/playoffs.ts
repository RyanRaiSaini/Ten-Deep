import type { GameResult } from './game';
import { createRng } from './rng';
import type { Conf } from './conference';
import { confStandings, injuredIds, playGame, serveGame, standings, type SeasonState } from './season';

export interface Series {
  /** Team indexes into SeasonState.teams; hi = higher seed (home court). */
  hi: number;
  lo: number;
  seedHi: number;
  seedLo: number;
  winsHi: number;
  winsLo: number;
  games: { result: GameResult; homeIsHi: boolean }[];
  /** The conference this series is in (0 East, 1 West); none for the Finals or a one-table bracket. */
  conf?: Conf;
}

/**
 * A play-in game (one game, the higher seed at home): 'a' is 7 v 8 (winner is the 7 seed), 'b' is 9 v 10 (loser
 * is out), 'c' is the loser of 'a' v the winner of 'b' for the 8 seed.
 */
export interface PlayInGame {
  conf: Conf;
  stage: 'a' | 'b' | 'c';
  home: number;
  away: number;
  seedHome: number;
  seedAway: number;
  result: GameResult;
}

export interface PlayoffState {
  season: SeasonState;
  rounds: Series[][];
  injuries: { [playerId: string]: number };
  /** Playoff-only stat totals (regular season stays in season.totals). */
  totals: SeasonState['totals'];
  day: number;
  /** Conference seasons: the play-in, played as the playoffs open (East's three games, then West's). */
  playIn?: PlayInGame[];
}

const FIRST_ROUND: [number, number][] = [[1, 16], [8, 9], [5, 12], [4, 13], [3, 14], [6, 11], [7, 10], [2, 15]];
/** 2-2-1-1-1 home court for the higher seed. */
const HI_HOME = [true, true, false, false, true, false, true];

export const seriesOver = (s: Series) => s.winsHi === 4 || s.winsLo === 4;
export const seriesWinner = (s: Series) => (s.winsHi === 4 ? s.hi : s.winsLo === 4 ? s.lo : null);

/** Per conference: 1 v 8, 4 v 5, 3 v 6, 2 v 7, so the 1 and 2 seeds can only meet in the conference finals. */
const CONF_FIRST_ROUND: [number, number][] = [[1, 8], [4, 5], [3, 6], [2, 7]];

export const winnerOf = (g: PlayInGame) => (g.result.homeScore > g.result.awayScore ? g.home : g.away);
export const loserOf = (g: PlayInGame) => (g.result.homeScore > g.result.awayScore ? g.away : g.home);

export function startPlayoffs(season: SeasonState): PlayoffState {
  const injuries = { ...season.injuries };
  if (!season.divs) {
    const table = standings(season);
    const bySeed = (seed: number) => table[seed - 1].team;
    const rounds = [FIRST_ROUND.map(([a, b]) => mk(bySeed(a), bySeed(b), a, b))];
    return { season, rounds, injuries, totals: {}, day: 0 };
  }
  // Play-in: injuries carry on into the playoffs; the stats don't count (like the real thing).
  const scratch: SeasonState['totals'] = {};
  const playIn: PlayInGame[] = [];
  const first: Series[] = [];
  for (const conf of [0, 1] as Conf[]) {
    const table = confStandings(season, conf).map((r) => r.team);
    const rng = createRng(`${season.seed}:play-in:${conf}`);
    const game = (stage: PlayInGame['stage'], home: number, away: number, seedHome: number, seedAway: number) => {
      const sittingOut = injuredIds(injuries);
      const result = playGame(season.teams, injuries, scratch, home, away, rng, () => {}, true);
      serveGame(injuries, sittingOut);
      const g: PlayInGame = { conf, stage, home, away, seedHome, seedAway, result };
      playIn.push(g);
      return g;
    };
    const a = game('a', table[6], table[7], 7, 8);
    const b = game('b', table[8], table[9], 9, 10);
    const c = game('c', loserOf(a), winnerOf(b), loserOf(a) === table[6] ? 7 : 8, winnerOf(b) === table[8] ? 9 : 10);
    const seeds = [...table.slice(0, 6), winnerOf(a), winnerOf(c)];
    for (const [x, y] of CONF_FIRST_ROUND) first.push({ ...mk(seeds[x - 1], seeds[y - 1], x, y), conf });
  }
  return { season, rounds: [first], injuries, totals: {}, day: 0, playIn };
}

function mk(hi: number, lo: number, seedHi: number, seedLo: number): Series {
  return { hi, lo, seedHi, seedLo, winsHi: 0, winsLo: 0, games: [] };
}

/** Pair two series winners for the next round: the better seed hosts; across conferences (the Finals), the better record. */
function nextSeries(ps: PlayoffState, a: Series, b: Series): Series {
  const wa = seriesWinner(a)!;
  const wb = seriesWinner(b)!;
  const sa = wa === a.hi ? a.seedHi : a.seedLo;
  const sb = wb === b.hi ? b.seedHi : b.seedLo;
  if (a.conf !== undefined && a.conf === b.conf) return { ...(sa <= sb ? mk(wa, wb, sa, sb) : mk(wb, wa, sb, sa)), conf: a.conf };
  if (a.conf === undefined) return sa <= sb ? mk(wa, wb, sa, sb) : mk(wb, wa, sb, sa);
  const rank = new Map(standings(ps.season).map((r, i) => [r.team, i]));
  return rank.get(wa)! <= rank.get(wb)! ? mk(wa, wb, sa, sb) : mk(wb, wa, sb, sa);
}

/** Play the next game of every unfinished series in the current round; opens the next round when it's done. */
export function playNextGame(ps: PlayoffState): PlayoffState {
  if (champion(ps) !== null) return ps;
  const injuries = { ...ps.injuries };
  const sittingOut = injuredIds(injuries);
  // Playoff stats are kept apart from the regular season; copy inner objects so earlier states stay intact.
  const totals = Object.fromEntries(Object.entries(ps.totals ?? {}).map(([k, v]) => [k, { ...v }]));
  const rng = createRng(`${ps.season.seed}:playoffs:${ps.day}`);
  const current = ps.rounds[ps.rounds.length - 1].map((s) => {
    if (seriesOver(s)) return s;
    const g = s.games.length;
    const homeIsHi = HI_HOME[g];
    const [home, away] = homeIsHi ? [s.hi, s.lo] : [s.lo, s.hi];
    const result = playGame(ps.season.teams, injuries, totals, home, away, rng, () => {}, true);
    const homeWon = result.homeScore > result.awayScore;
    const hiWon = homeWon === homeIsHi;
    return {
      ...s,
      winsHi: s.winsHi + (hiWon ? 1 : 0),
      winsLo: s.winsLo + (hiWon ? 0 : 1),
      games: [...s.games, { result, homeIsHi }],
    };
  });
  serveGame(injuries, sittingOut);
  const rounds = [...ps.rounds.slice(0, -1), current];
  if (current.every(seriesOver) && current.length > 1) {
    const next: Series[] = [];
    for (let i = 0; i < current.length; i += 2) next.push(nextSeries(ps, current[i], current[i + 1]));
    rounds.push(next);
  }
  return { ...ps, rounds, injuries, totals, day: ps.day + 1 };
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

/** A team's play-in games, in order (empty if it skipped the play-in or the season has no conferences). */
export const playInFor = (ps: PlayoffState, team: number) => (ps.playIn ?? []).filter((g) => g.home === team || g.away === team);

/** Knocked out in the play-in: played in it and never reached a series. */
export const outInPlayIn = (ps: PlayoffState, team: number) => playInFor(ps, team).length > 0 && !ps.rounds[0].some((s) => s.hi === team || s.lo === team);

/** The series the given team is in (or was eliminated in), latest round first. */
export function seriesFor(ps: PlayoffState, team: number): { round: number; series: Series } | null {
  for (let r = ps.rounds.length - 1; r >= 0; r--) {
    const s = ps.rounds[r].find((x) => x.hi === team || x.lo === team);
    if (s) return { round: r, series: s };
  }
  return null;
}
