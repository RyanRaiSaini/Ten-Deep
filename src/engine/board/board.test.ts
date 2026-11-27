import { describe, expect, it } from 'vitest';
import { current2026 } from '../../data/current2026';
import { MODE_BY_ID } from '../../data/modes';
import { draftLeague } from '../aiDraft';
import { createRng } from '../rng';
import { advance, createSeason, type SeasonState } from '../season';
import { ALL_SLOTS, type Roster } from '../types';
import { CARDS, CRISIS_OBJECTIVES, SEASON_EVENTS, TAKEOVER_OBJECTIVES, cardOf } from './cards';
import { blocked, marketOptions, signOption } from './market';
import { originIndex } from './origin';
import { prepareOffer, resolveCard, type PlayCtx } from './play';
import { checkDemands, holds } from './rules';
import { STOPS, newBoard, type BoardState } from './state';
import { arrive, resolve, reveal } from './stop';

const pool = current2026;
const allTime = MODE_BY_ID['all-time'].pool;
const league = draftLeague(pool, new Set(), 30, createRng('board-league'));
const fresh = (seed = 'board') => createSeason({ ...league[0], id: 'user' }, league.slice(1), seed);
const origin = originIndex([pool, allTime]);
const ctxFor = (season: SeasonState): PlayCtx => ({
  season, origin, pool, allTime, history: false, allTimeMode: false, teamName: (f) => f.toUpperCase(),
});

const names = (teams: Roster[]) => teams.flatMap((t) => ALL_SLOTS.map((k) => t.slots[k].name));
function assertLegal(teams: Roster[]) {
  for (const t of teams) for (const k of ALL_SLOTS) expect(t.slots[k], `${t.name} ${k}`).toBeDefined();
  const n = names(teams);
  expect(new Set(n).size, 'a player is on two teams').toBe(n.length);
}

describe('deck', () => {
  it('has 72 cards (no double or nothing), and stops only deal objectives or good-or-bad events', () => {
    expect(CARDS).toHaveLength(72);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(72);
    expect(CARDS.some((c) => c.id === 'double-nothing')).toBe(false);
    for (const id of [...CRISIS_OBJECTIVES, ...TAKEOVER_OBJECTIVES]) expect(cardOf(id).kind, id).toBe('demand');
    for (const id of SEASON_EVENTS) expect(['event', 'perk'], id).toContain(cardOf(id).kind);
  });

  it('every card resolves cleanly at preseason and mid-season, and rosters stay legal', () => {
    const mid = advance(fresh('mid'), 30);
    for (const s of [fresh('pre'), mid]) {
      for (const c of CARDS) {
        const b = newBoard('sac');
        const ctx = ctxFor(s);
        const offer = prepareOffer(c.id, b, ctx);
        for (const option of offer.options ?? [undefined]) {
          const res = resolveCard(c.id, offer, { incomingId: offer.players?.[0]?.id, outSlot: offer.outSlots?.[0], option }, b, ctx);
          assertLegal(res.season.teams);
          expect(Number.isFinite(res.season.fees ?? 0), c.id).toBe(true);
          // Checking demands right after never throws.
          checkDemands(res.board, { ...ctx, season: res.season });
        }
      }
    }
  });
});

describe('a full season of stops', () => {
  it('deals six unique cards at each of 7 stops, never repeats a card, and settles every demand by the end', () => {
    let s = fresh('season');
    let b: BoardState = newBoard('sac');
    const seen = new Set<string>();
    for (let i = 0; i < STOPS.length; i++) {
      s = advance({ ...s, deadlineUsed: true }, STOPS[i] - s.round);
      expect(s.round).toBe(STOPS[i]);
      const a = arrive(b, ctxFor(s));
      ({ board: b, season: s } = a);
      if (b.firedAt !== undefined) break;
      expect(b.hand).toHaveLength(6);
      expect(new Set(b.hand).size).toBe(6);
      b = reveal(b, i % 6, ctxFor(s));
      expect(b.picked).toBeTruthy();
      expect(seen.has(b.picked!)).toBe(false);
      seen.add(b.picked!);
      const o = b.offer!;
      ({ board: b, season: s } = resolve(b, { incomingId: o.players?.[0]?.id, outSlot: o.outSlots?.[0], option: o.options?.[0] }, ctxFor(s)));
      assertLegal(s.teams);
    }
    s = advance({ ...s, deadlineUsed: true }, 82);
    const end = checkDemands(b, ctxFor(s), true);
    expect(end.board.demands.every((d) => d.status !== 'active')).toBe(true);
    expect(end.board.confidence).toBeGreaterThanOrEqual(0);
    expect(end.board.confidence).toBeLessThanOrEqual(10);
  });

  it('is deterministic: the same seed deals the same hand', () => {
    const s = fresh('same');
    expect(arrive(newBoard('sac'), ctxFor(s)).board.hand).toEqual(arrive(newBoard('sac'), ctxFor(s)).board.hand);
  });
});

