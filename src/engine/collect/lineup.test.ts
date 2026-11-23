import { describe, expect, it } from 'vitest';
import { ALL_CARDS, CARD_BY_ID } from '../../data/cards';
import { createRng } from '../rng';
import { bestOf } from '../series';
import { ALL_SLOTS, STARTER_SLOTS } from '../types';
import { GAUNTLET, autoFill, canPlace, chemistry, cardPlayer, lineupRoster, playStage, stageReward } from './lineup';

const byName = (n: string) => ALL_CARDS.filter((c) => c.name === n).sort((a, b) => b.ovr - a.ovr)[0];

describe('lineup', () => {
  it('every card maps back to a full player with sub-ratings', () => {
    for (const c of ALL_CARDS.slice(0, 200)) {
      const p = cardPlayer(c.id);
      expect(p.name).toBe(c.name);
      expect(p.ovr).toBe(c.ovr);
      expect(p.def).toBeGreaterThan(0);
    }
  });

  it('starters must fit the position; bench takes anyone; no player twice', () => {
    const shaq = byName("Shaquille O'Neal");
    expect(canPlace({}, shaq.id, 'C')).toBe(true);
    expect(canPlace({}, shaq.id, 'PG')).toBe(false);
    expect(canPlace({}, shaq.id, 'B3')).toBe(true);
    const otherShaq = ALL_CARDS.find((c) => c.name === shaq.name && c.id !== shaq.id)!;
    expect(canPlace({ C: shaq.id }, otherShaq.id, 'B1')).toBe(false);
  });

  it('empty slots are filled by call-ups, so any partial lineup can play', () => {
    const r = lineupRoster({ PG: byName('Stephen Curry').id });
    for (const k of ALL_SLOTS) expect(r.slots[k]).toBeDefined();
    expect(r.slots.PG.name).toBe('Stephen Curry');
    expect(r.slots.C.id.startsWith('callup-')).toBe(true);
  });

  it('chemistry: same franchise and same decade groups add up to +3', () => {
    const bulls = ALL_CARDS.filter((c) => c.team.endsWith('Bulls') && c.season.startsWith('199'));
    const ids = [...new Map(bulls.map((c) => [c.name, c.id])).values()].slice(0, 5);
    const chem = chemistry(ids.map((id) => CARD_BY_ID[id]));
    expect(chem.bonus).toBeGreaterThanOrEqual(2);
    expect(chem.bonus).toBeLessThanOrEqual(3);
    expect(chemistry([]).bonus).toBe(0);
    expect(lineupRoster(Object.fromEntries(ids.map((id, i) => [ALL_SLOTS[5 + i], id]))).mod).toBe(chem.bonus);
  });

  it('autoFill builds a legal lineup from owned cards (best first)', () => {
    const owned = ALL_CARDS.filter((c) => c.ovr >= 85).slice(0, 30).map((c) => c.id);
    const l = autoFill(owned);
    const names = Object.values(l).map((id) => CARD_BY_ID[id!].name);
    expect(new Set(names).size).toBe(names.length);
    for (const k of STARTER_SLOTS) if (l[k]) expect(canPlace({ ...l, [k]: undefined }, l[k]!, k)).toBe(true);
  });
});

describe('gauntlet', () => {
  it('has 10 stages of rising strength ending with an all-time great team', () => {
    expect(GAUNTLET).toHaveLength(10);
    for (let i = 1; i < 10; i++) expect(GAUNTLET[i].strength).toBeGreaterThanOrEqual(GAUNTLET[i - 1].strength);
    expect(GAUNTLET[9].strength).toBeGreaterThan(GAUNTLET[0].strength + 5);
  });

  it('stages are best-of-3 and deterministic', () => {
    const lineup = autoFill(ALL_CARDS.filter((c) => c.ovr >= 80).map((c) => c.id));
    const r = playStage(lineupRoster(lineup), 0, 'seed');
    expect(Math.max(r.winsA, r.winsB)).toBe(2);
    expect(playStage(lineupRoster(lineup), 0, 'seed')).toEqual(r);
  });

  it('a lineup of legends beats stage 1 far more often than call-ups do', () => {
    const legends = lineupRoster(autoFill(ALL_CARDS.filter((c) => c.ovr >= 93).map((c) => c.id)));
    const callups = lineupRoster({});
    let legendWins = 0;
    let callupWins = 0;
    for (let i = 0; i < 40; i++) {
      if (playStage(legends, 0, `l${i}`).winner === 'a') legendWins++;
      if (playStage(callups, 0, `c${i}`).winner === 'a') callupWins++;
    }
    expect(legendWins).toBeGreaterThan(callupWins + 15);
  });

  it('rewards picks at stages 3, 6 and 10', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(stageReward)).toEqual([null, null, 'playoffs', null, null, 'weekly', null, null, null, 'champion']);
  });

  it('bestOf(n) ends when one side reaches n', () => {
    const lineup = lineupRoster(autoFill(ALL_CARDS.filter((c) => c.ovr >= 85).map((c) => c.id)));
    const r = bestOf(lineup, lineupRoster({}), createRng('bo'), 2);
    expect(Math.max(r.winsA, r.winsB)).toBe(2);
  });
});
