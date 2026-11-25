import { describe, expect, it } from 'vitest';
import { current2026 } from '../data/current2026';
import { draftLeague } from './aiDraft';
import { DIVISIONS, alignLeague, assignDivisions, confOfDiv, defaultDivision, leagueFranchises } from './conference';
import { champion, outInPlayIn, playInFor, seriesFor, simPlayoffsToEnd, startPlayoffs } from './playoffs';
import { createRng } from './rng';
import { SEASON_GAMES, advance, confStandings, createSeason, divisionLeaders, seedOf, standings } from './season';
import { makePool } from './__fixtures__/pool';

const pool = makePool();
const teams = draftLeague(pool, new Set(), 30, createRng('conf'));
const count = (divs: number[]) => DIVISIONS.map((_, d) => divs.filter((x) => x === d).length);

describe('league layout', () => {
  it('29 real franchises around you: one left out of your division, none repeated', () => {
    for (let d = 0; d < 6; d++) {
      const f = leagueFranchises(d, `seed-${d}`);
      expect(f).toHaveLength(29);
      expect(new Set(f).size).toBe(29);
      expect(DIVISIONS[d].franchises.filter((x) => f.includes(x))).toHaveLength(4);
      for (const other of DIVISIONS.filter((_, i) => i !== d)) expect(other.franchises.every((x) => f.includes(x))).toBe(true);
    }
    expect(leagueFranchises(2, 'x')).toEqual(leagueFranchises(2, 'x'));
  });

  it('names every AI team after its franchise and puts five teams in each division, you where you chose', () => {
    const { teams: named, divs } = alignLeague(teams, 4, 'names', current2026.teams, current2026.teams);
    expect(divs[0]).toBe(4);
    expect(count(divs)).toEqual([5, 5, 5, 5, 5, 5]);
    expect(named[0]).toBe(teams[0]);
    expect(new Set(named.slice(1).map((t) => t.name)).size).toBe(29);
    const lakers = named.findIndex((t) => t.name === 'Los Angeles Lakers');
    if (lakers > 0) expect(divs[lakers]).toBe(4);
    const celtics = named.findIndex((t) => t.name === 'Boston Celtics');
    expect(divs[celtics]).toBe(0);
    // Rosters are untouched: only names and colors change.
    named.forEach((t, i) => expect(t.slots).toBe(teams[i].slots));
  });

  it('older saves without franchises (or a crowded division) still get an even split', () => {
    const divs = assignDivisions([undefined, ...Array(29).fill('bos')], 3);
    expect(divs[0]).toBe(3);
    expect(count(divs)).toEqual([5, 5, 5, 5, 5, 5]);
    // The overflow from Boston fills the East first.
    expect(divs.slice(1, 15).every((d) => confOfDiv(d) === 0)).toBe(true);
  });

  it('a default division comes from the seed', () => {
    const seen = new Set(Array.from({ length: 60 }, (_, i) => defaultDivision(`d${i}`)));
    expect(seen.size).toBe(6);
  });
});

describe('conference playoffs', () => {
  const { teams: named, divs } = alignLeague(teams, 1, 'conf-season', pool.teams, current2026.teams);
  const done = advance(advance({ ...createSeason(named[0], named.slice(1), 'conf-season', divs), deadlineUsed: true }, SEASON_GAMES), SEASON_GAMES);

  it('each conference has its own table; seeds come from it', () => {
    const east = confStandings(done, 0);
    const west = confStandings(done, 1);
    expect(east).toHaveLength(15);
    expect(west).toHaveLength(15);
    expect([...east, ...west].map((r) => r.team).sort((a, b) => a - b)).toEqual(standings(done).map((r) => r.team).sort((a, b) => a - b));
    expect(seedOf(done, 0)).toEqual({ seed: east.findIndex((r) => r.team === 0) + 1, conf: 0 });
    expect(divisionLeaders(done).size).toBe(6);
  });

  it('play-in: 7 v 8 and 9 v 10, then one game for the 8 seed; the bracket is 1v8 4v5 3v6 2v7 per conference', () => {
    const ps = startPlayoffs(done);
    expect(ps.playIn).toHaveLength(6);
    for (const conf of [0, 1] as const) {
      const table = confStandings(done, conf).map((r) => r.team);
      const games = ps.playIn!.filter((g) => g.conf === conf);
      expect(games.map((g) => g.stage)).toEqual(['a', 'b', 'c']);
      expect([games[0].home, games[0].away]).toEqual([table[6], table[7]]);
      expect([games[1].home, games[1].away]).toEqual([table[8], table[9]]);
      const series = ps.rounds[0].filter((s) => s.conf === conf);
      expect(series.map((s) => [s.seedHi, s.seedLo])).toEqual([[1, 8], [4, 5], [3, 6], [2, 7]]);
      expect(series[0].hi).toBe(table[0]);
      expect(series[3].hi).toBe(table[1]);
      // The 7 seed won game a; the 8 seed won game c; game b's loser and game c's loser are out.
      const win = (g: typeof games[number]) => (g.result.homeScore > g.result.awayScore ? g.home : g.away);
      expect(series[3].lo).toBe(win(games[0]));
      expect(series[0].lo).toBe(win(games[2]));
      const out = [games[1], games[2]].map((g) => (win(g) === g.home ? g.away : g.home));
      for (const t of out) {
        expect(outInPlayIn(ps, t)).toBe(true);
        expect(seriesFor(ps, t)).toBeNull();
        expect(playInFor(ps, t).length).toBeGreaterThan(0);
      }
    }
    // The playoffs open with the play-in already played; it's the same on every device.
    expect(startPlayoffs(done)).toEqual(ps);
  });

  it('conference finals stay in the conference; the Finals are East v West with home court to the better record', () => {
    const ps = simPlayoffsToEnd(startPlayoffs(done));
    expect(ps.rounds.map((r) => r.length)).toEqual([8, 4, 2, 1]);
    expect(ps.rounds[1].map((s) => s.conf)).toEqual([0, 0, 1, 1]);
    expect(ps.rounds[2].map((s) => s.conf)).toEqual([0, 1]);
    const final = ps.rounds[3][0];
    expect(final.conf).toBeUndefined();
    expect(divs[final.hi] < 3).not.toBe(divs[final.lo] < 3);
    const rank = standings(done).map((r) => r.team);
    expect(rank.indexOf(final.hi)).toBeLessThan(rank.indexOf(final.lo));
    expect(champion(ps)).not.toBeNull();
  });

  it('a season without divisions keeps the single 16-team bracket', () => {
    const plain = advance(advance({ ...createSeason(teams[0], teams.slice(1), 'plain'), deadlineUsed: true }, SEASON_GAMES), SEASON_GAMES);
    const ps = startPlayoffs(plain);
    expect(ps.playIn).toBeUndefined();
    expect(ps.rounds[0].map((s) => [s.seedHi, s.seedLo])).toEqual([[1, 16], [8, 9], [5, 12], [4, 13], [3, 14], [6, 11], [7, 10], [2, 15]]);
    expect(seedOf(plain, 0).conf).toBeNull();
  });
});
