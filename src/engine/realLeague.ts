/**
 * The AI league as real teams: each AI team is one of its franchise's real team-seasons, playing that roster
 * (Current Day: the actual 2026-27 rosters). Nobody is moved between teams. A player you drafted is gone from his
 * team, and its own depth moves up; a short roster (history lists only key players) fills up with
 * the franchise's own players from nearby seasons, then anonymous reserves.
 */
import { createRng } from './rng';
import { franchiseOf } from './conference';
import {
  ALL_SLOTS, BENCH_SLOTS, STARTER_SLOTS, type Player, type Pos, type Roster, type RosterSlots, type TeamSeason,
} from './types';

const fits = (p: Player, pos: Pos) => p.pos === pos || p.pos2 === pos;
/** Rating of a reserve who fills a short roster's empty spot. */
export const RESERVE_OVR = 72;

/**
 * A team's ten-man rotation from its own players: the five starters that make the best lineup (every spot filled
 * by someone who can play it, when possible), then the next five as the bench in rating order.
 */
export function realRotation(players: Player[], idPrefix: string, depth: Player[] = []): RosterSlots {
  const pool = [...players].sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id));
  const slots: RosterSlots = {};
  // Fill the positions with the fewest candidates first, each with its best available player.
  const order = [...STARTER_SLOTS].sort((a, b) => pool.filter((p) => fits(p, a as Pos)).length - pool.filter((p) => fits(p, b as Pos)).length);
  for (const s of order) {
    const i = pool.findIndex((p) => fits(p, s as Pos));
    if (i >= 0) slots[s] = pool.splice(i, 1)[0];
  }
  // Nobody can play a spot: the best player left takes it.
  for (const s of STARTER_SLOTS) if (!slots[s] && pool.length) slots[s] = pool.shift();
  for (const s of BENCH_SLOTS) if (pool.length) slots[s] = pool.shift();
  // Still short: the franchise's own players from nearby seasons, best first (a starter's spot needs his position).
  const extra = depth.filter((p) => !players.some((x) => x.name === p.name));
  for (const s of ALL_SLOTS) {
    if (slots[s]) continue;
    const i = extra.findIndex((p) => BENCH_SLOTS.includes(s) || fits(p, s as Pos));
    if (i >= 0) slots[s] = extra.splice(i, 1)[0];
  }
  // Short roster (history lists a team's key players): reserves rated like a typical end of the bench.
  for (const s of ALL_SLOTS) {
    slots[s] ??= { id: `${idPrefix}-reserve-${s}`, name: 'Reserve', pos: (STARTER_SLOTS.includes(s) ? s : 'SF') as Pos, ovr: RESERVE_OVR, off: RESERVE_OVR - 1, def: RESERVE_OVR - 1, reb: 68, ast: 66, three: 66, dur: 90 };
  }
  return slots;
}

/** How good a team-season is on paper: the average of its best eight players. */
const rosterScore = (t: TeamSeason) => {
  const top = t.players.map((p) => p.ovr).sort((a, b) => b - a).slice(0, 8);
  return top.reduce((a, b) => a + b, 0) / Math.max(1, top.length);
};

/**
 * The 29 AI teams for these franchises (in order). Each plays a real team-season of its franchise from `pool`
 * (a seeded pick among its three best when the pool has several), else from `fallback` (closest season to the pool's), else `canonical`.
 * Your players (by name) are left out, and a player already on an earlier AI team isn't used twice.
 */
export function realLeague(
  franchises: readonly string[], mine: readonly Player[], seed: string,
  pool: readonly TeamSeason[], fallback: readonly TeamSeason[], canonical: readonly TeamSeason[],
): Roster[] {
  const rng = createRng(`${seed}:real-league`);
  const years = pool.map((t) => parseInt(t.season, 10)).filter((y) => !Number.isNaN(y));
  const mid = years.length ? years.reduce((a, b) => a + b, 0) / years.length : 2026;
  const used = new Set(mine.map((p) => p.name));
  return franchises.map((f, i) => {
    const own = pool.filter((t) => franchiseOf(t) === f);
    const back = fallback.filter((t) => franchiseOf(t) === f).sort((a, b) => Math.abs(parseInt(a.season, 10) - mid) - Math.abs(parseInt(b.season, 10) - mid));
    // Several seasons to choose from (eras, All-Time): one of the franchise's three best, so it's a team to fear.
    const strongest = [...own].sort((a, b) => rosterScore(b) - rosterScore(a) || a.id.localeCompare(b.id)).slice(0, 3);
    const t = own.length ? rng.pick(strongest) : back[0] ?? canonical.find((x) => franchiseOf(x) === f)!;
    const players = t.players.filter((p) => !used.has(p.name));
    // Depth for a short roster: players from the franchise's other seasons within five years, nearest first.
    const year = parseInt(t.season, 10);
    const seen = new Set<string>();
    const depth = [...own, ...back].filter((x) => x.id !== t.id && Math.abs(parseInt(x.season, 10) - year) <= 5)
      .sort((a, b) => Math.abs(parseInt(a.season, 10) - year) - Math.abs(parseInt(b.season, 10) - year))
      .flatMap((x) => x.players)
      .filter((p) => !used.has(p.name) && !seen.has(p.name) && seen.add(p.name))
      .sort((a, b) => b.ovr - a.ovr);
    const slots = realRotation(players, `ai-${i}`, depth);
    for (const s of ALL_SLOTS) used.add(slots[s]!.name);
    return { id: `ai-${i}`, name: `${t.city} ${t.name}`, colors: t.colors, franchise: f, slots: slots as Required<RosterSlots> };
  });
}
