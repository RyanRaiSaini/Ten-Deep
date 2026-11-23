import { describe, expect, it } from 'vitest';
import { draftLeague } from './aiDraft';
import { simGame } from './game';
import { createRng } from './rng';
import { lineupMinutes, teamStrength } from './rotation';
import { ALL_SLOTS, type Roster } from './types';
import { makePool } from './__fixtures__/pool';

const pool = makePool();
const league = draftLeague(pool, new Set(), 30, createRng('g'));
const byStrength = [...league].sort(
  (a, b) => teamStrength(lineupMinutes(b, new Set())).net - teamStrength(lineupMinutes(a, new Set())).net,
);
const strong = byStrength[0];
const weak = byStrength[byStrength.length - 1];

describe('lineupMinutes', () => {
  it('sums to 240 for a healthy roster, starters play more than the deep bench', () => {
    const lm = lineupMinutes(strong, new Set());
    expect(lm.reduce((s, x) => s + x.minutes, 0)).toBeCloseTo(240, 5);
    const starter = lm.find((x) => x.slot === 'PG')!.minutes;
    const deep = lm.find((x) => x.slot === 'B5')!.minutes;
    expect(starter).toBeGreaterThanOrEqual(28);
    expect(starter).toBeLessThanOrEqual(38);
    expect(deep).toBeLessThan(starter);
  });

  it('still sums to 240 with four players out, nobody over 48', () => {
    const out = new Set(ALL_SLOTS.slice(0, 4).map((s) => strong.slots[s].id));
    const lm = lineupMinutes(strong, out);
    expect(lm.reduce((s, x) => s + x.minutes, 0)).toBeCloseTo(240, 5);
    for (const x of lm) {
      expect(out.has(x.player.id)).toBe(false);
      expect(x.minutes).toBeLessThanOrEqual(48);
    }
  });

  it('flags out-of-position fill-ins when a starter is out', () => {
    const r: Roster = { ...strong, slots: { ...strong.slots } };
    const out = new Set([r.slots.C.id]);
    const lm = lineupMinutes(r, out);
    const cSlot = lm.find((x) => x.slot === 'C')!;
    expect(cSlot.player.id).not.toBe(r.slots.C.id);
    const fits = cSlot.player.pos === 'C' || cSlot.player.pos2 === 'C';
    expect(cSlot.outOfPosition).toBe(!fits);
  });

  it('fields a full 240 minutes even with 6 players out', () => {
    const out = new Set(ALL_SLOTS.slice(0, 6).map((s) => strong.slots[s].id));
    const lm = lineupMinutes(strong, out);
    expect(lm.reduce((s, x) => s + x.minutes, 0)).toBeCloseTo(240, 5);
    for (const x of lm) expect(x.minutes).toBeLessThanOrEqual(48);
  });
});

describe('simGame', () => {
  const ctx = (seed: string) => ({ rng: createRng(seed), outHome: new Set<string>(), outAway: new Set<string>() });

  it('produces realistic NBA scores with no ties', () => {
    for (let i = 0; i < 500; i++) {
      const g = simGame(league[i % 30], league[(i + 7) % 30], ctx(`s${i}`));
      expect(g.homeScore).toBeGreaterThanOrEqual(80);
      expect(g.homeScore).toBeLessThanOrEqual(160);
      expect(g.awayScore).toBeGreaterThanOrEqual(80);
      expect(g.awayScore).toBeLessThanOrEqual(160);
      expect(g.homeScore).not.toBe(g.awayScore);
    }
  });

  it('the stronger team wins most games', () => {
    let wins = 0;
    for (let i = 0; i < 500; i++) {
      const g = simGame(strong, weak, ctx(`w${i}`));
      if (g.homeScore > g.awayScore) wins++;
    }
    expect(wins / 500).toBeGreaterThan(0.6);
  });

  it('is deterministic for the same seed', () => {
    expect(simGame(strong, weak, ctx('d'))).toEqual(simGame(strong, weak, ctx('d')));
  });

  it('box score points add up to the team score', () => {
    const g = simGame(strong, weak, ctx('box'));
    const homeIds = new Set(ALL_SLOTS.map((s) => strong.slots[s].id));
    const homePts = g.box.filter((b) => homeIds.has(b.playerId)).reduce((s, b) => s + b.pts, 0);
    expect(homePts).toBe(g.homeScore);
  });
});
