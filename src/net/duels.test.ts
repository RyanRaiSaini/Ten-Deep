import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => {
  const mem = new Map<string, string>();
  return { default: { getItem: async (k: string) => mem.get(k) ?? null, setItem: async (k: string, v: string) => void mem.set(k, v), removeItem: async (k: string) => void mem.delete(k), clear: async () => mem.clear(), getAllKeys: async () => [...mem.keys()] } };
});

// The real API handlers on in-memory storage stand in for the server: this device is "A", the friend "B" talks to
// the API directly.
// (Renamed on import: they're plain setters, not React hooks.)
const { memoryJsonStore, useJsonStore: setJsonStore } = await import('../../api/_jsonstore');
const { memoryCounter, useCounter: setCounter } = await import('../../api/_ratelimit');
const pinApi = await import('../../api/pin');
const duelApi = await import('../../api/duel');
setJsonStore(memoryJsonStore());
setCounter(memoryCounter());
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  const req = new Request(url, init);
  const api = url.pathname === '/api/pin' ? pinApi : duelApi;
  return req.method === 'POST' ? api.POST(req) : (api as typeof pinApi).GET(req);
}) as typeof fetch;

const { useFriends } = await import('../store/friends');
const { useCollection } = await import('../store/collection');
const { useChallenges } = await import('../store/challenges');
const { useProfile } = await import('../store/profile');
const { publishMe } = await import('./pins');
const { answerChallenge, mySide, syncDuels } = await import('./duels');
const { encodeFriend } = await import('../engine/friends/code');
const { sideCode } = await import('../engine/friends/challenge');
const { autoFill, starterSquad } = await import('../engine/collect/lineup');

const B = { pin: 'B4N8TW', name: 'Jordan', avatar: 'rookie', key: 'jordan-device-secret-01' };
const cardB = encodeFriend({ pin: B.pin, name: B.name, avatar: B.avatar, stats: { drafts: 3, titles: 1, streak: 2, cards: 12, tier: 2 }, lineup: {}, showcase: [], team: null });
const lineupB = Object.fromEntries(Object.entries(autoFill(starterSquad('jordan'))).map(([k, id]) => [k, { id: id!, lv: 0 }]));
const asB = (body: Record<string, unknown>) => duelApi.POST(new Request('https://x.test/api/duel', { method: 'POST', body: JSON.stringify({ pin: B.pin, key: B.key, ...body }) })).then((r) => r.json());

beforeAll(async () => {
  useProfile.setState({ name: 'Ryan' });
  const welcome = starterSquad('ryan');
  useCollection.setState({ lineup: autoFill(welcome), owned: Object.fromEntries(welcome.map((id) => [id, { count: 1, firstDay: '2026-11-28' }])) });
  await publishMe(true);
  await pinApi.POST(new Request('https://x.test/api/pin', { method: 'POST', body: JSON.stringify({ pin: B.pin, code: cardB, key: B.key }) }));
});

describe('friend challenges on this device', () => {
  it('a friend who adds you shows up in your friends after checking in', async () => {
    await asB({ op: 'hello', to: useFriends.getState().pin, card: cardB });
    expect(await syncDuels()).toBe(true);
    expect(useFriends.getState().friends.map((f) => f.pin)).toContain(B.pin);
  });

  it('an incoming challenge arrives, you accept, and the result counts once in the head-to-head', async () => {
    const me = useFriends.getState().pin;
    const sent = await asB({ op: 'send', to: me, mode: 'clash', bestOf: 3, seed: 'duel-device-1', side: sideCode(B, { lineup: lineupB }), card: cardB });
    await syncDuels();
    const c = useChallenges.getState().byId[sent.challenge.id];
    expect(c).toMatchObject({ status: 'open', to: me, from: B.pin });

    const side = mySide('clash');
    expect('code' in side).toBe(true);
    const r = await answerChallenge(c.id, true, (side as { code: string }).code);
    expect(r.ok).toBe(true);
    const done = useChallenges.getState().byId[c.id];
    expect(done.status).toBe('done');
    const rec = () => useFriends.getState().friends.find((f) => f.pin === B.pin)!.record;
    expect(rec().w + rec().l).toBe(1);
    expect(useFriends.getState().friends.find((f) => f.pin === B.pin)!.log[0]).toMatchObject({ mode: 'clash' });

    // Checking in again (or the challenger's copy coming back) never counts it twice.
    await syncDuels();
    await syncDuels();
    expect(rec().w + rec().l).toBe(1);
  });

  it('what you can bring: a lineup for Card Clash, a finished draft for the Finals', () => {
    expect('code' in mySide('clash')).toBe(true);
    useFriends.setState({ lastTeam: null });
    expect(mySide('finals')).toEqual({ missing: 'team' });
    expect(mySide('draft')).toEqual({ missing: 'draft' });
  });
});
