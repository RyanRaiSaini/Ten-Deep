import type { Pool, TeamSeason } from '../engine/types';
import type { LayoutId } from '../engine/conference';
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

/** Same spelling once accents, dots, capitals and spaces are ignored: "J.J. Redick" = "JJ Redick", "Dëmin" = "Demin". */
export const nameKey = (name: string) =>
  name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const SUFFIX = /\s+(jr\.?|sr\.?|ii|iii|iv)$/i;

/**
 * One person, one name everywhere: the data spells some players two ways (J.J. / JJ Redick, Jabari Smith / Jabari
 * Smith Jr.), and the draft keeps the same person off your team by name. Spellings that differ only in accents,
 * dots or spaces are the same person; a Jr./Sr./II/III suffix is the same person only when the careers overlap
 * (Gary Payton and Gary Payton II never played in the same season, so they stay two people). The hand-built
 * spelling wins, then the one used most.
 */
export function unifyNames(seasons: TeamSeason[], preferred: ReadonlySet<string>): TeamSeason[] {
  const uses = new Map<string, { count: number; years: number[] }>();
  for (const t of seasons) for (const p of t.players) {
    const u = uses.get(p.name) ?? { count: 0, years: [] };
    u.count++; u.years.push(yearOf(t));
    uses.set(p.name, u);
  }
  const rank = (n: string) => (preferred.has(n) ? 1e6 : 0) + (uses.get(n)?.count ?? 0);
  const canonical = new Map<string, string>();
  // Spelling variants.
  const byKey = new Map<string, string[]>();
  for (const n of uses.keys()) byKey.set(nameKey(n), [...(byKey.get(nameKey(n)) ?? []), n]);
  for (const names of byKey.values()) {
    if (names.length < 2) continue;
    const best = [...names].sort((a, b) => rank(b) - rank(a) || a.localeCompare(b))[0];
    for (const n of names) if (n !== best) canonical.set(n, best);
  }
  // Suffix variants whose careers overlap.
  const span = (n: string) => { const y = uses.get(n)!.years; return [Math.min(...y), Math.max(...y)]; };
  const base = new Map<string, string[]>();
  for (const n of uses.keys()) if (!canonical.has(n)) { const k = nameKey(n.replace(SUFFIX, '')); base.set(k, [...(base.get(k) ?? []), n]); }
  for (const names of base.values()) {
    if (names.length < 2) continue;
    const plain = names.filter((n) => !SUFFIX.test(n));
    for (const suffixed of names.filter((n) => SUFFIX.test(n))) {
      const [a0, a1] = span(suffixed);
      for (const p of plain) {
        const [b0, b1] = span(p);
        if (a0 <= b1 + 1 && b0 <= a1 + 1) {
          const best = rank(suffixed) >= rank(p) ? suffixed : p;
          canonical.set(best === p ? suffixed : p, best);
        }
      }
    }
  }
  if (!canonical.size) return seasons;
  return seasons.map((t) => (t.players.some((p) => canonical.has(p.name))
    ? { ...t, players: t.players.map((p) => (canonical.has(p.name) ? { ...p, name: canonical.get(p.name)! } : p)) }
    : t));
}

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
    const preferred = new Set(HISTORY.flatMap((t) => t.players.map((p) => p.name)));
    seasonsCache = unifyNames([...HISTORY.filter((t) => t.season.includes('-') || !ids.has(t.id)), ...full], preferred);
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
  /**
   * An era plays in its own dollars: that season's real salary cap ($M), and every price scaled to it.
   * Prices are each player's real share of his own season's cap, so only the dollar figures change.
   */
  cap?: { season: string; real: number };
  /** The league of that era (its teams, conferences and divisions); today's when unset. */
  layout?: LayoutId;
}

/** Pools are built the first time a mode is opened (39 of them at launch cost real time on phones). */
function lazyPool(m: Omit<Mode, 'pool'>, build: () => Pool): Mode {
  let cache: Pool | undefined;
  return Object.defineProperty(m, 'pool', { get: () => (cache ??= build()), enumerable: true }) as Mode;
}

