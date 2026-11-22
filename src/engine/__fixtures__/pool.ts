import { createRng } from '../rng';
import { POSITIONS, type Player, type Pool, type TeamSeason } from '../types';

/** Synthetic pool for tests: `teams` teams of 13 players with a realistic rating spread. */
export function makePool(teams = 30, seed = 'fixture'): Pool {
  const rng = createRng(seed);
  const out: TeamSeason[] = [];
  for (let t = 0; t < teams; t++) {
    const players: Player[] = [];
    for (let i = 0; i < 13; i++) {
      const pos = POSITIONS[i % 5];
      const base = i === 0 ? rng.int(86, 97) : i < 5 ? rng.int(74, 88) : rng.int(64, 78);
      const ovr = Math.max(64, Math.min(99, base));
      const j = () => Math.max(40, Math.min(99, Math.round(rng.normal(ovr, 6))));
      players.push({
        id: `t${t}p${i}`, name: `Player ${t}-${i}`, pos,
        pos2: POSITIONS[(i + 1) % 5],
        ovr, off: j(), def: j(), reb: j(), ast: j(), three: j(), dur: rng.int(55, 95),
      });
    }
    out.push({
      id: `t${t}`, label: `Team ${t}`, city: `City ${t}`, name: `Team ${t}`, season: '2026-27',
      colors: ['#123456', '#abcdef'], players,
    });
  }
  return { id: 'fixture', label: 'Fixture', teams: out };
}
