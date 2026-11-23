import { describe, expect, it } from 'vitest';
import { current2026 } from '../data/current2026';
import { ALL_SLOTS } from './types';
import {
  PARTY_ROUNDS, PICK_MS, SPIN_MS, autoPick, newRoomCode, parseRoomCode, partySeason, placings, resolve, seatState,
  type PartyMember, type PartyMeta,
} from './party';

const pool = current2026;
const T0 = 1_000_000;
const meta: PartyMeta = { code: 'ABCDE', host: 'AAAAAA', seed: 'party-test', poolId: pool.id, created: T0 - 5000, started: T0 };
const member = (pin: string, joined: number): PartyMember => ({ pin, name: pin, avatar: 'captain', joined, picks: [] });

describe('party', () => {
  it('room codes are five letters and parse back', () => {
    const c = newRoomCode();
    expect(c).toMatch(/^[A-Z]{5}$/);
    expect(parseRoomCode(c.toLowerCase())).toBe(c);
    expect(parseRoomCode('AB1')).toBeNull();
  });

  it('is in the lobby until started, then round 0 with the same spin for everyone', () => {
    const ms = [member('AAAAAA', 1), member('BBBBBB', 2)];
    expect(resolve({ ...meta, started: undefined }, ms, pool, T0).phase).toBe('lobby');
    const r = resolve(meta, ms, pool, T0 + 1000);
    expect(r.phase).toBe('draft');
    expect(r.round).toBe(0);
    expect(r.spin).toEqual(resolve(meta, [...ms].reverse(), pool, T0 + 2000).spin);
  });

  it('first come, first served: a player can only be drafted once', () => {
    const a = member('AAAAAA', 1);
    const b = member('BBBBBB', 2);
    const r0 = resolve(meta, [a, b], pool, T0 + 10);
    const st = seatState(pool, 0, r0.rosters, r0.taken, r0.spin, meta.seed);
    const { player, slot } = autoPick(st, pool);
    a.picks.push({ r: 0, pid: player.id, slot, t: T0 + 1000 });
    b.picks.push({ r: 0, pid: player.id, slot: 'B1', t: T0 + 2000 }); // same player, later: ignored
    const r = resolve(meta, [a, b], pool, T0 + 3000);
    expect(r.rosters[0][slot]?.id).toBe(player.id);
    expect(Object.values(r.rosters[1]).some((p) => p?.id === player.id)).toBe(false);
    expect(r.picked).toEqual([true, false]);
  });

  it('losing a dead heat: the re-pick counts (not the lost first try)', () => {
    const a = member('AAAAAA', 1);
    const b = member('BBBBBB', 2);
    const r0 = resolve(meta, [a, b], pool, T0 + 10);
    const st = seatState(pool, 1, r0.rosters, r0.taken, r0.spin, meta.seed);
    const { player, slot } = autoPick(st, pool);
    a.picks.push({ r: 0, pid: player.id, slot, t: T0 + 1000 });
    b.picks.push({ r: 0, pid: player.id, slot, t: T0 + 1001 }); // lost by a millisecond
    const mid = resolve(meta, [a, b], pool, T0 + 1500);
    expect(mid.picked).toEqual([true, false]);
    const other = autoPick(seatState(pool, 1, mid.rosters, mid.taken, mid.spin, meta.seed), pool);
    b.picks.push({ r: 0, pid: other.player.id, slot: other.slot, t: T0 + 3000 }); // picks again
    const r = resolve(meta, [a, b], pool, T0 + 3000);
    expect(r.rosters[1][other.slot]?.id).toBe(other.player.id);
    expect(r.autos).toEqual([]);
    // Everyone's in, so round 2 opens after the re-pick (not at the deadline).
    expect(resolve(meta, [a, b], pool, T0 + 3000 + SPIN_MS + 1).round).toBe(1);
  });

  it('the next round opens the moment everyone has picked', () => {
    const a = member('AAAAAA', 1);
    const r0 = resolve(meta, [a], pool, T0 + 10);
    const { player, slot } = autoPick(seatState(pool, 0, r0.rosters, r0.taken, r0.spin, meta.seed), pool);
    a.picks.push({ r: 0, pid: player.id, slot, t: T0 + 4000 });
    const r = resolve(meta, [a], pool, T0 + 4000 + SPIN_MS + 1);
    expect(r.round).toBe(1);
    expect(r.roundStart).toBe(T0 + 4000 + SPIN_MS);
  });

  it('the clock drafts full, legal rosters for players who never pick', () => {
    const ms = [member('AAAAAA', 1), member('BBBBBB', 2), member('CCCCCC', 3)];
    const end = T0 + PARTY_ROUNDS * (PICK_MS + SPIN_MS) + 1;
    const r = resolve(meta, ms, pool, end);
    expect(r.phase).toBe('season');
    expect(r.autos).toHaveLength(PARTY_ROUNDS * 3);
    for (const roster of r.rosters) expect(ALL_SLOTS.every((k) => roster[k])).toBe(true);
    const ids = r.rosters.flatMap((x) => Object.values(x).map((p) => p!.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every phone simulates the identical season and placings', () => {
    const ms = [member('AAAAAA', 1), member('BBBBBB', 2)];
    const r = resolve(meta, ms, pool, T0 + PARTY_ROUNDS * (PICK_MS + SPIN_MS) + 1);
    const s1 = partySeason(meta, ms, r.rosters, pool);
    const s2 = partySeason(meta, [...ms].reverse(), r.rosters, pool);
    expect(s1.season.records).toEqual(s2.season.records);
    expect(s1.wins).toHaveLength(83);
    expect(placings(s1)).toEqual(placings(s2));
    expect(s1.season.records.reduce((n, x) => n + x.w + x.l, 0)).toBe(30 * 82);
  }, 60_000);
});

describe('seat flex (rarest pull)', async () => {
  const { parseFlex } = await import('./party');
  it('accepts a real card with a special finish', () => {
    expect(parseFlex('victor-wembanyama-2026-27:violet')).toEqual({ id: 'victor-wembanyama-2026-27', finish: 'violet' });
  });
  it('drops junk, unknown cards, base and fake finishes', () => {
    for (const bad of [undefined, 42, '', 'nope:rainbow', 'victor-wembanyama-2026-27:base', 'victor-wembanyama-2026-27:<b>', 'x'.repeat(200)]) expect(parseFlex(bad)).toBeNull();
  });
});
