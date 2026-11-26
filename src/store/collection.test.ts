import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {}, clear: async () => {} },
}));

const { useCollection } = await import('./collection');

describe('collection store', () => {
  beforeEach(() => useCollection.setState(useCollection.getInitialState(), true));

  it('logging in alone grants no pick (packs come from playing)', () => {
    useCollection.getState().checkIn('2026-11-22');
    useCollection.getState().checkIn('2026-11-23');
    expect(useCollection.getState().pending).toEqual([]);
  });

  it('one power-up a day, and never twice on the same pick', () => {
    useCollection.getState().awardRun('run-p', { wins: 40, losses: 42, champion: false, madePlayoffs: false, round: -1, finalsSweep: false, playoffLosses: 0 });
    useCollection.getState().awardRun('run-q', { wins: 41, losses: 41, champion: false, madePlayoffs: false, round: -1, finalsSweep: false, playoffLosses: 0 });
    const [a, b] = useCollection.getState().pending;
    expect(useCollection.getState().powerUp(a.id, '2026-11-25')).not.toBeNull();
    expect(useCollection.getState().powerUp(b.id, '2026-11-25')).toBeNull();
    expect(useCollection.getState().powerUp(a.id, '2026-11-25')).toBeNull();
    expect(useCollection.getState().powerUp(b.id, '2026-11-26')).not.toBeNull();
    // A pick that's been powered up once can't be powered up again, even on a new day.
    expect(useCollection.getState().powerUp(a.id, '2026-11-27')).toBeNull();
    expect(useCollection.getState().powerUp(b.id, '2026-11-28')).toBeNull();
  });

  it('first check-in grants a 10-card starter squad and a full lineup, once', () => {
    useCollection.getState().checkIn('2026-11-22');
    expect(Object.keys(useCollection.getState().owned)).toHaveLength(10);
    expect(Object.keys(useCollection.getState().lineup)).toHaveLength(10);
    useCollection.getState().checkIn('2026-11-23');
    expect(Object.keys(useCollection.getState().owned)).toHaveLength(10);
  });

  it('7 straight days earns a Weekly pick; a gap resets the streak', () => {
    for (let d = 1; d <= 7; d++) useCollection.getState().checkIn(`2026-12-0${d}`);
    expect(useCollection.getState().streak).toBe(7);
    expect(useCollection.getState().pending.filter((x) => x.type === 'weekly')).toHaveLength(1);
    useCollection.getState().checkIn('2026-12-10');
    expect(useCollection.getState().streak).toBe(1);
  });

  it('a finished run pays once: a season pick, plus a playoff pick for a title', () => {
    const won = { wins: 60, losses: 22, champion: true, madePlayoffs: true, round: 3, finalsSweep: false, playoffLosses: 4 };
    useCollection.getState().awardRun('run-a', won);
    useCollection.getState().awardRun('run-a', won);
    const p = useCollection.getState().pending;
    expect(p.map((x) => x.type)).toEqual(['good', 'champion']);
    expect(new Set(p.map((x) => x.id)).size).toBe(2);
  });

  it('lineup only accepts owned cards in legal slots; autoFill uses the collection', () => {
    useCollection.setState({ owned: { 'stephen-curry-2016': { count: 1, firstDay: '' } } });
    useCollection.getState().setSlot('PG', 'stephen-curry-2016');
    expect(useCollection.getState().lineup.PG).toBe('stephen-curry-2016');
    useCollection.getState().setSlot('C', 'stephen-curry-2016'); // wrong position
    expect(useCollection.getState().lineup.C).toBeUndefined();
    useCollection.getState().setSlot('SG', 'shaquille-o-neal-2000'); // not owned
    expect(useCollection.getState().lineup.SG).toBeUndefined();
    useCollection.getState().setSlot('PG', null);
    expect(useCollection.getState().lineup.PG).toBeUndefined();
    useCollection.getState().autoFillLineup();
    expect(useCollection.getState().lineup.PG).toBe('stephen-curry-2016');
  });

  it('gauntlet: clearing advances one stage at a time; rewards at 3/6/10 are paid once', () => {
    const g = () => useCollection.getState();
    g().recordStage(1, true); // can't skip ahead
    expect(g().gauntlet.cleared).toBe(0);
    for (let s = 0; s < 3; s++) g().recordStage(s, true);
    expect(g().gauntlet.cleared).toBe(3);
    expect(g().pending.filter((p) => p.type === 'playoffs')).toHaveLength(1);
    g().recordStage(2, true); // replaying a cleared stage pays nothing more
    expect(g().pending.filter((p) => p.type === 'playoffs')).toHaveLength(1);
    g().recordStage(3, false);
    expect(g().gauntlet.cleared).toBe(3);
  });

  it('completing a set by keeping its last card awards the set pick', async () => {
    const { SETS, setReward } = await import('../engine/collect/sets');
    const set = SETS.find((s) => s.id === 'chi-1996')!;
    const last = set.cards[set.cards.length - 1];
    useCollection.setState({
      owned: Object.fromEntries(set.cards.slice(0, -1).map((id) => [id, { count: 1, firstDay: '' }])),
      pending: [{ id: 'test-pick', type: 'daily', source: 'test', cards: [last, 'a', 'b', 'c', 'd'] }],
    });
    useCollection.getState().keep('test-pick', last);
    const p = useCollection.getState().pending;
    expect(p).toHaveLength(1);
    expect(p[0].type).toBe(setReward(set));
    expect(p[0].source).toContain('set:chi-1996');
  });

  const loss = (k: string) => useCollection.getState().awardRun(k, { wins: 30, losses: 52, champion: false, madePlayoffs: false, round: -1, finalsSweep: false, playoffLosses: 0 });

  it('keeping a card adds it to the collection and consumes the pick', () => {
    loss('run-k1');
    const pick = useCollection.getState().pending[0];
    useCollection.getState().keep(pick.id, pick.cards[2]);
    expect(useCollection.getState().pending).toHaveLength(0);
    expect(useCollection.getState().owned[pick.cards[2]].count).toBe(1);
    // can't keep a card that wasn't in the pick
    loss('run-k2');
    const next = useCollection.getState().pending[0];
    useCollection.getState().keep(next.id, 'not-in-pick');
    expect(useCollection.getState().pending).toHaveLength(1);
  });
});

