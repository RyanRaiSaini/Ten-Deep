import { describe, expect, it } from 'vitest';
import { current2026 } from '../../data/current2026';
import { franchiseOf } from '../conference';
import { ALL_SLOTS } from '../types';
import { ROUNDS, aiChoice, available, draftDone, draftPool, draftedLeague, makePick, newFantasy, picksUntilUser, simDraft, slotForPick } from './fantasy';

const franchises = current2026.teams.map(franchiseOf);
const pool = draftPool(current2026.teams);
const nameOf = (f: string) => {
  const t = current2026.teams.find((x) => franchiseOf(x) === f)!;
  return { name: `${t.city} ${t.name}`, colors: t.colors };
};

describe('fantasy draft', () => {
  it('snake order: 1→30, then 30→1', () => {
    expect([0, 1, 29, 30, 31, 59, 60].map((n) => slotForPick(n, 30))).toEqual([0, 1, 29, 29, 28, 0, 0]);
  });

  it('puts you in your spun slot, the AI takes the best player first, and stops at your turn', () => {
    const fd = newFantasy('sac', 4, franchises, 'fd-test');
    expect(fd.order).toHaveLength(30);
    expect(fd.order[4]).toBe('sac');
    expect(new Set(fd.order).size).toBe(30);
    expect(aiChoice(fd, 0, pool).name).toBe('Victor Wembanyama');
    const d = simDraft(fd, pool);
    expect(d.made).toBe(4);
    expect(picksUntilUser(d)).toBe(0);
  });

  it('drafts a full league: 30 teams of 10, nobody twice, your picks kept', () => {
    let d = simDraft(newFantasy('bos', 12, franchises, 'fd-full'), pool);
    const mine: string[] = [];
    while (!draftDone(d)) {
      const p = available(d, pool)[0];
      mine.push(p.id);
      d = simDraft(makePick(d, p.id), pool);
    }
    expect(d.made).toBe(30 * ROUNDS);
    expect(d.picks[12]).toEqual(mine);
    const league = draftedLeague(d, pool, nameOf);
    expect(league).toHaveLength(30);
    expect(league[0].id).toBe('user');
    expect(league[0].franchise).toBe('bos');
    const names = league.flatMap((t) => ALL_SLOTS.map((k) => t.slots[k].name));
    expect(names).toHaveLength(300);
    expect(new Set(names).size).toBe(300);
  });
});
