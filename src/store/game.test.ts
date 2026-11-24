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
const { isComplete, options, fallbackPick, affordableSlots, startDraft } = await import('../engine/draft');
const { POOLS } = await import('../data');

function draftAll(poolId = 'current-2026') {
  const g = useGame.getState();
  g.newRun(poolId);
  const pool = POOLS[poolId];
  // Fixed seed: newRun's random seed would make any failure unreproducible.
  useGame.setState({ draft: startDraft(pool, `test-${poolId}`) });
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
    const cheap = { ...s.teams[0].slots.B5, id: 'cheap-signing', name: 'Cheap Signing', ovr: 64, salary: 0.5 };
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

  it('daily draft: same spins for everyone, result recorded once for the day', async () => {
    const { useDaily } = await import('./daily');
    const { dailySeed } = await import('../engine/daily');
    const { spin } = await import('../engine/draft');
    useGame.getState().newDaily('2026-11-22');
    useGame.getState().doSpin();
    // Anyone else's draft for the same day starts from the same seed, so it lands on the same team.
    const pool = POOLS['current-2026'];
    expect(useGame.getState().draft!.spin!.id).toBe(spin(startDraft(pool, dailySeed('2026-11-22')), pool).spin!.id);

    useGame.getState().quit();
    draftAll();
    useGame.setState({ daily: '2026-11-22' });
    useGame.getState().beginPlayoffs();
    useGame.getState().simPlayoffs();
    useGame.getState().finish();
    const rec = useDaily.getState().days['2026-11-22'].draft!;
    expect(rec.wins + rec.losses).toBe(82);
  });

  it('daily draft is one shot: resumable while running, locked once abandoned', async () => {
    const { useDaily } = await import('./daily');
    const key = '2026-12-05';
    expect(useGame.getState().newDaily(key)).toBe('started');
    useGame.getState().doSpin();
    const spun = useGame.getState().draft!.spin!.id;
    expect(useGame.getState().newDaily(key)).toBe('resumed');
    expect(useGame.getState().draft!.spin!.id).toBe(spun);
    useGame.getState().quit();
    expect(useGame.getState().newDaily(key)).toBe('locked');
    expect(useGame.getState().phase).toBe('idle');
    expect(useDaily.getState().days[key].draftStarted).toBe(true);
  });

  it('daily quiz progress is saved per answer, so backing out cannot reset it', async () => {
    const { useDaily } = await import('./daily');
    const key = '2026-12-06';
    useDaily.getState().saveProgress(key, 'trivia', { i: 0, score: 0, picked: 'Someone' });
    expect(useDaily.getState().days[key].progress!.trivia).toEqual({ i: 0, score: 0, picked: 'Someone' });
    useDaily.getState().saveProgress(key, 'trivia', { i: 1, score: 1, picked: null });
    expect(useDaily.getState().days[key].progress!.trivia!.i).toBe(1);
  });

  it('management crisis: preseason card, cards at Dec/Feb/Apr, then a board verdict', async () => {
    const { advance } = await import('../engine/season');
    const { CARD_ROUNDS } = await import('../engine/crisis/deck');
    useGame.getState().newCrisis('current-2026');
    const pool = POOLS['current-2026'];
    useGame.setState({ draft: startDraft(pool, 'test-crisis') });
    // draft out the roster (same bot as draftAll, without starting a normal season)
    while (!isComplete(useGame.getState().draft!)) {
      useGame.getState().doSpin();
      const d = useGame.getState().draft!;
      const o = options(d, pool).find((x) => x.affordable);
      if (o) useGame.getState().doPick(o.player.id, o.slots[0]);
      else useGame.getState().doFallback();
    }
    useGame.getState().startSeason();
    expect(useGame.getState().phase).toBe('crisis');
    expect(useGame.getState().crisis!.objective).toBeTruthy();
    expect(useGame.getState().crisis!.pending!.slot).toBe(0);

    for (let slot = 0; slot < 4; slot++) {
      const g = useGame.getState();
      expect(g.phase).toBe('crisis');
      const c = g.crisis!.pending!;
      g.resolveCrisis({ incomingId: c.offer?.[0]?.id, outSlot: c.outSlots?.[0], option: 'a' });
      expect(useGame.getState().phase).toBe('season');
      // play to the next pause (deadline is skipped)
      let s = { ...useGame.getState().season!, deadlineUsed: true };
      s = advance(s, 82);
      if (slot < 3) {
        expect(s.round).toBe(CARD_ROUNDS[slot + 1]);
        useGame.getState().openCrisis(s);
      } else useGame.getState().setSeason(advance(s, 82));
    }
    expect(useGame.getState().crisis!.drawn).toHaveLength(4);
    useGame.getState().beginPlayoffs();
    useGame.getState().simPlayoffs();
    useGame.getState().finish();
    expect(['legend', 'extended', 'survived', 'fired']).toContain(useGame.getState().crisis!.verdict);
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

describe('career parking', () => {
  it('starting another run sets a live career season aside, and Continue career brings it back', () => {
    useGame.getState().newRun('current-2026');
    useGame.setState({ career: true, phase: 'season' });
    const season = useGame.getState().draft;
    useGame.getState().newRun('current-2026');
    expect(useGame.getState().career).toBe(false);
    expect(useGame.getState().parked?.phase).toBe('season');
    expect(useGame.getState().resumeCareer()).toBe(true);
    expect(useGame.getState()).toMatchObject({ career: true, phase: 'season', parked: null, draft: season });
  });

  it('shop rerolls are off in challenges', async () => {
    const { useShop } = await import('./shop');
    useShop.setState({ rerolls: 5 });
    useGame.getState().newChallenge('current-2026', 'seed-x', { name: 'A', w: 50, l: 32 });
    useGame.getState().doSpin();
    expect(useGame.getState().doReroll()).toBe(false);
    useGame.getState().newRun('current-2026');
    useGame.getState().doSpin();
    expect(useGame.getState().doReroll()).toBe(true);
    expect(useShop.getState().rerolls).toBe(4);
  });
});
