import { describe, expect, it } from 'vitest';
import type { Player } from '../types';
import type { OffseasonState, OffTeam } from './offseason';
import { AI_EDGE, counterOffer, evaluatePackage, executePackage, incomingOffers, packageValue, tradeValue } from './trades';

const P = (id: string, ovr: number, age: number, pos: Player['pos'] = 'SF', salary = 10): Player => ({
  id, name: id.toUpperCase(), pos, ovr, off: ovr, def: ovr, reb: ovr, ast: ovr, three: ovr, dur: 80, age, salary,
});
const SLOTS = ['PG', 'SG', 'SF', 'PF', 'C', 'B1', 'B2', 'B3', 'B4', 'B5'] as const;
const team = (id: string, players: Player[]): OffTeam => ({ id, name: id, colors: ['#000', '#fff'], slots: Object.fromEntries(players.map((p, i) => [SLOTS[i], p])) });
const ten = (pre: string, ovrs: number[], salary = 10) =>
  ovrs.map((o, i) => P(`${pre}${i}`, o, 26, (['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SG', 'SF', 'PF', 'C'] as const)[i], salary));
const state = (a: Player[], ...others: Player[][]): OffseasonState => ({
  season: 2, seed: 'trades', teams: [team('me', a), ...others.map((o, i) => team(`t${i + 1}`, o))],
  contracts: {}, freeAgents: [], retired: [], changes: [], expiring: [], order: [], rookies: [], picks: {},
});

describe('package trades', () => {
  it("two good players aren't one great one: a package counts its best player fully", () => {
    const star = [P('s', 92, 26)];
    const two = [P('a', 82, 26), P('b', 82, 26)];
    expect(packageValue(two)).toBeGreaterThan(tradeValue(two[0]));
    expect(packageValue(two)).toBeLessThan(2 * tradeValue(two[0]));
    expect(packageValue(star) - packageValue([P('x', 82, 26)])).toBeGreaterThan(5);
  });

  it('two for one: your two starters for their star, when it helps them', () => {
    const mine = ten('m', [84, 84, 80, 78, 77, 72, 70, 68, 66, 65]);
    const theirs = ten('t', [90, 78, 76, 75, 74, 70, 69, 68, 66, 65]);
    const st = state(mine, theirs);
    const pkg = { team: 1, give: ['m0', 'm1'], get: ['t0'] };
    const v = evaluatePackage(st, pkg);
    // 84 + 84×0.55 = 130 vs 90: they'd love it.
    expect(v).toMatchObject({ ok: true });
    const after = executePackage(st, pkg);
    const mineNow = Object.values(after.teams[0].slots).map((p) => p!.id);
    const theirsNow = Object.values(after.teams[1].slots).map((p) => p!.id);
    expect(mineNow).toContain('t0');
    expect(mineNow).toHaveLength(9); // an open spot to fill in free agency
    expect(theirsNow).toEqual(expect.arrayContaining(['m0', 'm1']));
    expect(after.traded).toEqual(['m0', 'm1']);
  });

  it('rosters stay at ten: a full AI team waives its last man to take two for one; you never lose anyone you did not pick', () => {
    const mine = ten('m', [84, 84, 80, 78, 77, 72, 70, 68, 66, 65]);
    const theirs = ten('t', [90, 78, 76, 75, 74, 70, 69, 68, 66, 65]);
    const st = state(mine, theirs);
    const after = executePackage(st, { team: 1, give: ['m0', 'm1'], get: ['t0'] });
    expect(Object.values(after.teams[1].slots)).toHaveLength(10);
    expect(after.freeAgents.map((p) => p.id)).toEqual(['t9']); // their least valuable bench player
    expect(after.freeAgents[0].released).toBe(true);
    // Your full roster can't take two for one.
    expect(evaluatePackage(st, { team: 1, give: ['m9'], get: ['t5', 't6'] })).toMatchObject({ ok: false, reason: 'roster' });
  });

  it('over the cap, a team takes back at most 125% of what it sends', () => {
    // Both teams $200M+ payrolls: you send $10M and ask for their $40M man.
    const mine = ten('m', [84, 80, 80, 78, 77, 72, 70, 68, 66, 65], 21);
    const theirs = [...ten('t', [88, 78, 76, 75, 74, 70, 69, 68, 66, 65], 21)];
    theirs[0] = { ...theirs[0], salary: 40 };
    mine[2] = { ...mine[2], salary: 10 };
    mine[1] = { ...mine[1], salary: 22 };
    const st = state(mine, theirs);
    expect(evaluatePackage(st, { team: 1, give: ['m2'], get: ['t0'] })).toMatchObject({ ok: false, reason: 'cap' });
    // Send $32M and it matches (40 ≤ 1.25 × 32 + 0.2).
    const v = evaluatePackage(st, { team: 1, give: ['m2', 'm1'], get: ['t0'] });
    expect(v.ok || v.reason !== 'cap').toBe(true);
  });

  it('"what would it take": adds the cheapest player of yours that gets it done', () => {
    const mine = ten('m', [80, 79, 78, 77, 76, 74, 72, 70, 68, 66]);
    const theirs = ten('t', [86, 78, 76, 75, 74, 70, 69, 68, 66, 65]);
    const st = state(mine, theirs);
    const pkg = { team: 1, give: ['m0'], get: ['t0'] };
    expect(evaluatePackage(st, pkg)).toMatchObject({ ok: false, reason: 'value' });
    const c = counterOffer(st, pkg)!;
    expect(c).toBeTruthy();
    expect(c.give.length).toBe(2);
    expect(evaluatePackage(st, c).ok).toBe(true);
    // The least valuable addition that works.
    const added = c.give.find((id) => id !== 'm0')!;
    const works = ten('m', [80, 79, 78, 77, 76, 74, 72, 70, 68, 66]).filter((p) => p.id !== 'm0' && evaluatePackage(st, { ...pkg, give: ['m0', p.id] }).ok);
    expect(Math.min(...works.map(tradeValue))).toBe(tradeValue(works.find((p) => p.id === added)!));
  });

  it('teams call with offers they like, at most a small edge, never one you turned down', () => {
    const mine = ten('m', [88, 84, 80, 78, 77, 72, 70, 68, 66, 65]);
    const lg = [1, 2, 3, 4, 5].map((n) => ten(`t${n}-`, [85, 82, 79, 77, 75, 73, 71, 69, 67, 65].map((o) => o - n)));
    const st = state(mine, ...lg);
    const offers = incomingOffers(st, 3);
    expect(offers.length).toBeGreaterThan(0);
    for (const o of offers) {
      const v = evaluatePackage(st, o);
      expect(v.ok).toBe(true);
      expect(v.gain).toBeGreaterThanOrEqual(AI_EDGE);
      expect(v.gain).toBeLessThanOrEqual(AI_EDGE + 6);
    }
    expect(new Set(offers.map((o) => o.team)).size).toBe(offers.length); // one call per team
    const again = incomingOffers(st, 3, offers.map((o) => o.key));
    expect(again.some((o) => offers.some((x) => x.key === o.key))).toBe(false);
    expect(incomingOffers(st, 3)).toEqual(offers); // fixed by the season and the moves made so far
  });
});
