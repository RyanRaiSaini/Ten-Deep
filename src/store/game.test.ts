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

function draftAll() {
  const g = useGame.getState();
  g.newRun('current-2026');
  const pool = POOLS['current-2026'];
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
