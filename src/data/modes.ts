import type { Pool, TeamSeason } from '../engine/types';
import { current2026 } from './current2026';
import { buildPool } from './history/build';
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

export const HISTORY: TeamSeason[] = [
  ...lakers, ...celtics, ...bulls, ...warriors, ...spurs, ...knicks, ...heat, ...sixers, ...pistons, ...rockets,
  ...others, ...classics, ...west, ...east, ...currentAsHistory,
];

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
}

const era = (id: string, title: string, from: number, to: number, colors: [string, string]): Mode => ({
  id, kind: 'era', title, subtitle: from === 0 ? 'Every era' : `${from}–${to}`, colors, leaguePoolId: id,
  pool: buildPool(id, title, HISTORY, (t) => yearOf(t) >= from && yearOf(t) <= to),
});

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

const franchise = ([key, title, colors]: (typeof FRANCHISES)[number]): Mode => ({
  id: `franchise-${key}`, kind: 'franchise', title, subtitle: 'Franchise history', colors, leaguePoolId: 'all-time',
  pool: buildPool(`franchise-${key}`, title, HISTORY, (t) => t.franchise === key),
});

export const MODES: Mode[] = [
  { id: 'current-2026', kind: 'current', title: 'Current Day', subtitle: '2026-27', pool: current2026, leaguePoolId: 'current-2026', colors: ['#E8833A', '#3DF2C2'] },
  era('all-time', 'All-Time', 0, 9999, ['#F5C451', '#0B1020']),
  era('era-jordan', 'Jordan Era', 1984, 1998, ['#CE1141', '#000000']),
  era('era-shaq-kobe-duncan', 'Shaq, Kobe & Duncan Era', 1999, 2010, ['#552583', '#C4CED4']),
  era('era-lebron', 'LeBron Era', 2003, 2018, ['#860038', '#98002E']),
  era('era-steph', 'Steph Era', 2015, 2026, ['#1D428A', '#FFC72C']),
  era('era-1980s', 'NBA 1980s', 1980, 1989, ['#E8833A', '#5A2D81']),
  era('era-1990s', 'NBA 1990s', 1990, 1999, ['#00788C', '#1D1160']),
  era('era-2010s', 'NBA 2010s', 2010, 2019, ['#3DF2C2', '#141B2E']),
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
