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
  it('show exactly the owner\'s number: live form is not added on top (others still move)', async () => {
    const { computeForm, formPool } = await import('../engine/form');
    const all = current2026.teams.flatMap((t) => t.players);
    const naw = all.find((p) => p.name === 'Nickeil Alexander-Walker')!;
    const other = all.find((p) => p.name === 'Jalen Johnson')!;
    const nawBase = naw.ovr;
    const otherBase = other.ovr;
    expect(nawBase).toBe(86);
    // A +7 boost cached before the fix must not stack on the owner's 86.
    applyForm({ [normName(naw.name)]: { d: 7, gp: 18, gmsc: 15 }, [normName(other.name)]: { d: 2, gp: 18, gmsc: 15 } });
    expect(naw.ovr).toBe(86);
    expect(formOf(naw)).toBe(0);
    expect(other.ovr).toBe(otherBase + 2);
    applyForm({});
    // Party pools agree.
    const party = formPool(current2026, { [normName(naw.name)]: 7, [normName(other.name)]: 2 });
    expect(party.teams.flatMap((t) => t.players).find((p) => p.name === naw.name)!.ovr).toBe(86);
    // And the server never computes a nudge for them.
    const season = new Map(all.map((p) => [normName(p.name), { gp: 18, min: 18 * 30, gmsc: p.name === naw.name ? 25 : 10 }]));
    const out = computeForm(all.map((p) => ({ name: p.name, ovr: p.ovr, age: p.age })), season, new Map());
    expect(out[normName(naw.name)]).toBeUndefined();
  });
});
