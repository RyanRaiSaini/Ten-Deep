import type { Pool, TeamSeason } from '../../engine/types';
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
 * Derive a mode's pool: the team-seasons in range, each with its whole roster. A player can be on several of them
 * (LeBron in 2016 and in 2018); the draft never lets you take the same person twice. Empty team-seasons are dropped.
 */
export function buildPool(id: string, label: string, seasons: TeamSeason[], filter: (s: TeamSeason) => boolean): Pool {
  const teams = seasons.filter(filter).filter((t) => t.players.length > 0).sort((a, b) => Number(a.season) - Number(b.season));
  return { id, label, teams };
}
