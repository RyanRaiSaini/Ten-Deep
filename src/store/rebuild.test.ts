import { describe, expect, it, vi } from 'vitest';

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
const { POOLS } = await import('../data');
const { advance, roomAfterFees } = await import('../engine/season');
const { payOf } = await import('../engine/cap');
const { marketOptions } = await import('../engine/board/market');
const { REBUILD_BUDGET, TIPOFF_STEP, COACH_FEE } = await import('../engine/board/rebuild');
const { ALL_SLOTS } = await import('../engine/types');
const { boardCtx } = await import('./boardCtx');

const names = () => useGame.getState().season!.teams.flatMap((t) => ALL_SLOTS.map((k) => t.slots[k].name));

/** Take over a team and go through the whole rebuild: a coach, a sale at PG, keep the rest, every card stop. */
function rebuildAll(poolId: string, teamId: string) {
  const g = useGame.getState();
  g.newRebuild(poolId, teamId);
  let s = useGame.getState();
  expect(s.phase).toBe('rebuild');
  expect(s.season!.round).toBe(0);
  expect(roomAfterFees(s.season!)).toBeCloseTo(REBUILD_BUDGET, 1);
  expect(s.season!.teams.length % 2).toBe(0);
  expect(new Set(names()).size).toBe(names().length);
  s.rebuildNext();
  // The objective comes first: no coach until it's picked.
  expect(useGame.getState().crisis!.board!.hand).toHaveLength(6);
  useGame.getState().rebuildCoach('defense');
  expect(useGame.getState().crisis!.rebuild!.coach).toBe(null);
  useGame.getState().revealBoardCard(1);
  const first = useGame.getState().crisis!.board!.offer!;
  useGame.getState().resolveBoard({ incomingId: first.players?.[0]?.id, outSlot: first.outSlots?.[0], option: first.options?.[0] });
  const objective = useGame.getState().crisis!.board!.demands.find((d) => d.objective);
  expect(objective, 'the first card is the objective').toBeTruthy();
  expect(objective!.due).toBe(0);
  useGame.getState().rebuildCoach('defense');
  expect(roomAfterFees(useGame.getState().season!)).toBeCloseTo(REBUILD_BUDGET - COACH_FEE.defense, 1);
  let stops = 1;
  for (let guard = 0; guard < 40 && (useGame.getState().crisis!.rebuild!.step < TIPOFF_STEP || useGame.getState().crisis!.board!.hand); guard++) {
    s = useGame.getState();
    const board = s.crisis!.board!;
    if (board.hand) {
      s.revealBoardCard(0);
      const o = useGame.getState().crisis!.board!.offer!;
      useGame.getState().resolveBoard({ incomingId: o.players?.[0]?.id, outSlot: o.outSlots?.[0], option: o.options?.[0] });
      expect(useGame.getState().phase).toBe('rebuild');
      stops++;
      continue;
    }
    const r = s.crisis!.rebuild!;
    if (r.step === 2) {
      // Sell the point guard: his contract goes into the budget, the bench option comes out of it.
      const before = roomAfterFees(s.season!);
      const out = s.season!.teams[0].slots.PG;
      s.rebuildSell();
      const opt = marketOptions(s.season!, board, 'PG', boardCtx(s.poolId, s.season!).pool).find((o) => o.tier === 'bench')!;
      useGame.getState().rebuildSign(opt);
      expect(roomAfterFees(useGame.getState().season!)).toBeCloseTo(before + payOf(out) - opt.pay, 1);
      expect(useGame.getState().season!.teams[0].slots.PG.name).toBe(opt.player.name);
    } else s.rebuildKeep();
  }
  expect(stops).toBe(3);
  expect(new Set(names()).size).toBe(names().length);
  useGame.getState().tipOff();
}

describe('rebuild mode', () => {
  it('takes over a Current Day team: objective first, 10 positions, 2 event cards, then one card in the season', async () => {
    const team = POOLS['current-2026'].teams[5];
    rebuildAll('current-2026', team.id);
    const g = useGame.getState();
    if (g.phase === 'result') return; // the board fired you before tip-off
    expect(g.phase).toBe('season');
    expect(g.crisis!.objective).toBeTruthy();
    expect(g.crisis!.board!.stop).toBe(0);
    expect(g.crisis!.board!.played.filter((p) => p.stop < 0)).toHaveLength(3);
    // The objective was settled at tip-off; only good-or-bad events were dealt after it.
    expect(g.crisis!.board!.demands.find((d) => d.objective)!.status).not.toBe('active');
    const { cardOf } = await import('../engine/board/cards');
    expect(g.crisis!.board!.played.slice(1).every((p) => cardOf(p.id).kind !== 'demand' && cardOf(p.id).kind !== 'finance')).toBe(true);
    expect(g.season!.teams[0].franchise).toBe(team.id.split('-')[0]);
    // Play on: the one card stop in the season is at midseason.
    const s = advance({ ...g.season!, deadlineUsed: true }, 82);
    expect(s.round).toBe(41);
    g.openCrisis(s);
    expect(useGame.getState().phase === 'crisis' || useGame.getState().phase === 'result').toBe(true);
  }, 60_000);

  it('takes over a team from history in its own era league', () => {
    const era = POOLS['era-jordan'];
    const team = era.teams.find((t) => t.id === 'den-1998') ?? era.teams[0];
    rebuildAll('era-jordan', team.id);
    const g = useGame.getState();
    expect(g.poolId).toBe('era-jordan');
    expect(g.season!.teams[0].name).toContain(team.name);
  }, 60_000);
});