describe('streak freezes', () => {
  it('a 7-day streak earns a freeze, and a missed day spends it instead of breaking the streak', () => {
    useCollection.setState(useCollection.getInitialState(), true);
    for (let d = 1; d <= 7; d++) useCollection.getState().checkIn(`2026-12-0${d}`);
    expect(useCollection.getState()).toMatchObject({ streak: 7, freezes: 1 });
    useCollection.getState().checkIn('2026-12-09'); // missed the 8th
    expect(useCollection.getState()).toMatchObject({ streak: 8, freezes: 0, freezesUsed: 1 });
    useCollection.getState().checkIn('2026-12-11'); // missed again, no freeze left
    expect(useCollection.getState().streak).toBe(1);
  });
});

describe('power-up', () => {
  it('an upgrade changes the pick type and its cards, the same way every time', () => {
    const outcome = { wins: 30, losses: 52, champion: false, madePlayoffs: false, round: -1, finalsSweep: false, playoffLosses: 0 };
    const roll = () => {
      useCollection.setState(useCollection.getInitialState(), true);
      useCollection.getState().awardRun('run-u', outcome);
      const id = useCollection.getState().pending[0].id;
      return [useCollection.getState().powerUp(id, '2026-11-25'), useCollection.getState().pending[0]] as const;
    };
    const [r, p] = roll();
    expect(p.taps).toBe(1);
    expect(p.type).toBe(r === 'up' ? 'good' : 'run');
    expect(roll()).toEqual([r, p]);
  });
});
