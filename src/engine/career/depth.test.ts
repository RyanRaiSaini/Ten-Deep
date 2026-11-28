import { describe, expect, it } from 'vitest';
import { capRoom } from '../cap';
import type { Player } from '../types';
import { HOF_RULES, addSeason, hallOfFame, type CareerStats } from './legacy';
import { MORALE_START, moraleAfter, moraleMod } from './morale';
import type { OffseasonState, OffTeam } from './offseason';
import { evaluateTrade, executeTrade, tradeValue } from './trades';

const P = (id: string, ovr: number, age: number, pos: Player['pos'] = 'SF', salary?: number): Player => ({
  id, name: id.toUpperCase(), pos, ovr, off: ovr, def: ovr, reb: ovr, ast: ovr, three: ovr, dur: 80, age, ...(salary !== undefined ? { salary } : {}),
});
const team = (id: string, players: Player[]): OffTeam => ({
  id, name: id, colors: ['#000', '#fff'],
  slots: Object.fromEntries(players.map((p, i) => [['PG', 'SG', 'SF', 'PF', 'C', 'B1', 'B2', 'B3', 'B4', 'B5'][i], p])),
});
const state = (a: Player[], b: Player[]): OffseasonState => ({
  season: 2, seed: 's', teams: [team('me', a), team('them', b)], contracts: Object.fromEntries([...a, ...b].map((p) => [p.id, 2])),
  freeAgents: [], retired: [], changes: [], expiring: [], order: [0, 1], rookies: [], picks: {},
});

describe('trade value', () => {
  it('youth and a cheap deal add value; age takes it away', () => {
    expect(tradeValue(P('young', 82, 22))).toBeGreaterThan(tradeValue(P('old', 82, 34)));
    expect(tradeValue(P('cheap', 82, 27, 'SF', 5))).toBeGreaterThan(tradeValue(P('pricey', 82, 27, 'SF', 40)));
  });
});

describe('trades', () => {
  const mine = [P('pg', 80, 26, 'PG'), P('sg', 78, 26, 'SG'), P('sf', 84, 24, 'SF'), P('pf', 77, 30, 'PF'), P('c', 76, 29, 'C')];
  const theirs = [P('tpg', 79, 27, 'PG'), P('tsg', 77, 25, 'SG'), P('tsf', 83, 33, 'SF'), P('tpf', 76, 28, 'PF'), P('tc', 75, 26, 'C')];

  it('the AI accepts a deal that helps them and turns down one that does not', () => {
    const st = state(mine, theirs);
    expect(evaluateTrade(st, 'sf', 1, 'tsf').ok).toBe(true); // young 84 for an aging 83
    // An aging 76 for their young 83: no thanks.
    const lopsided = state([...mine.slice(0, 2), P('sf', 76, 33, 'SF'), ...mine.slice(3)], [...theirs.slice(0, 2), P('tsf', 83, 25, 'SF'), ...theirs.slice(3)]);
    expect(evaluateTrade(lopsided, 'sf', 1, 'tsf')).toMatchObject({ ok: false, reason: 'value' });
  });

  it('a starter must fit the slot they move into', () => {
    expect(evaluateTrade(state(mine, theirs), 'sf', 1, 'tc')).toMatchObject({ ok: false, reason: 'position' });
  });

  it('a trade that puts either team far over the cap is blocked', () => {
    const rich = [P('pg', 80, 26, 'PG', 95), P('sg', 78, 26, 'SG', 95), P('sf', 70, 24, 'SF', 1), P('pf', 77, 30, 'PF', 5), P('c', 76, 29, 'C', 5)];
    const maxed = [P('tpg', 79, 27, 'PG', 1), P('tsg', 77, 25, 'SG', 1), P('tsf', 90, 31, 'SF', 50), P('tpf', 76, 28, 'PF', 1), P('tc', 75, 26, 'C', 1)];
    const st = state(rich, maxed);
    expect(capRoom(st.teams[0].slots)).toBeLessThan(10);
    expect(evaluateTrade(st, 'sf', 1, 'tsf')).toMatchObject({ ok: false });
  });

  it('no star limit: a trade can give a team a third 95+ superstar', () => {
    const stars = [P('pg', 97, 26, 'PG'), P('sg', 97, 27, 'SG'), P('sf', 94, 25, 'SF'), P('pf', 77, 30, 'PF'), P('c', 76, 29, 'C')];
    const them = [P('tpg', 79, 27, 'PG'), P('tsg', 77, 25, 'SG'), P('tsf', 95, 32, 'SF'), P('tpf', 76, 28, 'PF'), P('tc', 75, 26, 'C')];
    expect(evaluateTrade(state(stars, them), 'sf', 1, 'tsf')).not.toMatchObject({ reason: 'stars' });
  });

  it('executing swaps players and carries contracts, once', () => {
    const st = executeTrade(state(mine, theirs), 'sf', 1, 'tsf');
    expect(st.teams[0].slots.SF!.id).toBe('tsf');
    expect(st.teams[1].slots.SF!.id).toBe('sf');
    expect(st.contracts.sf).toBe(2);
    expect(st.traded).toEqual(['sf']);
  });
});

