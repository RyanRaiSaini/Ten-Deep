import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => {
  const mem = new Map<string, string>();
  return {
    default: {
      getItem: async (k: string) => mem.get(k) ?? null,
      setItem: async (k: string, v: string) => void mem.set(k, v),
      removeItem: async (k: string) => void mem.delete(k),
      clear: async () => mem.clear(),
    },
  };
});

const { useGame } = await import('./game');
const { useProfile } = await import('./profile');
const { isComplete, options, fallbackPick, affordableSlots } = await import('../engine/draft');
const { POOLS } = await import('../data');

function draftAll(poolId = 'current-2026') {
  const g = useGame.getState();
  g.newRun(poolId);
  const pool = POOLS[poolId];
  while (!isComplete(useGame.getState().draft!)) {
    useGame.getState().doSpin();
    const d = useGame.getState().draft!;
    const o = options(d, pool).find((x) => x.affordable);
    if (o) useGame.getState().doPick(o.player.id, o.slots[0]);
    else if (affordableSlots(d, fallbackPick(d, pool), pool).length) useGame.getState().doFallback();
  }
  useGame.getState().startSeason();
}

describe('game store', () => {
  beforeEach(() => useGame.getState().quit());

  it('signing at the deadline twice (double tap) does not throw', async () => {
    draftAll();
    const { advance } = await import('../engine/season');
    const s = advance(useGame.getState().season!, 100);
    useGame.getState().openDeadline(s);
    useGame.getState().chooseDeadlineOut(s.teams[0].slots.B5.id);
    useGame.getState().spinDeadline();
    const cheap = { ...s.teams[0].slots.B5, id: 'cheap-signing', name: 'Cheap Signing', ovr: 64 };
    useGame.getState().signDeadline(cheap);
    expect(() => useGame.getState().signDeadline(cheap)).not.toThrow();
    expect(useGame.getState().season!.teams[0].slots.B5.id).toBe('cheap-signing');
  });

  it('franchise mode: AI teams come from All-Time and never duplicate the user\'s players', async () => {
    const { ALL_SLOTS } = await import('../engine/types');
    for (const fr of ['franchise-lal', 'franchise-chi', 'franchise-bos']) {
      draftAll(fr);
      const teams = useGame.getState().season!.teams;
      const mine = new Set(ALL_SLOTS.map((k) => teams[0].slots[k].name));
      for (const t of teams.slice(1)) for (const k of ALL_SLOTS) expect(mine.has(t.slots[k].name), `${fr}: ${t.slots[k].name}`).toBe(false);
      const names = teams.slice(1).map((t) => t.name);
      expect(new Set(names).size).toBe(29);
    }
  });

  it('finishing a run records exactly one draft', () => {
    draftAll();
    const before = useProfile.getState().draftsPlayed;
    useGame.getState().beginPlayoffs();
    useGame.getState().simPlayoffs();
    useGame.getState().finish();
    useGame.getState().finish();
    expect(useProfile.getState().draftsPlayed).toBe(before + 1);
  });
});
