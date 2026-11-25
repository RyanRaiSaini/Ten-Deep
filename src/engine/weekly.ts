/**
 * The Weekly Challenge: one draft a week (Monday to Sunday), the same spins and the same league for everyone,
 * one attempt each. Most wins tops the board; playoff depth breaks ties, then fewer losses, then who finished first.
 * Shared by the app and api/weekly.ts.
 */
import type { PickType } from './collect/picks';
import { weekKey } from './progress/missions';

export { weekKey };
export const weeklySeed = (week: string) => `weekly-${week}`;

/** How far a run went: 0 missed (or out in the play-in), 1 out in the first round … 4 lost the Finals, 5 champions. */
export type Depth = 0 | 1 | 2 | 3 | 4 | 5;
export const depthOf = (r: { champion: boolean; round: number }): Depth =>
  (r.champion ? 5 : r.round < 0 ? 0 : (r.round + 1)) as Depth;

export interface WeeklyEntry {
  pin: string;
  name: string;
  w: number;
  l: number;
  depth: Depth;
  /** Squad Rating, rounded. */
  sr: number;
  /** When it was submitted (ISO), the last tiebreak. */
  at: string;
}

const PIN = /^[A-HJKMNP-Z2-9]{6}$/;
const WEEK = /^\d{4}-\d{2}-\d{2}$/;
export const isWeek = (w: string) => WEEK.test(w) && weekKey(w) === w;
export const isPin = (p: string) => PIN.test(p);

/** Display names: letters, numbers, spaces and a few marks, 1 to 20 characters. */
export function cleanName(name: string): string {
  return name.replace(/[^\p{L}\p{N} '’._-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 20) || 'Player';
}

const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

/** Each entry is its own stored file whose path carries the whole row, so one listing reads the board. */
export const entryPrefix = (week: string, pin?: string) => `weekly/${week}/${pin ? `${pin}~` : ''}`;
export function entryPath(week: string, e: Omit<WeeklyEntry, 'at'>): string {
  return `${entryPrefix(week)}${e.pin}~${e.w}~${e.l}~${e.depth}~${e.sr}~${b64(cleanName(e.name))}.json`;
}
export function parseEntry(path: string, at: string): WeeklyEntry | null {
  const m = /\/([A-HJKMNP-Z2-9]{6})~(\d{1,2})~(\d{1,2})~([0-5])~(\d{2})~([A-Za-z0-9_-]+)\.json$/.exec(path);
  if (!m) return null;
  try {
    return { pin: m[1], w: +m[2], l: +m[3], depth: +m[4] as Depth, sr: +m[5], name: cleanName(unb64(m[6])), at };
  } catch { return null; }
}

/** A plausible finished run: 82 games, a real depth, a Squad Rating in range. */
export function validEntry(e: { w: number; l: number; depth: number; sr: number }): boolean {
  const int = (n: number, lo: number, hi: number) => Number.isInteger(n) && n >= lo && n <= hi;
  return int(e.w, 0, 82) && int(e.l, 0, 82) && e.w + e.l === 82 && int(e.depth, 0, 5) && int(e.sr, 40, 99);
}

export function sortBoard(entries: WeeklyEntry[]): WeeklyEntry[] {
  return [...entries].sort((a, b) => b.w - a.w || b.depth - a.depth || a.l - b.l || a.at.localeCompare(b.at) || a.pin.localeCompare(b.pin));
}

/** The pick a final rank earns once the week is over (null: just the run's own pick). */
export function weeklyPrize(rank: number, total: number): PickType | null {
  if (rank < 1 || rank > total) return null;
  if (rank === 1) return 'mythic';
  if (rank <= 10) return 'weekly';
  if (rank <= Math.ceil(total * 0.25)) return 'good';
  return null;
}

/** The weeks a submission may be for: the server's current week, or either neighbor (time zones, late finishes). */
export function acceptedWeeks(now: Date): string[] {
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const cur = weekKey(day(now));
  const shift = (n: number) => { const d = new Date(`${cur}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return day(d); };
  return [shift(-7), cur, shift(7)];
}

/** The Monday before `week`. */
export function previousWeek(week: string): string {
  const d = new Date(`${week}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

/** When `week` ends (Monday after, 00:00 local is close enough for a countdown). */
export function weekEnds(week: string): Date {
  const [y, m, d] = week.split('-').map(Number);
  return new Date(y, m - 1, d + 7);
}