describe('morale', () => {
  it('winning lifts morale, losing and trading away teammates lower it, always 0–100', () => {
    expect(moraleAfter(MORALE_START, { wins: 58, result: 'semis', trades: 0 })).toBeGreaterThan(MORALE_START);
    expect(moraleAfter(MORALE_START, { wins: 25, result: 'missed', trades: 0 })).toBeLessThan(MORALE_START);
    expect(moraleAfter(MORALE_START, { wins: 41, result: 'first', trades: 2 })).toBeLessThan(moraleAfter(MORALE_START, { wins: 41, result: 'first', trades: 0 }));
    expect(moraleAfter(99, { wins: 70, result: 'champion', trades: 0 })).toBe(100);
    expect(moraleAfter(1, { wins: 10, result: 'missed', trades: 5 })).toBe(0);
  });

  it('morale nudges team ratings by at most 2 either way', () => {
    expect(moraleMod(50)).toBe(0);
    expect(moraleMod(100)).toBe(2);
    expect(moraleMod(0)).toBe(-2);
  });
});

describe('legacy', () => {
  const totals = { a: { gp: 80, pts: 2000, reb: 400, ast: 300 }, b: { gp: 70, pts: 500, reb: 200, ast: 50 } };
  const roster = [P('a', 90, 26), P('b', 75, 24)];

  it('adds each season to the franchise records', () => {
    let s: CareerStats = {};
    s = addSeason(s, roster, totals, true, '2026-27');
    s = addSeason(s, roster, totals, false, '2027-28');
    expect(s.a).toMatchObject({ name: 'A', gp: 160, pts: 4000, seasons: 2, titles: 1, last: '2027-28' });
  });

  it('the Hall of Fame takes long, great careers with the franchise', () => {
    let s: CareerStats = {};
    for (let y = 0; y < HOF_RULES.seasons; y++) s = addSeason(s, roster, totals, y === 0, `s${y}`);
    const hof = hallOfFame(s).map((x) => x.id);
    expect(hof).toContain('a');
    expect(hof).not.toContain('b');
  });
});

describe('stints with your team', () => {
  it('a mid-season swap credits each player only with the games he played for you', async () => {
    const { draftLeague } = await import('../aiDraft');
    const { createRng } = await import('../rng');
    const { advance, createSeason, tradeSwap, userStints, SEASON_GAMES } = await import('../season');
    const { makePool } = await import('../__fixtures__/pool');
    const lg = draftLeague(makePool(), new Set(), 30, createRng('stint'));
    let s = advance(createSeason(lg[0], lg.slice(1), 'stint'), 50);
    const out = s.teams[0].slots.B5;
    // A bench player from an AI team (same position rules don't apply to the bench).
    const incoming = s.teams[3].slots.B5;
    const before = { ...s.totals[incoming.id] };
    s = { ...s, teams: s.teams.map((t, i) => (i === 3 ? { ...t, slots: { ...t.slots, B5: { ...t.slots.B5, id: `${t.slots.B5.id}-x`, name: `${t.slots.B5.name} X` } } } : t)) };
    s = tradeSwap(s, out.id, incoming);
    const outAtSwap = { ...s.totals[out.id] };
    s = advance(advance({ ...s, deadlineUsed: true }, SEASON_GAMES), SEASON_GAMES);
    const lines = userStints(s);
    const inc = lines.find((l) => l.player.id === incoming.id)!;
    const gone = lines.find((l) => l.player.id === out.id)!;
    expect(inc.totals.gp).toBe(s.totals[incoming.id].gp - before.gp);
    expect(gone.totals.gp).toBe(outAtSwap.gp);
    expect(lines.length).toBe(11);
  });
});

describe('stint edge cases', () => {
  it('a player who leaves and comes back keeps his first stint', async () => {
    const { recordStint, userStints } = await import('../season');
    const A: Player = P('a', 80, 25, 'SF');
    const B: Player = P('b', 78, 25, 'SF');
    const base = { teams: [{ id: 'u', name: 'U', colors: ['#000', '#fff'], slots: { B5: A } }], totals: { a: { gp: 20, pts: 200, reb: 50, ast: 30 } } } as never;
    let s = recordStint(base, A, B); // A leaves after 20 games
    s = { ...s, totals: { ...s.totals, a: { gp: 40, pts: 400, reb: 100, ast: 60 } } }; // 20 more games elsewhere
    s = recordStint(s, B, A); // A comes back
    s = { ...s, teams: [{ ...s.teams[0], slots: { B5: A } }] as never, totals: { ...s.totals, a: { gp: 60, pts: 600, reb: 150, ast: 90 } } };
    const line = (userStints({ ...s, teams: [{ ...s.teams[0], slots: Object.fromEntries(['PG', 'SG', 'SF', 'PF', 'C', 'B1', 'B2', 'B3', 'B4'].map((k) => [k, { ...A, id: `x-${k}` }]).concat([['B5', A]])) }] } as never)).find((l) => l.player.id === 'a')!;
    expect(line.totals.gp).toBe(40); // 20 before leaving + 20 after returning
  });

  it('only players still with you at the end are credited with the title', () => {
    const totals = { a: { gp: 80, pts: 100, reb: 1, ast: 1 }, b: { gp: 30, pts: 50, reb: 1, ast: 1 } };
    const s = addSeason({}, [P('a', 80, 25), P('b', 80, 25)], totals, true, '2026-27', new Set(['a']));
    expect(s.a.titles).toBe(1);
    expect(s.b.titles).toBe(0);
  });
});
