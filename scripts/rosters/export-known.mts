/**
 * Dump the ratings the game already has (curated history + the 2026-27 rosters) to JSON, so the roster builder
 * can learn a stats → rating formula from them and keep every hand-set rating exactly.
 *   npx tsx scripts/rosters/export-known.mts <out.json>
 */
import { writeFileSync } from 'node:fs';
import { current2026 } from '../../src/data/current2026';
import { HISTORY } from '../../src/data/modes';

const teams = [...HISTORY.filter((t) => !t.season.includes('-')), ...current2026.teams.filter((t) => t.id !== 'rookies-2026')].map((t) => ({
  id: t.id, franchise: t.franchise ?? t.id.split('-')[0], city: t.city, name: t.name, season: t.season, colors: t.colors,
  players: t.players.map((p) => ({ name: p.name, pos: p.pos, pos2: p.pos2 ?? null, ovr: p.ovr, age: p.age ?? null, tag: p.tag ?? null, dur: p.dur })),
}));
writeFileSync(process.argv[2], JSON.stringify(teams));
console.log(teams.length, 'team-seasons,', teams.reduce((n, t) => n + t.players.length, 0), 'players');
