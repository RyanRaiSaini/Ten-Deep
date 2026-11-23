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