describe('board confidence', () => {
  it('a failed demand costs its penalty, a met one is +1, and 0 gets you fired', () => {
    let s = fresh('conf');
    const b0: BoardState = { ...newBoard('sac'), confidence: 3 };
    // Win 8 of the next 10 is due at round 10; force a failure by checking at the due round with no wins.
    const b1 = resolveCard('win-now', {}, {}, b0, ctxFor(s)).board;
    s = { ...s, round: 10, records: s.records.map((r, i) => (i === 0 ? { ...r, w: 0, l: 10 } : r)) };
    const out = checkDemands(b1, ctxFor(s));
    expect(out.board.confidence).toBe(0);
    expect(out.board.firedAt).toBe(10);
    expect(out.events.map((e) => e.kind)).toEqual(['failed', 'fired']);
  });

  it('statement signing is met by a top-of-market signing in the front office', () => {
    const s = fresh('market');
    let b = resolveCard('statement-signing', {}, {}, newBoard('sac'), ctxFor(s)).board;
    const opts = marketOptions(s, b, 'B5', pool);
    const top = opts.find((o) => o.tier === 'top');
    expect(top).toBeTruthy();
    const signed = signOption(s, b, 'B5', top!);
    assertLegal(signed.season.teams);
    b = signed.board;
    expect(holds(b.demands[0], b, ctxFor(signed.season))).toBe(true);
    const out = checkDemands(b, ctxFor(signed.season));
    expect(out.board.demands[0].status).toBe('done');
    expect(out.board.confidence).toBe(10);
  });

  it('the market offers low, mid and top tiers plus a minimum bench option, and respects the budget', () => {
    const s = fresh('tiers');
    const b = newBoard('sac');
    const opts = marketOptions(s, b, 'C', pool);
    expect(opts.map((o) => o.tier)).toEqual(['low', 'mid', 'top', 'bench']);
    for (const o of opts) expect(o.player.pos === 'C' || o.player.pos2 === 'C' || o.player.more?.includes('C')).toBe(true);
    expect(blocked(s, { ...b, crunch: true }, 'C', opts[2])).toBe('crunch');
    expect(blocked(s, b, 'C', opts[3])).toBe(null);
  });

  it('the agent friend takes 25% off one priced signing, and the bench option signs for the minimum', () => {
    const s = fresh('agent');
    const b = { ...newBoard('sac'), perks: ['agent-friend'] };
    const mid = marketOptions(s, b, 'B5', pool).find((o) => o.tier === 'mid')!;
    const full = marketOptions(s, newBoard('sac'), 'B5', pool).find((o) => o.player.name === mid.player.name);
    if (full) expect(mid.pay).toBeCloseTo(full.pay * 0.75, 0);
    const signed = signOption(s, b, 'B5', mid);
    expect(signed.board.perks).not.toContain('agent-friend');
    expect(signed.season.teams[0].slots.B5.salary).toBe(mid.pay);
    const bench = marketOptions(s, newBoard('sac'), 'B4', pool).find((o) => o.tier === 'bench')!;
    expect(signOption(s, newBoard('sac'), 'B4', bench).season.teams[0].slots.B4.salary).toBe(1);
  });

  it('finance cards move cap room', () => {
    const s = fresh('cash');
    const plus = resolveCard('owner-all-in', prepareOffer('owner-all-in', newBoard('x'), ctxFor(s)), {}, newBoard('x'), ctxFor(s));
    expect(plus.season.fees).toBe(-25);
    const minus = resolveCard('arena-repairs', prepareOffer('arena-repairs', newBoard('x'), ctxFor(s)), {}, newBoard('x'), ctxFor(s));
    expect(minus.season.fees).toBe(10);
    expect(cardOf('owner-all-in').kind).toBe('finance');
  });
});
