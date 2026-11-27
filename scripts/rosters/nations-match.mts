/**
 * Match the extracted birth countries to every player in the game, apply the owner's calls (the country a player
 * represents or is identified with), and write src/data/nations.ts.
 *   npx tsx scripts/rosters/nations-match.mts <people.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { loadFullHistory, fullSeasons } from '../../src/data/fullHistory';
import { current2026 } from '../../src/data/current2026';
await loadFullHistory();
const people: Record<string, { name: string; country: string; seasons: [number, string][] }> = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const norm = (n: string) => n.normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const byYearName = new Map<string, string>();
const byName = new Map<string, Set<string>>();
for (const [id, p] of Object.entries(people)) {
  for (const [y] of p.seasons) byYearName.set(`${y}|${norm(p.name)}`, id);
  const k = norm(p.name); if (!byName.has(k)) byName.set(k, new Set()); byName.get(k)!.add(id);
}
const teams = [...fullSeasons(), ...current2026.teams];
const found = new Map<string, { id: string; name: string; country: string; best: number; years: Set<number> }>();
const missing = new Map<string, { name: string; best: number }>();
for (const t of teams) {
  const y = t.season.includes('-') ? Number(t.season.slice(0, 4)) + 1 : Number(t.season);
  for (const p of t.players) {
    const k = norm(p.name);
    let id = byYearName.get(`${y}|${k}`) ?? byYearName.get(`${y - 1}|${k}`) ?? byYearName.get(`${y + 1}|${k}`);
    if (!id && byName.get(k)?.size === 1) id = [...byName.get(k)!][0];
    if (!id) { const m = missing.get(p.name); if (!m || m.best < p.ovr) missing.set(p.name, { name: p.name, best: p.ovr }); continue; }
    const f = found.get(id) ?? { id, name: p.name, country: people[id].country, best: 0, years: new Set<number>() };
    f.best = Math.max(f.best, p.ovr); f.years.add(y); found.set(id, f);
  }
}
/**
 * The owner's calls (Nov 2026): the country each player is identified with, birth country otherwise.
 * Americans born abroad (military and expat families) are American; players who represent another country show it.
 */
const OVERRIDE: Record<string, string> = {
  // Born abroad, American
  'Dominique Wilkins': 'us', 'Kyrie Irving': 'us', 'Carlos Boozer': 'us', 'Kiki Vandeweghe': 'us', 'Shawn Bradley': 'us',
  'Anthony Randolph': 'us', 'Wally Szczerbiak': 'us', 'Cam Thomas': 'us', 'Reggie Jackson': 'us', 'Ben Gordon': 'us',
  'Tom Meschery': 'us', 'Rolando Blackman': 'us', 'Patrick Ewing': 'us', 'Rumeal Robinson': 'us',
  // The country they represent or are identified with
  'Tony Parker': 'fr', 'Nikola Vučević': 'me', 'Enes Kanter': 'tr', 'Bojan Bogdanović': 'hr', 'Ivica Zubac': 'hr',
  'Peja Stojaković': 'rs', 'Vladimir Radmanović': 'rs', 'Sasha Danilović': 'rs', 'Karl-Anthony Towns': 'do',
  'Domantas Sabonis': 'lt', 'Joakim Noah': 'fr', 'Jordan Clarkson': 'ph', 'Jakob Pöltl': 'at',
};
/** French overseas regions show France (Puerto Rico and the US Virgin Islands keep their own flags). */
const FOLD: Record<string, string> = { gp: 'fr', mq: 'fr', gf: 'fr', re: 'fr' };

const nameKey = (n: string) => norm(n);
const out: Record<string, string> = {};
for (const f of found.values()) {
  const c = OVERRIDE[f.name] ?? FOLD[f.country] ?? f.country;
  if (c !== 'us' && f.name !== 'Jeff Taylor') out[nameKey(f.name)] = c;
}
for (const [name, c] of Object.entries(OVERRIDE)) {
  if (c === 'us') delete out[nameKey(name)];
  else out[nameKey(name)] = c;
}
const body = Object.entries(out).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:'${v}'`).join(',');
writeFileSync('src/data/nations.ts', `/**
 * Country for every non-American player in the game (keyed by name: lower case, letters only), from the birth country
 * on Basketball-Reference's rosters plus the owner's calls (scripts/rosters/nations-match.mts). Anyone missing is
 * American. Generated: don't edit by hand.
 */
// prettier-ignore
export const NATION: Record<string, string> = {${body}};
`);
console.log('wrote src/data/nations.ts:', Object.keys(out).length, 'non-American players');
