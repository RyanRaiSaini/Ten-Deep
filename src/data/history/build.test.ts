import { describe, expect, it } from 'vitest';
import { buildPool, season } from './build';

const bulls91 = season('chi', 'Chicago', 'Bulls', 1991, ['#CE1141', '#000'], `
  Michael Jordan|SG|99|27|scorer
  Scottie Pippen|SF|88|25|twoway
`);
const bulls96 = season('chi', 'Chicago', 'Bulls', 1996, ['#CE1141', '#000'], `
  Michael Jordan|SG|98|32|scorer
  Scottie Pippen|SF|91|30|twoway
  Dennis Rodman|PF|84|34|defender
`);
const lakers87 = season('lal', 'Los Angeles', 'Lakers', 1987, ['#552583', '#FDB927'], `
  Magic Johnson|PG|98|27|point
`);

describe('season()', () => {
  it('labels by end year and records the franchise', () => {
    expect(bulls91.label).toBe('1991 Bulls');
    expect(bulls91.season).toBe('1991');
    expect(bulls91.franchise).toBe('chi');
    expect(bulls91.id).toBe('chi-1991');
  });
});

describe('buildPool()', () => {
  const all = [bulls91, bulls96, lakers87];

  it('keeps every team-season whole: a player is on each of his seasons (the draft takes each person once)', () => {
    const pool = buildPool('t', 'Test', all, () => true);
    const players = pool.teams.flatMap((t) => t.players);
    expect(players.filter((p) => p.name === 'Michael Jordan').map((p) => p.ovr).sort()).toEqual([...all.flatMap((t) => t.players).filter((p) => p.name === 'Michael Jordan').map((p) => p.ovr)].sort());
    expect(pool.teams.find((t) => t.id === 'chi-1991')!.players).toEqual(bulls91.players);
  });

  it('filters seasons and drops team-seasons left empty', () => {
    const pool = buildPool('t', 'Test', all, (s) => Number(s.season) >= 1990);
    expect(pool.teams.map((t) => t.id).sort()).toEqual(['chi-1991', 'chi-1996']);
  });

  it('gives every card a unique id within the pool', () => {
    const pool = buildPool('t', 'Test', all, () => true);
    const ids = pool.teams.flatMap((t) => t.players.map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
