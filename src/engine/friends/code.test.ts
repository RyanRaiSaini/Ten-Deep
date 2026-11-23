import { describe, expect, it } from 'vitest';
import { ALL_CARDS } from '../../data/cards';
import { HISTORY, MODE_BY_ID } from '../../data/modes';
import { decodeFriend, encodeFriend, extractCode, formatPin, idHash, newPin, parsePin, type FriendSnapshot } from './code';

const pool = MODE_BY_ID['current-2026'].pool;
const rookie = pool.teams.flatMap((t) => t.players).find((p) => !HISTORY.some((t) => t.players.some((q) => q.id === p.id)));

const snap: FriendSnapshot = {
  pin: 'K7Q2XM', name: 'Zoë 🏀 Ryan', avatar: 'captain',
  stats: { drafts: 42, titles: 3, streak: 9, cards: 180, tier: 4 },
  lineup: { PG: { id: ALL_CARDS[0].id, lv: 2 }, C: { id: ALL_CARDS[50].id, lv: 0 } },
  showcase: ALL_CARDS.slice(100, 160).map((c) => c.id),
  team: {
    mode: 'current-2026', w: 61, l: 21, result: 'champion',
    players: { PG: HISTORY[0].players[0], SG: HISTORY[3].players[1], ...(rookie ? { B5: rookie } : {}) },
  },
};

describe('friend codes', () => {
  it('ids hash without collisions across every card and player', () => {
    const ids = new Set([...ALL_CARDS.map((c) => c.id), ...HISTORY.flatMap((t) => t.players.map((p) => p.id))]);
    expect(new Set([...ids].map(idHash)).size).toBe(ids.size);
  });

  it('round-trips a snapshot, including unicode names and players outside history', () => {
    const code = encodeFriend(snap);
    expect(code.startsWith('TD1')).toBe(true);
    expect(code.length).toBeLessThan(1200);
    const back = decodeFriend(`Add me on Ten Deep: https://ten-deep.vercel.app/f?c=${code}`)!;
    expect(back.name).toBe(snap.name);
    expect(back.stats).toEqual(snap.stats);
    expect(back.lineup).toEqual(snap.lineup);
    expect(back.showcase).toEqual(snap.showcase);
    expect(back.team!.w).toBe(61);
    expect(back.team!.players.PG).toEqual(snap.team!.players.PG);
    if (rookie) expect(back.team!.players.B5!.ovr).toBe(rookie.ovr);
  });

  it('rejects junk', () => {
    expect(decodeFriend('hello')).toBeNull();
    expect(decodeFriend('TD1abcdefghijk')).toBeNull();
    expect(extractCode('nothing here')).toBeNull();
  });

  it('PINs are readable and parse back', () => {
    const pin = newPin();
    expect(pin).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
    expect(parsePin(formatPin(pin).toLowerCase())).toBe(pin);
    expect(parsePin('O0O-0I1')).toBeNull();
  });
});
