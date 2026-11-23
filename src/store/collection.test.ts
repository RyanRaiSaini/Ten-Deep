import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {}, clear: async () => {} },
}));

const { useCollection } = await import('./collection');

describe('collection store', () => {
  beforeEach(() => useCollection.setState(useCollection.getInitialState(), true));

  it('daily check-in grants one Daily pick per day, never twice', () => {
    useCollection.getState().checkIn('2026-11-22');
    useCollection.getState().checkIn('2026-11-22');
    const p = useCollection.getState().pending;
    expect(p.map((x) => x.type)).toEqual(['daily']);
    expect(p[0].cards).toHaveLength(5);
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

  it('a finished run earns one pick per run, scaled by result', () => {
    useCollection.getState().awardRun('run-a', { wins: 60, champion: true, madePlayoffs: true });
    useCollection.getState().awardRun('run-a', { wins: 60, champion: true, madePlayoffs: true });
    const p = useCollection.getState().pending;
    expect(p).toHaveLength(1);
    expect(p[0].type).toBe('champion');
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

  it('keeping a card adds it to the collection and consumes the pick', () => {
    useCollection.getState().checkIn('2026-11-22');
    const pick = useCollection.getState().pending[0];
    useCollection.getState().keep(pick.id, pick.cards[2]);
    expect(useCollection.getState().pending).toHaveLength(0);
    expect(useCollection.getState().owned[pick.cards[2]].count).toBe(1);
    // can't keep a card that wasn't in the pick
    useCollection.getState().checkIn('2026-11-23');
    const next = useCollection.getState().pending[0];
    useCollection.getState().keep(next.id, 'not-in-pick');
    expect(useCollection.getState().pending).toHaveLength(1);
  });
});