const era = (id: string, title: string, from: number, to: number, colors: [string, string], extra: Pick<Mode, 'tagline' | 'hidden' | 'cap' | 'layout'> = {}): Mode =>
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
  era('era-magic-bird', 'Magic vs. Bird', 1984, 1991, ['#552583', '#007A33'], { tagline: 'Showtime against the Garden.', cap: { season: '1987-88', real: 6.164 }, layout: 'y1988' }),
  era('era-jordan', 'Jordan Era', 1991, 2003, ['#CE1141', '#000000'], { tagline: 'Two three-peats in Chicago.', cap: { season: '1996-97', real: 24.363 }, layout: 'y1997' }),
  era('era-kobe', 'Kobe Era', 2003, 2010, ['#552583', '#FDB927'], { tagline: 'Mamba mentality, back-to-back titles.', cap: { season: '2006-07', real: 53.135 } }),
  era('era-lebron', 'LeBron Era', 2010, 2016, ['#860038', '#FDBB30'], { tagline: 'The Heatles, then the comeback in Cleveland.', cap: { season: '2012-13', real: 58.044 } }),
  era('era-steph', 'Steph Era', 2016, 2020, ['#1D428A', '#FFC72C'], { tagline: 'Splash Brothers and the 73-win season.', cap: { season: '2017-18', real: 99.093 } }),
  era('era-modern', 'Modern Era', 2020, 2026, ['#0E7C86', '#FF7417'], { tagline: 'Giannis, Jokić, SGA and Wemby.', cap: { season: '2022-23', real: 123.655 } }),
  // Retired from the pickers (older saves and links still open them).
  era('era-shaq-kobe-duncan', 'Shaq, Kobe & Duncan Era', 1999, 2010, ['#552583', '#C4CED4'], { hidden: true, cap: { season: '2004-05', real: 43.87 } }),
  era('era-1980s', 'NBA 1980s', 1980, 1989, ['#E8833A', '#5A2D81'], { hidden: true, cap: { season: '1986-87', real: 4.945 }, layout: 'y1988' }),
  era('era-1990s', 'NBA 1990s', 1990, 1999, ['#00788C', '#1D1160'], { hidden: true, cap: { season: '1994-95', real: 15.964 }, layout: 'y1997' }),
  era('era-2010s', 'NBA 2010s', 2010, 2019, ['#3DF2C2', '#141B2E'], { hidden: true, cap: { season: '2014-15', real: 63.065 } }),
  ...FRANCHISES.map(franchise),
];

let classicPool: Pool | null = null;
/**
 * The famous players only (the hand-built history), each once on his best season: the pool the daily games
 * (trivia, Who's better, Player Rank) ask about. Stable, so a day's questions never change under a player.
 */
export function classicAllTime(): Pool {
  if (!classicPool) {
    const best = new Map<string, { team: string; ovr: number }>();
    const kept = [...HISTORY].sort((a, b) => Number(a.season) - Number(b.season));
    for (const t of kept) for (const p of t.players) { const cur = best.get(p.name); if (!cur || p.ovr > cur.ovr) best.set(p.name, { team: t.id, ovr: p.ovr }); }
    const teams = kept.map((t) => ({ ...t, players: t.players.filter((p) => best.get(p.name)?.team === t.id) })).filter((t) => t.players.length > 0);
    classicPool = { id: 'all-time', label: 'All-Time', teams };
  }
  return classicPool;
}

export const MODE_BY_ID: Record<string, Mode> = Object.fromEntries(MODES.map((m) => [m.id, m]));

/** The game's cap ($M) that an era's real cap stands for. */
const GAME_CAP = 200;
/** Multiply game dollars by this to show a mode's own dollars (1 outside the eras). */
export const moneyScaleFor = (poolId: string | undefined): number => {
  const cap = poolId ? MODE_BY_ID[poolId]?.cap : undefined;
  return cap ? cap.real / GAME_CAP : 1;
};

/** 29 AI rosters × 10 plus headroom for the user's picks and cap-friendly benches. */
const MIN_LEAGUE_POOL = 360;

/** Pool the AI league drafts from: the mode's own when it's deep enough, otherwise All-Time. */
export function leaguePoolFor(mode: Mode): string {
  const own = MODE_BY_ID[mode.leaguePoolId];
  const size = own.pool.teams.reduce((n, t) => n + t.players.length, 0);
  return size >= MIN_LEAGUE_POOL ? own.id : 'all-time';
}
