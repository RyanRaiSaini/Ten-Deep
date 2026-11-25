import { describe, expect, it } from 'vitest';
import { current2026 } from '../data/current2026';
import { MODE_BY_ID } from '../data/modes';
import { DIVISIONS, franchiseOf, leagueFranchises } from './conference';
import { realLeague, realRotation } from './realLeague';
import { BENCH_SHARES, STARTER_SHARE, lineupMinutes, squadRating, teamStrength } from './rotation';
import { ALL_SLOTS, type Player } from './types';

const byFranchise = new Map(current2026.teams.map((t) => [franchiseOf(t), t]));
const names = (r: { slots: Record<string, Player> }) => ALL_SLOTS.map((k) => r.slots[k].name);

describe('real rosters (Current Day)', () => {
  const franchises = leagueFranchises(5, 'real');
  const league = realLeague(franchises, [], 'real', current2026.teams, current2026.teams, current2026.teams);

  it('every AI team plays its own 2026-27 roster: nobody is on another team', () => {
    expect(league).toHaveLength(29);
    league.forEach((r, i) => {
      const real = byFranchise.get(franchises[i])!;
      expect(r.name).toBe(`${real.city} ${real.name}`);
      expect(r.franchise).toBe(franchises[i]);
      const own = new Set(real.players.map((p) => p.name));
      for (const n of names(r)) expect(own.has(n)).toBe(true);
    });
    const spurs = league.find((r) => r.franchise === 'sas');
    if (spurs) expect(names(spurs)).toContain('Victor Wembanyama');
  });

  it('a player you drafted leaves his team and its own depth moves up; no one plays for two teams', () => {
    const wemby = current2026.teams.flatMap((t) => t.players).find((p) => p.name === 'Victor Wembanyama')!;
    const lg = realLeague(['sas', ...franchises.filter((f) => f !== 'sas').slice(0, 28)], [wemby], 'real', current2026.teams, current2026.teams, current2026.teams);
    expect(names(lg[0])).not.toContain('Victor Wembanyama');
    const spursNames = new Set(byFranchise.get('sas')!.players.map((p) => p.name));
    for (const n of names(lg[0])) expect(spursNames.has(n)).toBe(true);
    const all = lg.flatMap(names);
    expect(new Set(all).size).toBe(all.length);
  });

  it('the same picks and seed give the same league', () => {
    expect(realLeague(franchises, [], 'real', current2026.teams, current2026.teams, current2026.teams)).toEqual(league);
  });

  it('the real contenders rate near the top', () => {
    const top = [...league].sort((a, b) => squadRating(b) - squadRating(a)).slice(0, 10).map((r) => r.franchise);
    const contenders = ['okc', 'sas', 'hou', 'phi', 'mia'].filter((f) => franchises.includes(f));
    expect(contenders.filter((f) => top.includes(f)).length).toBeGreaterThanOrEqual(contenders.length - 1);
  });
});

describe('historic leagues', () => {
  it('a team-season keeps its own players and fills a short roster from its own franchise first', () => {
    const allTime = MODE_BY_ID['all-time'].pool;
    const franchises = DIVISIONS.flatMap((d) => d.franchises).slice(0, 29);
    const lg = realLeague(franchises, [], 'hist', allTime.teams, allTime.teams, current2026.teams);
    lg.forEach((r, i) => {
      const franchisePlayers = new Set(allTime.teams.filter((t) => franchiseOf(t) === franchises[i]).flatMap((t) => t.players.map((p) => p.name)));
      for (const n of names(r)) expect(n === 'Reserve' || franchisePlayers.has(n)).toBe(true);
    });
    const all = lg.flatMap(names).filter((n) => n !== 'Reserve');
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('rotation shares', () => {
  it('starters 15% each, then 9 / 6 / 5 / 3 / 2% off the bench; 240 minutes', () => {
    const r = { id: 'x', name: 'x', colors: ['#000', '#fff'] as [string, string], slots: realRotation(current2026.teams[0].players, 'x') as never };
    const m = lineupMinutes(r, new Set()).map((e) => e.minutes / 240);
    m.slice(0, 5).forEach((x) => expect(x).toBeCloseTo(STARTER_SHARE));
    m.slice(5).forEach((x, i) => expect(x).toBeCloseTo(BENCH_SHARES[i]));
    expect(m.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it('great starters beat a great bench: 92 starters + 80 bench outrate 86 starters + 95 bench', () => {
    const base = realRotation(current2026.teams[0].players, 'x');
    const make = (s: number, b: number) => ({ id: 'x', name: 'x', colors: ['#000', '#fff'] as [string, string],
      slots: Object.fromEntries(ALL_SLOTS.map((k, i) => [k, { ...base[k]!, ovr: i < 5 ? s : b, off: i < 5 ? s : b, def: i < 5 ? s : b }])) as never });
    expect(squadRating(make(92, 80))).toBeGreaterThan(squadRating(make(86, 95)) + 0.5);
    // In the sim too (stars' extra pull included): the better starting five is the stronger team.
    const net = (r: ReturnType<typeof make>) => teamStrength(lineupMinutes(r, new Set())).net;
    expect(net(make(92, 80))).toBeGreaterThan(net(make(86, 95)) + 1);
  });
});
