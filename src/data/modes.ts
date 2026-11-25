import type { Pool, TeamSeason } from '../engine/types';
import { current2026 } from './current2026';
import { buildPool } from './history/build';
import { fullSeasons } from './fullHistory';
import { bulls } from './history/bulls';
import { celtics } from './history/celtics';
import { classics } from './history/classics';
import { east } from './history/east';
import { heat } from './history/heat';
import { knicks } from './history/knicks';
import { lakers } from './history/lakers';
import { others } from './history/others';
import { pistons } from './history/pistons';
import { rockets } from './history/rockets';
import { sixers } from './history/sixers';
import { spurs } from './history/spurs';
import { warriors } from './history/warriors';
import { west } from './history/west';

/** Year a team-season belongs to (2026-27 counts as 2026). */
export const yearOf = (t: TeamSeason) => parseInt(t.season, 10);

/** Current-day teams join the history so All-Time, Steph Era and franchises include them. */
const currentAsHistory: TeamSeason[] = current2026.teams
  .filter((t) => t.id !== 'rookies-2026')
  .map((t) => ({ ...t, franchise: t.id.split('-')[0] }));

/** The hand-built history (the famous team-seasons, each with its key players). Collectible cards come from these. */
export const HISTORY: TeamSeason[] = [
  ...lakers, ...celtics, ...bulls, ...warriors, ...spurs, ...knicks, ...heat, ...sixers, ...pistons, ...rockets,
  ...others, ...classics, ...west, ...east, ...currentAsHistory,
];

let seasonsCache: TeamSeason[] | null = null;
/**
 * Every team-season the draft modes use: every team of every season the full rosters cover (src/data/fullHistory.ts,
 * which already carry the hand-rated players), the hand-built seasons from before that, and the 2026-27 rosters.
 */
export function allSeasons(): TeamSeason[] {
  if (!seasonsCache) {
    const full = fullSeasons();
    const ids = new Set(full.map((t) => t.id));
    // A hand-built season the full rosters don't cover (or name differently) is kept as it is.
    seasonsCache = [...HISTORY.filter((t) => t.season.includes('-') || !ids.has(t.id)), ...full];
  }
  return seasonsCache;
}

export type ModeKind = 'current' | 'franchise' | 'era';

export interface Mode {
  id: string;
  kind: ModeKind;
  title: string;
  subtitle: string;
  pool: Pool;
  /** Pool the 29 AI teams draft from (franchise modes use All-Time). */
  leaguePoolId: string;
  colors: [string, string];
  /** One line about the era, shown on its banner. */
  tagline?: string;
  /** Kept so saved runs and shared links still open, but no longer offered in the pickers. */
  hidden?: boolean;
}

/** Pools are built the first time a mode is opened (39 of them at launch cost real time on phones). */
function lazyPool(m: Omit<Mode, 'pool'>, build: () => Pool): Mode {
  let cache: Pool | undefined;
  return Object.defineProperty(m, 'pool', { get: () => (cache ??= build()), enumerable: true }) as Mode;
}

const era = (id: string, title: string, from: number, to: number, colors: [string, string], extra: Pick<Mode, 'tagline' | 'hidden'> = {}): Mode =>
  lazyPool({ id, kind: 'era', title, subtitle: from === 0 ? 'Every era' : `${from}–${to}`, colors, leaguePoolId: id, ...extra },
    () => buildPool(id, title, allSeasons(), (t) => yearOf(t) >= from && yearOf(t) <= to));

