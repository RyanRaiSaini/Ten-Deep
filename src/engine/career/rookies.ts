/** Generated players for future seasons: draft classes and journeymen. Names are invented (no real people). */
import { parseRoster } from '../../data/build';
import { createRng, shuffle } from '../rng';
import { POSITIONS, type Player, type Rng } from '../types';

const FIRST = ['Malik', 'Jace', 'Darius', 'Theo', 'Kofi', 'Marcus', 'Elijah', 'Rafael', 'Tobias', 'Isaiah', 'Andre', 'Niko', 'Jalen', 'Cyrus', 'Omari', 'Dante', 'Mateo', 'Kian', 'Rashad', 'Leon', 'Ezra', 'Xavier', 'Bryce', 'Amari', 'Silas', 'Tariq', 'Jonah', 'Felix', 'Corey', 'Idris', 'Luca', 'Devon', 'Kendrick', 'Moses', 'Quentin', 'Rowan'];
const LAST = ['Okafor', 'Brightwater', 'Vance', 'Adeyemi', 'Calloway', 'Duval', 'Fairbanks', 'Holloway', 'Iverson-Reid', 'Kessington', 'Lockhart', 'Mbeki', 'Nakamura', 'Ostrander', 'Pellegrini', 'Quarles', 'Ravensworth', 'Sandoval', 'Thibodeaux', 'Underwood', 'Valdés', 'Whitfield', 'Yarbrough', 'Zeller-Ross', 'Achebe', 'Bastien', 'Colquitt', 'Delacroix', 'Ekwueme', 'Fontaine', 'Granger-Vale', 'Harkness', 'Ibarra', 'Jovanović', 'Kowalczyk', 'Laurent'];
const ARCHES = ['scorer', 'shooter', 'playmaker', 'slasher', 'twoway', 'defender', 'wing3d', 'big', 'rim', 'stretch', 'unicorn'];
const ARCH_BY_POS: Record<string, string[]> = {
  PG: ['playmaker', 'scorer', 'slasher', 'shooter'], SG: ['shooter', 'scorer', 'slasher', 'wing3d'],
  SF: ['wing3d', 'twoway', 'slasher', 'scorer'], PF: ['stretch', 'twoway', 'big', 'defender'], C: ['rim', 'big', 'unicorn', 'stretch'],
};

function invent(rng: Rng, taken: Set<string>): string {
  for (let tries = 0; ; tries++) {
    // After many collisions, add a suffix so this always terminates (36×36 base combos run out eventually).
    const n = `${rng.pick(FIRST)} ${rng.pick(LAST)}${tries > 200 ? ` ${['Jr.', 'II', 'III', 'IV'][tries % 4]}${tries > 400 ? ` ${tries}` : ''}` : ''}`;
    if (!taken.has(n)) return taken.add(n), n;
  }
}

function make(id: string, name: string, pos: string, ovr: number, age: number, arch: string): Player {
  const [p] = parseRoster('gen', `${name}|${pos}|${ovr}|${age}|${arch}`);
  return { ...p, id };
}

/** 30 rookies, ages 19–21, rated 66–82 and top-heavy (the first few are real prospects). */
export function generateRookieClass(season: number, seed: string, n = 30, taken = new Set<string>()): Player[] {
  const rng = createRng(`${seed}:rookies:${season}`);
  const names = new Set(taken);
  const out: Player[] = [];
  for (let i = 0; i < n; i++) {
    const pos = POSITIONS[i % 5];
    const ovr = Math.max(66, Math.min(82, 82 - Math.floor(i * 0.55) + rng.int(-2, 2)));
    out.push(make(`rk-${season}-${i}`, invent(rng, names), pos, ovr, rng.int(19, 21), rng.pick(ARCH_BY_POS[pos] ?? ARCHES)));
  }
  return shuffle(out, rng).sort((a, b) => b.ovr - a.ovr);
}

/** Minimum-salary journeymen so free agency can always fill every roster. */
export function generateJourneymen(season: number, seed: string, n: number, taken = new Set<string>()): Player[] {
  const rng = createRng(`${seed}:journeymen:${season}`);
  const names = new Set(taken);
  return Array.from({ length: n }, (_, i) => {
    const pos = POSITIONS[i % 5];
    return make(`jm-${season}-${i}`, invent(rng, names), pos, rng.int(64, 68), rng.int(27, 33), rng.pick(ARCH_BY_POS[pos] ?? ARCHES));
  });
}
