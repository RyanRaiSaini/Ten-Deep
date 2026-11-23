import { describe, expect, it } from 'vitest';
import { current2026 } from '../../data/current2026';
import { MODE_BY_ID } from '../../data/modes';
import { draftLeague } from '../aiDraft';
import { createRng } from '../rng';
import { advance, createSeason } from '../season';
import { ALL_SLOTS, BENCH_SLOTS, type Roster } from '../types';
import { applyCard, type Decision } from './apply';
import { boardObjective, verdict } from './board';
import { CARD_ROUNDS, DECK, drawCard, type CardId } from './deck';
import { prepareCard } from './offers';
import { champion, simPlayoffsToEnd, startPlayoffs } from '../playoffs';

const pool = current2026;
const allTime = MODE_BY_ID['all-time'].pool;
const league = draftLeague(pool, new Set(), 30, createRng('crisis-league'));
const fresh = (seed = 'crisis') => createSeason({ ...league[0], id: 'user' }, league.slice(1), seed);

const names = (teams: Roster[]) => teams.flatMap((t) => ALL_SLOTS.map((k) => t.slots[k].name));
function assertLegal(teams: Roster[]) {
  for (const t of teams) for (const k of ALL_SLOTS) expect(t.slots[k], `${t.name} ${k}`).toBeDefined();
  const n = names(teams);
  expect(new Set(n).size, 'a player is on two teams').toBe(n.length);
}

/** A reasonable automatic decision for any card (first offer, first legal slot, option a). */
function autoDecision(card: ReturnType<typeof prepareCard>): Decision {
  return { incomingId: card.offer?.[0]?.id, outSlot: card.outSlots?.[0], option: 'a' };
}

describe('deck', () => {
  it('has 16 unique cards: 6 good, 7 bad, 3 legendary', () => {
    expect(DECK).toHaveLength(16);
    expect(new Set(DECK.map((c) => c.id)).size).toBe(16);
    expect(DECK.filter((c) => c.rarity === 'good')).toHaveLength(6);
    expect(DECK.filter((c) => c.rarity === 'bad')).toHaveLength(7);
    expect(DECK.filter((c) => c.rarity === 'legendary')).toHaveLength(3);
  });

  it('draws 4 cards per run at preseason, December, February and April, with no repeats, deterministically', () => {
    expect(CARD_ROUNDS).toEqual([0, 20, 45, 70]);
    const run = (seed: string) => {
      const drawn: CardId[] = [];
      for (let slot = 0; slot < 4; slot++) drawn.push(drawCard(seed, slot, drawn));
      return drawn;
    };
    for (let i = 0; i < 50; i++) {
      const d = run(`run-${i}`);
      expect(new Set(d).size).toBe(4);
      expect(run(`run-${i}`)).toEqual(d);
    }
  });
});

describe('every card keeps the league legal', () => {
  it.each(DECK.map((c) => [c.id] as const))('%s', (id) => {
    for (let i = 0; i < 5; i++) {
      const s0 = advance(fresh(`legal-${id}-${i}`), 20);
      const card = prepareCard(s0, id, 1, pool, allTime);
      const s1 = applyCard(s0, card, autoDecision(card));
      assertLegal(s1.teams);
      if (card.choice) assertLegal(applyCard(s0, card, { option: 'b' }).teams);
    }
  });
});

