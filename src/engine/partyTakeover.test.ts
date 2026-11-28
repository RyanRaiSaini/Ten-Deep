import { describe, expect, it } from 'vitest';
import { current2026 } from '../data/current2026';
import { payOf } from './cap';
import type { PartyMember, PartyMeta } from './party';
import { BID_MS, CHOOSE_MS, REVEAL_MS, TK_BUDGET, maxSpend, resolveTakeover, seasonRosters, tkOptions, tkStartRoster, tkTeam, type TkChoice } from './partyTakeover';
import { ALL_SLOTS } from './types';

const pool = current2026;
const team = pool.teams[3];
const T0 = 1_000_000;
const meta: PartyMeta = { code: 'ABCDE', host: 'AAAAAA', seed: 'tk-test', poolId: 'current-2026', created: T0 - 1000, started: T0, kind: 'takeover', teamId: team.id };
const member = (pin: string, joined: number): PartyMember => ({ pin, name: pin, avatar: 'captain', joined, picks: [], moves: [], bids: [] });

describe('party takeover', () => {
  it('everyone starts from the same real team and budget, and sees the same options', () => {
    const ms = [member('AAAAAA', 1), member('BBBBBB', 2)];
    const st = resolveTakeover(meta, ms, pool, T0 + 1000);
    expect(st.phase).toBe('choose');
    expect(st.r).toBe(0);
    expect(tkTeam(meta, pool)!.id).toBe(team.id);
    expect(st.rosters[0]).toEqual(tkStartRoster(team));
    expect(st.budgets).toEqual([TK_BUDGET, TK_BUDGET]);
    expect(st.options.map((o) => o.tier)).toContain('bench');
    expect(st.options).toEqual(tkOptions(meta, pool, 0, team, new Set()));
  });

  it('uncontested picks sign at their price; the same pick by two friends goes to the higher bid; time-outs keep', () => {
    const ms = [member('AAAAAA', 1), member('BBBBBB', 2), member('CCCCCC', 3)];
    const st0 = resolveTakeover(meta, ms, pool, T0 + 10);
    const affordable = (seat: number) => st0.options.filter((o) => o.pay <= maxSpend(st0, seat, 0)).map((o) => o.tier);
    const both = affordable(0).find((x) => affordable(1).includes(x)) as TkChoice;
    expect(both).toBeTruthy();
    // A and B both want the same player; C sits out (keeps) by not answering.
    ms[0].moves = [{ r: 0, c: both, t: T0 + 1000 }];
    ms[1].moves = [{ r: 0, c: both, t: T0 + 2000 }];
    const reveal = resolveTakeover(meta, ms, pool, T0 + CHOOSE_MS + 100);
    expect(reveal.phase).toBe('reveal');
    expect(reveal.choices).toEqual([both, both, 'keep']);
    const bidAt = T0 + CHOOSE_MS + REVEAL_MS + 500;
    const bidPhase = resolveTakeover(meta, ms, pool, bidAt);
    expect(bidPhase.phase).toBe('bid');
    expect(bidPhase.bidders).toEqual([0, 1]);
    const o = st0.options.find((x) => x.tier === both)!;
    ms[0].bids = [{ r: 0, amount: o.pay + 1, t: bidAt + 100 }];
    ms[1].bids = [{ r: 0, amount: o.pay + 0.5, t: bidAt + 200 }];
    const next = resolveTakeover(meta, ms, pool, bidAt + 300);
    expect(next.phase).toBe('choose');
    expect(next.r).toBe(1);
    expect(next.history[0].find((x) => x.seat === 0)).toMatchObject({ won: true, pay: o.pay + 1 });
    expect(next.history[0].find((x) => x.seat === 1)).toMatchObject({ won: false });
    expect(next.rosters[0].PG.name).toBe(o.player.name);
    expect(next.rosters[0].PG.salary).toBe(o.pay + 1);
    expect(next.rosters[1].PG.name).toBe(st0.rosters[1].PG.name);
    expect(next.rosters[2].PG.name).toBe(st0.rosters[2].PG.name);
    expect(next.budgets[0]).toBeCloseTo(TK_BUDGET + payOf(st0.rosters[0].PG) - (o.pay + 1), 1);
  });

  it('nobody answering plays it out: ten positions of keeps, then the season with per-seat copies', () => {
    const ms = [member('AAAAAA', 1), member('BBBBBB', 2)];
    const st = resolveTakeover(meta, ms, pool, T0 + 10 * (CHOOSE_MS + REVEAL_MS + BID_MS) + 1);
    expect(st.phase).toBe('season');
    expect(st.history).toHaveLength(ALL_SLOTS.length);
    expect(st.rosters[0]).toEqual(tkStartRoster(team));
    const rs = seasonRosters(st);
    expect(rs[0].PG!.id).not.toBe(rs[1].PG!.id);
    expect(rs[0].PG!.name).toBe(rs[1].PG!.name);
  });
});
