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
  fillDraft(poolId);
}

/** Pick the first affordable option each round (or the fallback), then start the season. */
function fillDraft(poolId = 'current-2026') {
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

  it('weekly challenge: one attempt, the same division for everyone, the result recorded and sent', async () => {
    const { useWeekly } = await import('./weekly');
    const { defaultDivision } = await import('../engine/conference');
    const { advance } = await import('../engine/season');
    const sent: unknown[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init?: RequestInit) => {
      if (init?.method === 'POST') sent.push(JSON.parse(String(init.body)));
      return new Response(JSON.stringify({ ok: true, rank: 3, total: 10 }), { headers: { 'content-type': 'application/json' } });
    }));
    const week = '2026-11-23';
    useGame.getState().setDivision(5);
    expect(useGame.getState().newWeekly(week)).toBe('started');
    expect(useGame.getState().draft!.seed).toBe(`weekly-${week}`);
    fillDraft();
    expect(useGame.getState().newWeekly(week)).toBe('resumed');
    const s = useGame.getState().season!;
    expect(s.divs![0]).toBe(defaultDivision(`weekly-${week}`));
    expect(useGame.getState().division).toBe(5); // your own pick is untouched
    useGame.setState({ season: advance(advance({ ...s, deadlineUsed: true, stops: [] }, 82), 82), phase: 'season' });
    useGame.getState().beginPlayoffs();
    useGame.getState().simPlayoffs();
    useGame.getState().finish();
    await vi.waitFor(() => expect(useWeekly.getState().weeks[week]?.submitted).toBe(true));
    const run = useWeekly.getState().weeks[week];
    expect(run.result!.w + run.result!.l).toBe(82);
    expect(run.rank).toBe(3);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ week, w: run.result!.w, l: run.result!.l });
    useGame.getState().quit();
    expect(useGame.getState().newWeekly(week)).toBe('locked');
    vi.unstubAllGlobals();
  });

  it('your division: the seed picks one until you choose, then your pick is used and kept; AI teams are the real franchises', async () => {
    const { DIVISIONS, confOfDiv } = await import('../engine/conference');
    useGame.setState({ division: null });
    draftAll();
    const first = useGame.getState().division!;
    expect(first).toBeGreaterThanOrEqual(0);
    expect(useGame.getState().season!.divs![0]).toBe(first);
    useGame.getState().quit();
    useGame.getState().setDivision(4);
    draftAll('all-time');
    const s = useGame.getState().season!;
    expect(useGame.getState().division).toBe(4);
    expect(s.divs![0]).toBe(4);
    expect(DIVISIONS.slice(0, 6).map((_, d) => s.divs!.filter((x) => x === d).length)).toEqual([5, 5, 5, 5, 5, 5]);
    expect(new Set(s.teams.slice(1).map((t) => t.name)).size).toBe(29);
    // Every AI team sits in its franchise's division and conference.
    s.teams.slice(1).forEach((t, i) => expect(DIVISIONS[s.divs![i + 1]].franchises).toContain(t.franchise));
    expect(confOfDiv(s.divs![0])).toBe(1);
  });

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
    const { spin, legacyDraft } = await import('../engine/draft');
    useGame.getState().newDaily('2026-11-22');
    useGame.getState().doSpin();
    // Anyone else's draft for the same day starts from the same seed, so it lands on the same team.
    const pool = POOLS['current-2026'];
    // (A Daily before fair spins started replays the original sequence.)
    expect(useGame.getState().draft!.spin!.id).toBe(spin(legacyDraft(startDraft(pool, dailySeed('2026-11-22'))), pool).spin!.id);

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

  it('management crisis: six face-down cards at each of 7 stops, Board Confidence, then a verdict', async () => {
    const { advance } = await import('../engine/season');
    const { STOPS } = await import('../engine/board/state');
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
    const b0 = useGame.getState().crisis!.board!;
    expect(b0.confidence).toBe(10);
    expect(b0.hand).toHaveLength(6);

    for (let i = 0; i < STOPS.length; i++) {
      const g = useGame.getState();
      if (g.phase === 'result') break; // fired
      expect(g.phase).toBe('crisis');
      g.revealBoardCard(i % 6);
      const o = useGame.getState().crisis!.board!.offer!;
      const fired = useGame.getState().resolveBoard({ incomingId: o.players?.[0]?.id, outSlot: o.outSlots?.[0], option: o.options?.[0] });
      if (fired) break;
      expect(useGame.getState().phase).toBe('season');
      expect(useGame.getState().crisis!.board!.stop).toBe(i + 1);
      let s = { ...useGame.getState().season!, deadlineUsed: true };
      s = advance(s, 82);
      if (i < STOPS.length - 1) {
        expect(s.round).toBe(STOPS[i + 1]);
        useGame.getState().openCrisis(s);
      } else useGame.getState().setSeason(advance(s, 82));
    }
    if (useGame.getState().phase !== 'result') {
      expect(useGame.getState().crisis!.board!.played).toHaveLength(7);
      useGame.getState().beginPlayoffs();
      expect(useGame.getState().crisis!.board!.demands.every((d) => d.status !== 'active')).toBe(true);
      useGame.getState().simPlayoffs();
      useGame.getState().finish();
    }
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

describe('fair challenges', () => {
  beforeEach(() => useGame.getState().quit());
  it('new runs and v=2 challenge links use fair spins; older links replay the original sequence', () => {
    useGame.getState().newRun('current-2026', 'fair-seed');
    expect(useGame.getState().draft!.scheme).toBe(2);
    useGame.getState().quit();
    useGame.getState().newChallenge('current-2026', 'fair-seed', { name: 'Sam', w: 50, l: 32, fair: true });
    expect(useGame.getState().draft!.scheme).toBe(2);
    useGame.getState().quit();
    useGame.getState().newChallenge('current-2026', 'old-seed', { name: 'Sam', w: 50, l: 32 });
    expect(useGame.getState().draft!.scheme).toBeUndefined();
  });
  it('the Daily switches to fair spins from its start date, so a day never mixes the two', async () => {
    const { FAIR_DAILY_FROM } = await import('./game');
    const before = new Date(Date.parse(`${FAIR_DAILY_FROM}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
    useGame.getState().newDaily(before);
    expect(useGame.getState().draft!.scheme).toBeUndefined();
    useGame.getState().quit();
    useGame.getState().newDaily(FAIR_DAILY_FROM);
    expect(useGame.getState().draft!.scheme).toBe(2);
  });

  it('runs it back: the same spins again, for the record only (no packs, no league points)', async () => {
    const { advance } = await import('../engine/season');
    const { useCollection } = await import('./collection');
    const { useLeague } = await import('./league');
    const finishRun = () => {
      const s = useGame.getState().season!;
      useGame.setState({ season: advance(advance({ ...s, deadlineUsed: true, stops: [] }, 82), 82), phase: 'season' });
      useGame.getState().beginPlayoffs();
      useGame.getState().simPlayoffs();
      useGame.getState().finish();
    };
    useGame.getState().quit();
    expect(useGame.getState().runItBack()).toBe(false); // nothing to run back
    draftAll();
    const seed = useGame.getState().draft!.seed;
    finishRun();
    const first = useGame.getState().playoffs!.season.records[0];
    const pending = useCollection.getState().pending.length;
    const points = useLeague.getState().points;

    expect(useGame.getState().runItBack()).toBe(true);
    const g = useGame.getState();
    expect(g.phase).toBe('draft');
    expect(g.draft!.seed).toBe(seed);
    expect(g.poolId).toBe('current-2026');
    expect(g.replay).toMatchObject({ w: first.w, l: first.l, tries: 2 });
    // Fair spins: round one lands the same team as before.
    useGame.getState().doSpin();
    const { spin } = await import('../engine/draft');
    expect(useGame.getState().draft!.spin!.id).toBe(spin(startDraft(POOLS['current-2026'], seed), POOLS['current-2026']).spin!.id);

    useGame.setState({ draft: { ...useGame.getState().draft!, spin: null } });
    fillDraft();
    finishRun();
    expect(useGame.getState().phase).toBe('result');
    expect(useGame.getState().leagueGain).toBe(0);
    expect(useCollection.getState().pending.length).toBe(pending);
    expect(useLeague.getState().points).toBe(points);
    // A third try still compares against the best so far.
    expect(useGame.getState().runItBack()).toBe(true);
    expect(useGame.getState().replay!.tries).toBe(3);
    // Starting anything else clears it.
    useGame.getState().newRun('current-2026');
    expect(useGame.getState().replay).toBeNull();
    useGame.getState().quit();
  });
});