describe('card effects', () => {
  const s0 = advance(fresh('effects'), 20);
  const user = s0.teams[0];
  const best = ALL_SLOTS.map((k) => user.slots[k]).sort((a, b) => b.ovr - a.ovr)[0];

  it('Hot Streak: +3 for the next 10 games', () => {
    const s = applyCard(s0, prepareCard(s0, 'hot-streak', 1, pool, allTime), {});
    expect(s.mods).toContainEqual({ amount: 3, fromRound: 20, toRound: 30 });
  });

  it('Coach Fired: −3 for 10 games, then +1 for the rest of the season', () => {
    const s = applyCard(s0, prepareCard(s0, 'coach-fired', 1, pool, allTime), {});
    expect(s.mods).toContainEqual({ amount: -3, fromRound: 20, toRound: 30 });
    expect(s.mods).toContainEqual({ amount: 1, fromRound: 30, toRound: 82 });
  });

  it('Blow It Up: your best player leaves for a prospect aged 23 or younger', () => {
    const s = applyCard(s0, prepareCard(s0, 'blow-it-up', 1, pool, allTime), {});
    const after = ALL_SLOTS.map((k) => s.teams[0].slots[k]);
    expect(after.some((p) => p.name === best.name)).toBe(false);
    expect(after.some((p) => !user.slots[ALL_SLOTS[0]] || ((p.age ?? 99) <= 23 && !ALL_SLOTS.some((k) => user.slots[k].name === p.name)))).toBe(true);
  });

  it('Media Frenzy: 5 celebrity options; swapping one in moves your player to his old team', () => {
    const card = prepareCard(s0, 'media-frenzy', 1, pool, allTime);
    expect(card.offer).toHaveLength(5);
    const star = card.offer![0];
    const outSlot = card.outSlots![0];
    const outgoing = user.slots[outSlot];
    const s = applyCard(s0, card, { incomingId: star.id, outSlot });
    // He joins your roster (re-seated at a position he plays) and your player is gone.
    const mine = ALL_SLOTS.map((k) => s.teams[0].slots[k].name);
    expect(mine).toContain(star.name);
    expect(mine).not.toContain(outgoing.name);
    const formerTeam = s0.teams.findIndex((t, i) => i > 0 && ALL_SLOTS.some((k) => t.slots[k].name === star.name));
    if (formerTeam > 0) expect(ALL_SLOTS.some((k) => s.teams[formerTeam].slots[k].name === outgoing.name)).toBe(true);
  });

  it('Injury Bug: your two heaviest-minute players are hurt for 8 and 15 games', () => {
    const s = applyCard(s0, prepareCard(s0, 'injury-bug', 1, pool, allTime), {});
    const hurt = Object.entries(s.injuries).filter(([id, g]) => g > 0 && ALL_SLOTS.some((k) => user.slots[k].id === id));
    expect(hurt.map(([, g]) => g).sort((a, b) => a - b)).toEqual(expect.arrayContaining([8, 15]));
  });

  it('Clean Bill of Health: heals your injuries', () => {
    const hurt = { ...s0, injuries: { ...s0.injuries, [user.slots.PG.id]: 12 } };
    const s = applyCard(hurt, prepareCard(hurt, 'clean-bill', 1, pool, allTime), {});
    expect(s.injuries[user.slots.PG.id] ?? 0).toBe(0);
  });

  it('Superteam Rumor: option a adds a 95+ star and drops your two highest-paid starters; b changes nothing', () => {
    const card = prepareCard(s0, 'superteam-rumor', 1, pool, allTime);
    const yes = applyCard(s0, card, { option: 'a' });
    expect(ALL_SLOTS.some((k) => yes.teams[0].slots[k].ovr >= 95 && yes.teams[0].slots[k].name === card.offer![0].name)).toBe(true);
    const no = applyCard(s0, card, { option: 'b' });
    expect(no.teams[0]).toEqual(s0.teams[0]);
  });

  it('Legend Comeback brings an all-time great (90+) onto your bench', () => {
    const card = prepareCard(s0, 'legend-comeback', 1, pool, allTime);
    expect(card.offer!.every((p) => p.ovr >= 90)).toBe(true);
    const s = applyCard(s0, card, { incomingId: card.offer![0].id, outSlot: card.outSlots![0] });
    expect(BENCH_SLOTS.some((k) => s.teams[0].slots[k].name === card.offer![0].name)).toBe(true);
  });
});

describe('board', () => {
  it('sets the objective from roster strength rank and grades the season', () => {
    const s = fresh('board');
    const o = boardObjective(s);
    expect(['title', 'semis', 'playoffs', 'wins30']).toContain(o.tier);
    const done = advance(advance(s, 82), 82);
    const ps = simPlayoffsToEnd(startPlayoffs(done));
    const v = verdict(o, done, ps);
    expect(['legend', 'extended', 'survived', 'fired']).toContain(v);
    if (champion(ps) === 0) expect(v).toBe('legend');
  });
});
