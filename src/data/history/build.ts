import type { Player, Pool, TeamSeason } from '../../engine/types';
import { parseRoster } from '../build';

/** A historical team-season. `year` is the year the season ended (1996 = 1995-96). */
export function season(
  franchise: string, city: string, name: string, year: number, colors: [string, string], roster: string,
): TeamSeason {
  const y = String(year);
  return {
    id: `${franchise}-${y}`, label: `${y} ${name}`, city, name, season: y, colors, franchise,
    players: parseRoster(y, roster),
  };
}

/**
 * Derive a mode's pool: filter seasons, then keep each player once — on his highest-rated season in range
 * (ties go to the earliest). Team-seasons left with nobody are dropped.
 */
export function buildPool(id: string, label: string, seasons: TeamSeason[], filter: (s: TeamSeason) => boolean): Pool {
  const kept = seasons.filter(filter).sort((a, b) => Number(a.season) - Number(b.season));
  const best = new Map<string, { team: string; p: Player }>();
  for (const t of kept)
    for (const p of t.players) {
      const cur = best.get(p.name);
      if (!cur || p.ovr > cur.p.ovr) best.set(p.name, { team: t.id, p });
    }
  const teams = kept
    .map((t) => ({ ...t, players: t.players.filter((p) => best.get(p.name)?.team === t.id) }))
    .filter((t) => t.players.length > 0);
  return { id, label, teams };
}
