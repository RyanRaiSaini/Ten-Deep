import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => {
  const mem = new Map<string, string>();
  return { default: { getItem: async (k: string) => mem.get(k) ?? null, setItem: async (k: string, v: string) => void mem.set(k, v), removeItem: async (k: string) => void mem.delete(k), clear: async () => mem.clear() } };
});

const { useGame } = await import('./game');
const { useCareer } = await import('./career');
const { POOLS } = await import('../data');
const { isComplete, options, startDraft } = await import('../engine/draft');
const { advance } = await import('../engine/season');
const { ALL_SLOTS } = await import('../engine/types');
const { openSlotCount } = await import('../engine/career/offseason');
const { evaluateTrade } = await import('../engine/career/trades');
type SlotId = import('../engine/types').SlotId;

/** Play the current career season through: resolve every card with defaults, finish the season and playoffs. */
function playSeason() {
  for (let guard = 0; guard < 10; guard++) {
    const g = useGame.getState();
    if (g.phase === 'crisis') {
      const c = g.crisis!.pending!;
      g.resolveCrisis({ incomingId: c.offer?.[0]?.id, outSlot: c.outSlots?.[0], option: 'a' });
      continue;
    }
    const s = advance({ ...g.season!, deadlineUsed: true }, 82);
    if (s.round < 82) g.openCrisis(s);
    else {
      g.setSeason(s);
      break;
    }
  }
  useGame.getState().beginPlayoffs();
  useGame.getState().simPlayoffs();
  useGame.getState().finish();
}

describe('career store', () => {
  it('season 1 → offseason (re-sign, draft, free agency) → season 2 with an evolved league', () => {
    useCareer.getState().start();
    const pool = POOLS['current-2026'];
    useGame.setState({ draft: startDraft(pool, 'career-store') });
    while (!isComplete(useGame.getState().draft!)) {
      useGame.getState().doSpin();
      const d = useGame.getState().draft!;
      const o = options(d, pool).find((x) => x.affordable);
      if (o) useGame.getState().doPick(o.player.id, o.slots[0]);
      else useGame.getState().doFallback();
    }
    useGame.getState().startSeason();
    expect(ALL_SLOTS.every((k) => useGame.getState().season!.teams[0].slots[k].salary !== undefined)).toBe(true);
    playSeason();

    useCareer.getState().recordSeason();
    const c1 = useCareer.getState();
    expect(c1.history).toHaveLength(1);
    expect(c1.history[0].label).toBe('2026-27');
    // Franchise records and morale move with the season.
    expect(Object.keys(c1.stats).length).toBeGreaterThanOrEqual(8);
    expect(Object.values(c1.stats).every((x) => x.seasons === 1 && x.gp > 0)).toBe(true);
    expect(c1.morale).not.toBe(60);

    if (c1.ended) return; // fired out of a job in year one is possible
    c1.beginOffseason();
    expect(useCareer.getState().step).toBe('expiring');
    const off = useCareer.getState().offseason!;
    useCareer.getState().keep(off.expiring.slice(0, 1));
    expect(useCareer.getState().step).toBe('draft');
    useCareer.getState().draftRookie();
    expect(useCareer.getState().step).toBe('freeAgency');
    // A trade the other GM likes goes through and costs a little morale.
    const st = useCareer.getState().offseason!;
    const deal = (() => {
      for (const [k, mine] of Object.entries(st.teams[0].slots)) for (let ti = 1; ti < st.teams.length; ti++)
        for (const theirs of Object.values(st.teams[ti].slots)) if (mine && theirs && evaluateTrade(st, mine.id, ti, theirs.id).ok) return { k, give: mine.id, ti, want: theirs.id };
      return null;
    })();
    if (deal) {
      const m = useCareer.getState().morale;
      expect(useCareer.getState().trade(deal.give, deal.ti, deal.want)).toBe(true);
      expect(useCareer.getState().offseason!.teams[0].slots[deal.k as SlotId]!.id).toBe(deal.want);
      expect(useCareer.getState().morale).toBe(Math.max(0, m - 4));
    }
    // sign until full (affordable best, else minimum exception)
    for (let i = 0; i < 12 && openSlotCount(useCareer.getState().offseason!, 0) > 0; i++) useCareer.getState().autoSign();
    expect(openSlotCount(useCareer.getState().offseason!, 0)).toBe(0);
    useCareer.getState().startNextSeason();

    const g = useGame.getState();
    expect(useCareer.getState().season).toBe(2);
    expect(g.phase).toBe('crisis');
    expect(g.season!.teams).toHaveLength(30);
    const names = g.season!.teams.flatMap((t) => ALL_SLOTS.map((k) => t.slots[k].name));
    expect(new Set(names).size).toBe(names.length);
    // a year older
    const before = new Map(useCareer.getState().history[0].roster.map((p) => [p.name, p.age]));
    const aged = ALL_SLOTS.map((k) => g.season!.teams[0].slots[k]).find((p) => before.has(p.name));
    if (aged) expect(aged.age).toBe((before.get(aged.name) ?? 0) + 1);
  }, 120_000);

  it('security falls with bad verdicts and the career ends at 0', () => {
    useCareer.setState({ active: true, security: 20, ended: false, history: [] });
    useCareer.getState().applyVerdict('fired');
    expect(useCareer.getState().ended).toBe(true);
  });
});
