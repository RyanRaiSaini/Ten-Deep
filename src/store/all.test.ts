import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const cleared = vi.fn();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {}, clear: async () => cleared() },
}));

const { STORES, wipeAll } = await import('./all');

describe('all stores', () => {
  it('lists every persisted store in src/store', () => {
    const dir = new URL('.', import.meta.url).pathname;
    const persisted = readdirSync(dir).filter((f) => !f.includes('.test.') && f !== 'all.ts' && readFileSync(dir + f, 'utf8').includes('persist('));
    expect(STORES).toHaveLength(persisted.length);
  });

  it('wipeAll resets every store and clears storage', async () => {
    const { useCollection } = await import('./collection');
    const { useCareer } = await import('./career');
    const { useSettings } = await import('./settings');
    useCollection.getState().checkIn('2026-11-22');
    useCollection.setState({ streak: 9, pending: [] });
    useSettings.setState({ onboarded: true });
    await wipeAll();
    // A fresh account: day-one streak and the day-one Daily pick, nothing carried over.
    expect(useCollection.getState().streak).toBe(1);
    expect(useCollection.getState().pending.map((p) => p.type)).toEqual(['daily']);
    expect(useCareer.getState()).toMatchObject(useCareer.getInitialState());
    expect(useSettings.getState().onboarded).toBe(false);
    expect(cleared).toHaveBeenCalled();
  });

  it('after a wipe the new account starts today: starter squad and missions are ready', async () => {
    const { useCollection } = await import('./collection');
    const { useProgress } = await import('./progress');
    await wipeAll();
    expect(Object.keys(useCollection.getState().owned)).toHaveLength(10);
    expect(useProgress.getState().day).not.toBeNull();
  });
});

