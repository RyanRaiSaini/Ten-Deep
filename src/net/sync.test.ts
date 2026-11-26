import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** An in-memory device: its storage, and a fake server holding one cloud save. */
const mem = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => void mem.set(k, v),
    removeItem: async (k: string) => void mem.delete(k),
  },
}));
vi.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove() {} }) } }));

let server: { at: string; data: string } | null = null;
const calls: string[] = [];
vi.stubGlobal('fetch', async (_url: string, init: { body: string }) => {
  const b = JSON.parse(init.body);
  calls.push(b.op);
  const res = (status: number, body: unknown) => ({ ok: status < 400, headers: { get: () => 'application/json' }, json: async () => body });
  if (b.op === 'save') { server = { at: new Date().toISOString(), data: b.data }; return res(200, { ok: true, at: server.at }); }
  if (!server) return res(404, { error: 'not-found' });
  if (b.op === 'stat') return res(200, { at: server.at });
  if (b.op === 'load') return res(200, { data: server.data, at: server.at });
  return res(400, { error: 'bad-op' });
});

const { useAccount } = await import('../store/account');
const { useCollection } = await import('../store/collection');
const sync = await import('./sync');

describe('sync between devices (signed in)', () => {
  beforeEach(() => { mem.clear(); server = null; calls.length = 0; sync.resetSyncForTests(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); useAccount.getState().set(null); });

  it('saves a few seconds after a change, once for a burst, and only when signed in', async () => {
    sync.markChanged();
    await vi.advanceTimersByTimeAsync(sync.PUSH_DELAY_MS + 100);
    expect(calls).not.toContain('save'); // signed out: nothing

    useAccount.getState().set('google');
    sync.markChanged(); sync.markChanged(); sync.markChanged();
    await vi.advanceTimersByTimeAsync(sync.PUSH_DELAY_MS + 100);
    expect(calls.filter((c) => c === 'save')).toHaveLength(1);
    expect(server).not.toBeNull();
  });

  it('a card picked on the phone shows up on the laptop: newer progress is pulled in', async () => {
    useAccount.getState().set('google');
    // The "phone" saved progress that includes Tony Parker.
    server = { at: new Date(Date.now() + 60_000).toISOString(), data: JSON.stringify({ 'tendeep-collection': JSON.stringify({ state: { owned: { 'tony-parker-2007': { level: 1 } } }, version: 0 }) }) };
    vi.useRealTimers();
    expect(await sync.pullIfNewer()).toBe(true);
    expect(useCollection.getState().owned['tony-parker-2007']).toBeTruthy();
    // Already up to date: no second download.
    await new Promise((ok) => setTimeout(ok, 600));
    calls.length = 0;
    expect(await sync.pullIfNewer()).toBe(false);
    expect(calls).toEqual(['stat']);
  });

  it('never overwrites unsaved changes on this device', async () => {
    useAccount.getState().set('google');
    sync.markChanged(); // unsaved local change
    server = { at: new Date(Date.now() + 60_000).toISOString(), data: '{}' };
    expect(await sync.pullIfNewer()).toBe(false);
    expect(calls).not.toContain('load');
  });
});
