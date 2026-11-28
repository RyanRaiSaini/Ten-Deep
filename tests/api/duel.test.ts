import { beforeEach, describe, expect, it } from 'vitest';
import { memoryJsonStore, useJsonStore } from '../../api/_jsonstore';
import { memoryCounter, useCounter } from '../../api/_ratelimit';
import * as pin from '../../api/pin';
import * as duel from '../../api/duel';
import { encodeFriend } from '../../src/engine/friends/code';
import { sideCode, type Challenge } from '../../src/engine/friends/challenge';
import { autoFill, starterSquad } from '../../src/engine/collect/lineup';
import { current2026 } from '../../src/data/current2026';
import { ALL_SLOTS } from '../../src/engine/types';

const A = { pin: 'K7Q2XM', name: 'Ryan', avatar: 'captain', key: 'ryan-device-secret-0001' };
const B = { pin: 'B4N8TW', name: 'Jordan', avatar: 'rookie', key: 'jordan-device-secret-01' };
const card = (p: typeof A) => encodeFriend({ pin: p.pin, name: p.name, avatar: p.avatar, stats: { drafts: 1, titles: 0, streak: 0, cards: 10, tier: 1 }, lineup: {}, showcase: [], team: null });
const lineup = (seed: string) => Object.fromEntries(Object.entries(autoFill(starterSquad(seed))).map(([k, id]) => [k, { id: id!, lv: 0 }]));
const team = (from: number) => Object.fromEntries(ALL_SLOTS.map((k, i) => [k, current2026.teams[from + i].players.find((p) => k.startsWith('B') || p.pos === k) ?? current2026.teams[from + i].players[0]]));

const call = async (mod: { POST: (r: Request) => Promise<Response> }, url: string, body: unknown) => {
  const r = await mod.POST(new Request(`https://x.test${url}`, { method: 'POST', body: JSON.stringify(body) }));
  return { status: r.status, body: await r.json() };
};
const publish = (p: typeof A) => call(pin, '/api/pin', { pin: p.pin, code: card(p), key: p.key });
const op = (p: typeof A, body: Record<string, unknown>) => call(duel, '/api/duel', { pin: p.pin, key: p.key, ...body });

beforeEach(async () => {
  useJsonStore(memoryJsonStore());
  useCounter(memoryCounter());
  await publish(A);
  await publish(B);
});

describe('api/duel', () => {
  it('only the owner of a PIN can act for it', async () => {
    expect((await op({ ...A, key: 'not-the-right-secret' }, { op: 'sync' })).status).toBe(403);
    expect((await op({ ...A, pin: 'ZZZZZZ' }, { op: 'sync' })).status).toBe(403);
    expect((await op(A, { op: 'nope' })).status).toBe(400);
  });

  it('send → it lands in the friend\'s mailbox → they accept → both see the same settled result', async () => {
    const sent = await op(A, { op: 'send', to: B.pin, mode: 'clash', bestOf: 5, seed: 'duel-api-1', side: sideCode(A, { lineup: lineup('a') }), card: card(A) });
    expect(sent.status).toBe(200);
    const c: Challenge = sent.body.challenge;
    expect(c).toMatchObject({ from: A.pin, to: B.pin, mode: 'clash', bestOf: 5, status: 'open', a: { name: 'Ryan' } });

    const inbox = await op(B, { op: 'sync' });
    expect(inbox.body.challenges.map((x: Challenge) => x.id)).toEqual([c.id]);
    // The challenger's friend code comes along, so Jordan gets Ryan as a friend even without adding him.
    expect(inbox.body.mail[0]).toMatchObject({ t: 'duel', from: A.pin });

    // Only the friend challenged can answer it.
    expect((await op(A, { op: 'accept', id: c.id, side: sideCode(A, { lineup: lineup('a') }) })).status).toBe(404);
    const acc = await op(B, { op: 'accept', id: c.id, side: sideCode(B, { lineup: lineup('b') }), card: card(B) });
    expect(acc.status).toBe(200);
    const done: Challenge = acc.body.challenge;
    expect(done.status).toBe('done');
    expect(Math.max(done.result!.winsA, done.result!.winsB)).toBe(3);
    expect(done.b!.name).toBe('Jordan');

    // The challenger sees exactly the same result when they check in.
    const back = await op(A, { op: 'sync', ids: [c.id] });
    expect(back.body.challenges[0]).toEqual(done);
    // Once you have it settled, checking in doesn't read it back again.
    expect((await op(B, { op: 'sync', final: [c.id] })).body.challenges).toEqual([]);
    // A second accept changes nothing.
    const again = await op(B, { op: 'accept', id: c.id, side: sideCode(B, { lineup: lineup('z') }) });
    expect(again.body.challenge.result).toEqual(done.result);
  });

  it('a draft duel needs a full team of ten from each side', async () => {
    const bad = await op(A, { op: 'send', to: B.pin, mode: 'draft', seed: 'duel-api-2', side: sideCode(A, { lineup: lineup('a') }) });
    expect(bad.status).toBe(400);
    const ok = await op(A, { op: 'send', to: B.pin, mode: 'draft', seed: 'duel-api-2', side: sideCode(A, { players: team(0) }) });
    expect(ok.body.challenge.bestOf).toBe(7);
    const acc = await op(B, { op: 'accept', id: ok.body.challenge.id, side: sideCode(B, { players: team(10) }) });
    expect(acc.body.challenge.status).toBe('done');
  });

  it('decline, unknown friends, bad input', async () => {
    const sent = await op(A, { op: 'send', to: B.pin, mode: 'clash', bestOf: 3, seed: 'duel-api-3', side: sideCode(A, { lineup: lineup('a') }) });
    const dec = await op(B, { op: 'decline', id: sent.body.challenge.id });
    expect(dec.body.challenge.status).toBe('declined');
    expect((await op(A, { op: 'send', to: 'QQQQQQ', mode: 'clash', seed: 'duel-api-4', side: sideCode(A, { lineup: lineup('a') }) })).status).toBe(404);
    expect((await op(A, { op: 'send', to: A.pin, mode: 'clash', seed: 'duel-api-4', side: sideCode(A, { lineup: lineup('a') }) })).status).toBe(400);
    expect((await op(A, { op: 'send', to: B.pin, mode: 'boxing', seed: 'duel-api-4', side: 'x' })).status).toBe(400);
    expect((await op(A, { op: 'send', to: B.pin, mode: 'clash', seed: 'BAD SEED!', side: sideCode(A, { lineup: lineup('a') }) })).status).toBe(400);
    // A team that claims to be someone else's is refused.
    expect((await op(A, { op: 'send', to: B.pin, mode: 'clash', seed: 'duel-api-5', side: sideCode(B, { lineup: lineup('a') }) })).status).toBe(400);
  });

  it('hello: adding someone tells them, so the friendship goes both ways', async () => {
    expect((await op(B, { op: 'hello', to: A.pin, card: card(B) })).status).toBe(200);
    expect((await op(B, { op: 'hello', to: A.pin, card: card(A) })).status).toBe(400); // must be your own card
    await op(B, { op: 'hello', to: A.pin, card: card(B) });
    const mail = (await op(A, { op: 'sync' })).body.mail;
    expect(mail).toHaveLength(1); // a repeat replaces the older request
    expect(mail[0]).toMatchObject({ t: 'friend', from: B.pin });
  });

  it('writes are rate limited', async () => {
    let last = 0;
    for (let i = 0; i < 25; i++) last = (await op(B, { op: 'hello', to: A.pin, card: card(B) })).status;
    expect(last).toBe(429);
  });
});