const FRANCHISES: [string, string, [string, string]][] = [
  ['lal', 'All-Time Lakers', ['#552583', '#FDB927']],
  ['bos', 'All-Time Celtics', ['#007A33', '#BA9653']],
  ['chi', 'All-Time Bulls', ['#CE1141', '#000000']],
  ['gsw', 'All-Time Warriors', ['#1D428A', '#FFC72C']],
  ['sas', 'All-Time Spurs', ['#C4CED4', '#000000']],
  ['nyk', 'All-Time Knicks', ['#006BB6', '#F58426']],
  ['mia', 'All-Time Heat', ['#98002E', '#F9A01B']],
  ['phi', 'All-Time 76ers', ['#006BB6', '#ED174C']],
  ['det', 'All-Time Pistons', ['#C8102E', '#1D42BA']],
  ['hou', 'All-Time Rockets', ['#CE1141', '#000000']],
  ['atl', 'All-Time Hawks', ['#C8102E', '#FDB927']],
  ['bkn', 'All-Time Nets', ['#000000', '#FFFFFF']],
  ['cha', 'All-Time Hornets', ['#1D1160', '#00788C']],
  ['cle', 'All-Time Cavaliers', ['#860038', '#FDBB30']],
  ['dal', 'All-Time Mavericks', ['#00538C', '#B8C4CA']],
  ['den', 'All-Time Nuggets', ['#0E2240', '#FEC524']],
  ['ind', 'All-Time Pacers', ['#002D62', '#FDBB30']],
  ['lac', 'All-Time Clippers', ['#C8102E', '#1D428A']],
  ['mem', 'All-Time Grizzlies', ['#5D76A9', '#12173F']],
  ['mil', 'All-Time Bucks', ['#00471B', '#EEE1C6']],
  ['min', 'All-Time Timberwolves', ['#0C2340', '#78BE20']],
  ['nop', 'All-Time Pelicans', ['#0C2340', '#C8102E']],
  ['okc', 'All-Time Thunder', ['#007AC1', '#EF3B24']],
  ['orl', 'All-Time Magic', ['#0077C0', '#C4CED4']],
  ['phx', 'All-Time Suns', ['#1D1160', '#E56020']],
  ['por', 'All-Time Trail Blazers', ['#E03A3E', '#000000']],
  ['sac', 'All-Time Kings', ['#5A2D81', '#63727A']],
  ['tor', 'All-Time Raptors', ['#CE1141', '#000000']],
  ['uta', 'All-Time Jazz', ['#002B5C', '#F9A01B']],
  ['was', 'All-Time Wizards', ['#002B5C', '#E31837']],
];

const franchise = ([key, title, colors]: (typeof FRANCHISES)[number]): Mode =>
  lazyPool({ id: `franchise-${key}`, kind: 'franchise', title, subtitle: 'Franchise history', colors, leaguePoolId: 'all-time' },
    () => buildPool(`franchise-${key}`, title, allSeasons(), (t) => t.franchise === key));

export const MODES: Mode[] = [
  { id: 'current-2026', kind: 'current', title: 'Current Day', subtitle: '2026-27', pool: current2026, leaguePoolId: 'current-2026', colors: ['#E8833A', '#3DF2C2'] },
  era('all-time', 'All-Time', 0, 9999, ['#F5C451', '#0B1020'], { tagline: 'Every legend, every season, one draft.' }),
  // The owner's eras (season years, the year a season ends; each era includes its first and last year).
  era('era-magic-bird', 'Magic vs. Bird', 1984, 1991, ['#552583', '#007A33'], { tagline: 'Showtime against the Garden.' }),
  era('era-jordan', 'Jordan Era', 1991, 2003, ['#CE1141', '#000000'], { tagline: 'Two three-peats in Chicago.' }),
  era('era-kobe', 'Kobe Era', 2003, 2010, ['#552583', '#FDB927'], { tagline: 'Mamba mentality, back-to-back titles.' }),
  era('era-lebron', 'LeBron Era', 2010, 2016, ['#860038', '#FDBB30'], { tagline: 'The Heatles, then the comeback in Cleveland.' }),
  era('era-steph', 'Steph Era', 2016, 2020, ['#1D428A', '#FFC72C'], { tagline: 'Splash Brothers and the 73-win season.' }),
  era('era-modern', 'Modern Era', 2020, 2026, ['#0E7C86', '#FF7417'], { tagline: 'Giannis, Jokić, SGA and Wemby.' }),
  // Retired from the pickers (older saves and links still open them).
  era('era-shaq-kobe-duncan', 'Shaq, Kobe & Duncan Era', 1999, 2010, ['#552583', '#C4CED4'], { hidden: true }),
  era('era-1980s', 'NBA 1980s', 1980, 1989, ['#E8833A', '#5A2D81'], { hidden: true }),
  era('era-1990s', 'NBA 1990s', 1990, 1999, ['#00788C', '#1D1160'], { hidden: true }),
  era('era-2010s', 'NBA 2010s', 2010, 2019, ['#3DF2C2', '#141B2E'], { hidden: true }),
  ...FRANCHISES.map(franchise),
];

export const MODE_BY_ID: Record<string, Mode> = Object.fromEntries(MODES.map((m) => [m.id, m]));

/** 29 AI rosters × 10 plus headroom for the user's picks and cap-friendly benches. */
const MIN_LEAGUE_POOL = 360;

/** Pool the AI league drafts from: the mode's own when it's deep enough, otherwise All-Time. */
export function leaguePoolFor(mode: Mode): string {
  const own = MODE_BY_ID[mode.leaguePoolId];
  const size = own.pool.teams.reduce((n, t) => n + t.players.length, 0);
  return size >= MIN_LEAGUE_POOL ? own.id : 'all-time';
}
