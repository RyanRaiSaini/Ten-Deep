import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined },
}));

const { applyForm, formOf } = await import('./form');
const { current2026 } = await import('../data/current2026');
const { normName } = await import('../engine/form');

describe('applyForm', () => {
  it('nudges a player, never stacks, and clears back to base', () => {
    const p = current2026.teams[0].players[0];
    const base = p.ovr;
    const key = normName(p.name);
    applyForm({ [key]: { d: 3, gp: 10, gmsc: 20 } });
    applyForm({ [key]: { d: 3, gp: 10, gmsc: 20 } });
    expect(p.ovr).toBe(Math.min(99, base + 3));
    expect(formOf(p)).toBe(3);
    applyForm({});
    expect(p.ovr).toBe(base);
    expect(formOf(p)).toBe(0);
  });
});

describe('owner-set ratings', () => {
  const all = current2026.teams.flatMap((t) => t.players);
  const naw = all.find((p) => p.name === 'Nickeil Alexander-Walker')!;
  const other = all.find((p) => p.name === 'Trae Young')!;

  it('form saved by the old model is dropped for them, so it never stacks on the owner\'s number', async () => {
    const { useForm } = await import('./form');
    const { ANCHORED_MODEL } = await import('../engine/form');
    expect(naw.ovr).toBe(86);
    const otherBase = other.ovr;
    useForm.getState().set('2026-11-24', null, { [normName(naw.name)]: { d: 7, gp: 18, gmsc: 15 }, [normName(other.name)]: { d: 2, gp: 18, gmsc: 15 } }, 3);
    applyForm(useForm.getState().deltas);
    expect(naw.ovr).toBe(86);
    expect(other.ovr).toBe(otherBase + 2);
    // Earlier owner calls too: Ty Jerome is 87, not 87 + 10.
    const ty = all.find((p) => p.name === 'Ty Jerome')!;
    useForm.getState().set('2026-11-24', null, { [normName(ty.name)]: { d: 10, gp: 18, gmsc: 20 } }, 4);
    applyForm(useForm.getState().deltas);
    expect(ty.ovr).toBe(87);
    // New-model form for them is relative to the owner's number, so it applies.
    useForm.getState().set('2026-11-25', null, { [normName(naw.name)]: { d: 2, gp: 4, gmsc: 18 } }, ANCHORED_MODEL);
    applyForm(useForm.getState().deltas);
    expect(naw.ovr).toBe(88);
    applyForm({});
  });

  it('their form counts only games after the update, measured against the owner\'s rating', async () => {
    const { computeForm } = await import('../engine/form');
    const players = all.map((p) => ({ name: p.name, ovr: p.ovr, age: p.age }));
    // Whole-season production: everyone plays exactly to their rating except NAW, who has been great.
    const fit = (o: number) => (o - 60) / 1.5;
    const season = new Map(all.map((p) => [normName(p.name), { gp: 18, min: 18 * 30, gmsc: p.name === naw.name ? fit(95) : fit(p.ovr) }]));
    // No games since the update: he sits exactly at the owner's 86.
    const none = computeForm(players, season, new Map(), { season: new Map(), recent: new Map() });
    expect(none[normName(naw.name)]).toBeUndefined();
    // 15 strong games since the update: he climbs from 86.
    const hot = computeForm(players, season, new Map(), { season: new Map([[normName(naw.name), { gp: 15, min: 15 * 30, gmsc: fit(95) }]]), recent: new Map() });
    expect(hot[normName(naw.name)].d).toBeGreaterThan(2);
    // 15 poor games: he drops.
    const cold = computeForm(players, season, new Map(), { season: new Map([[normName(naw.name), { gp: 15, min: 15 * 30, gmsc: fit(78) }]]), recent: new Map() });
    expect(cold[normName(naw.name)].d).toBeLessThan(-2);
    // Players he doesn't affect keep their whole-season form.
    expect(none[normName(other.name)]?.d ?? 0).toBe(hot[normName(other.name)]?.d ?? 0);
  });
});
