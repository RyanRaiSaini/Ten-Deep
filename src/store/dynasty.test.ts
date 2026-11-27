import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => {
  const mem = new Map<string, string>();
  return { default: { getItem: async (k: string) => mem.get(k) ?? null, setItem: async (k: string, v: string) => void mem.set(k, v), removeItem: async (k: string) => void mem.delete(k), clear: async () => mem.clear() } };
});

const { useGame } = await import('./game');
const { useCareer } = await import('./career');
const { advance } = await import('../engine/season');
const { ALL_SLOTS } = await import('../engine/types');
const { draftDone, picksUntilUser } = await import('../engine/career/fantasy');
const { openSlotCount } = await import('../engine/career/offseason');

/** Play the live season straight through: no board cards in a Dynasty. */
function playSeason() {
  const g = useGame.getState();
  expect(g.phase).toBe('season');
  expect(g.crisis).toBe(null);
  g.setSeason(advance(advance({ ...g.season!, deadlineUsed: true }, 82), 82));
  useGame.getState().beginPlayoffs();
  useGame.getState().simPlayoffs();
  useGame.getState().finish();
  useCareer.getState().recordSeason();
}

const names = () => useGame.getState().season!.teams.flatMap((t) => ALL_SLOTS.map((k) => t.slots[k].name));

describe('dynasty', () => {
  it('real roster: your franchise as it is, a plain season, then an offseason and season 2', () => {
    useCareer.getState().startDynasty('sac', 'real');
    const g = useGame.getState();
    expect(useCareer.getState().mode).toBe('dynasty');
    expect(g.season!.teams).toHaveLength(30);
    expect(g.season!.teams[0].franchise).toBe('sac');
    expect(g.season!.teams[0].name).toBe('Sacramento Kings');
    expect(new Set(names()).size).toBe(names().length);
    playSeason();
    const c = useCareer.getState();
    expect(c.history).toHaveLength(1);
    if (c.ended) return;
    c.beginOffseason();
    useCareer.getState().keep(useCareer.getState().offseason!.expiring);
    useCareer.getState().draftRookie();
    for (let i = 0; i < 12 && openSlotCount(useCareer.getState().offseason!, 0) > 0; i++) useCareer.getState().autoSign();
    useCareer.getState().startNextSeason();
    expect(useCareer.getState().season).toBe(2);
    expect(useGame.getState().phase).toBe('season');
    expect(useGame.getState().crisis).toBe(null);
    expect(useGame.getState().season!.teams[0].franchise).toBe('sac');
  }, 120_000);

  it('fantasy draft: spin a slot, pick, auto-draft the rest, and the drafted league plays season 1', () => {
    useCareer.getState().startDynasty('bos', 'draft');
    expect(useGame.getState().career && useGame.getState().phase === 'season').toBe(false);
    const slot = useCareer.getState().spinSlot();
    expect(slot).toBeGreaterThanOrEqual(0);
    expect(slot).toBeLessThan(30);
    let fd = useCareer.getState().fantasy!;
    expect(picksUntilUser(fd)).toBe(0);
    expect(fd.made).toBe(slot);
    // Make the first pick yourself, then let the draft run.
    const first = useCareer.getState().fantasy!;
    useCareer.getState().fantasyPick('not-a-player');
    expect(useCareer.getState().fantasy!.made).toBe(first.made);
    useCareer.getState().fantasyAuto();
    fd = useCareer.getState().fantasy!;
    expect(draftDone(fd)).toBe(true);
    expect(fd.picks[fd.userSlot]).toHaveLength(10);
    useCareer.getState().finishFantasy();
    const g = useGame.getState();
    expect(useCareer.getState().fantasy).toBe(null);
    expect(g.phase).toBe('season');
    expect(g.season!.teams[0].franchise).toBe('bos');
    expect(new Set(names()).size).toBe(300);
    playSeason();
    expect(useCareer.getState().history).toHaveLength(1);
  }, 120_000);
});
