import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined },
}));

const { parseRecovery, recoveryCode, SAVE_KEYS } = await import('./save');

describe('cloud save', () => {
  it('a recovery code round-trips and tolerates spaces and case', () => {
    const code = recoveryCode();
    const p = parseRecovery(` ${code.toLowerCase().replace(/^(\w{6})/, (m) => m.toUpperCase())} `)!;
    expect(`${p.pin}-${p.key}`).toBe(code);
    expect(parseRecovery('hello')).toBeNull();
    expect(parseRecovery('K7Q2XM-short')).toBeNull();
  });

  it('backs up every persisted store', async () => {
    const { readdirSync, readFileSync } = await import('node:fs');
    const names = readdirSync('src/store').filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
      .flatMap((f) => [...readFileSync(`src/store/${f}`, 'utf8').matchAll(/name: '(tendeep-[a-z]+)'/g)].map((m) => m[1]));
    expect([...names].sort()).toEqual([...SAVE_KEYS].sort());
  });
});
