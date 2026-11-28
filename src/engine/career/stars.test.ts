import { describe, expect, it } from 'vitest';
import { APRON, CAP, salaryFor } from '../cap';
import type { Player } from '../types';
import { MAX_DEAL, SUPERMAX, askingPrice, payrollAfterResign, resolveExpiring, swapSpots, type OffseasonState, type OffTeam } from './offseason';

const P = (id: string, ovr: number, pos: Player['pos'] = 'SF', salary?: number): Player => ({
  id, name: id.toUpperCase(), pos, ovr, off: ovr, def: ovr, reb: ovr, ast: ovr, three: ovr, dur: 80, age: 27, ...(salary !== undefined ? { salary } : {}),
});
const SLOTS = ['PG', 'SG', 'SF', 'PF', 'C', 'B1', 'B2', 'B3', 'B4', 'B5'] as const;
const team = (players: Player[]): OffTeam => ({ id: 'u', name: 'U', colors: ['#000', '#fff'], slots: Object.fromEntries(players.map((p, i) => [SLOTS[i], p])) });
const state = (players: Player[], expiring: string[] = []): OffseasonState => ({
  season: 2, seed: 's', teams: [team(players)], contracts: {}, freeAgents: [], retired: [], changes: [], expiring, order: [], rookies: [], picks: {},
});

describe('stars want star money', () => {
  it('the supermax at 97+, a max deal at 94+, the market rate below', () => {
    expect(SUPERMAX).toBe(60);
    expect(MAX_DEAL).toBeCloseTo(51.4, 1);
    expect(askingPrice({ ovr: 99 })).toBe(SUPERMAX);
    expect(askingPrice({ ovr: 97 })).toBe(SUPERMAX);
    expect(askingPrice({ ovr: 95 })).toBe(MAX_DEAL);
    expect(askingPrice({ ovr: 94 })).toBe(MAX_DEAL);
    expect(askingPrice({ ovr: 88 })).toBe(salaryFor(88));
    expect(askingPrice({ ovr: 70 })).toBe(salaryFor(70));
  });

  it("a roster of superstars can't all be re-signed: four supermax deals blow through the apron", () => {
    const stars = [P('a', 98, 'PG'), P('b', 97, 'SG'), P('c', 98, 'SF'), P('d', 97, 'PF')];
    const rest = [P('e', 70, 'C', 2), P('f', 66, 'SF', 2), P('g', 66, 'SF', 2), P('h', 66, 'SF', 2), P('i', 66, 'SF', 2), P('j', 66, 'SF', 2)];
    const st = state([...stars, ...rest], stars.map((p) => p.id));
    expect(payrollAfterResign(st, stars.map((p) => p.id))).toBeGreaterThan(APRON);
    const after = resolveExpiring(st, stars.map((p) => p.id));
    const kept = Object.values(after.teams[0].slots).filter((p) => p && p.ovr >= 97);
    expect(kept.length).toBe(3); // three fit under the apron (3 × $60M + $12M), the fourth walks
    expect(after.freeAgents.map((p) => p.name)).toContain('D');
    // ...and he asks the supermax on the open market too, so nobody fits him under the cap for nothing.
    expect(after.freeAgents.find((p) => p.name === 'D')!.salary).toBe(SUPERMAX);
    expect(CAP - 3 * SUPERMAX).toBeLessThan(SUPERMAX);
  });
});

describe('offseason lineup', () => {
  const roster = () => [P('pg', 80, 'PG'), P('sg', 80, 'SG'), P('sf', 80, 'SF'), P('pf', 80, 'PF'), P('c', 80, 'C'), P('b1', 85, 'PG'), P('b2', 75, 'C'), P('b3', 70, 'SF'), P('b4', 70, 'SG'), P('b5', 70, 'PF')];
  it('any bench player can move into a starting spot he plays, and the starter goes to the bench', () => {
    const st = swapSpots(state(roster()), 0, 'B1', 'PG')!;
    expect(st.teams[0].slots.PG!.id).toBe('b1');
    expect(st.teams[0].slots.B1!.id).toBe('pg');
  });
  it('bench spots swap freely; a starter out of position is refused', () => {
    expect(swapSpots(state(roster()), 0, 'B2', 'B5')!.teams[0].slots.B5!.id).toBe('b2');
    expect(swapSpots(state(roster()), 0, 'B2', 'PG')).toBe(null); // a center can't start at point guard
    expect(swapSpots(state(roster()), 0, 'PG', 'PG')).toBe(null);
  });
  it('a player can move into an empty spot', () => {
    const players = roster().slice(0, 9); // B5 is open
    const st = swapSpots(state(players), 0, 'B4', 'B5')!;
    expect(st.teams[0].slots.B5!.id).toBe('b4');
    expect(st.teams[0].slots.B4).toBeUndefined();
  });
});
