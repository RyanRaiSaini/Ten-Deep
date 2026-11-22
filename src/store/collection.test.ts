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
