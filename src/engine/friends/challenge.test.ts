import { describe, expect, it } from 'vitest';
import { current2026 } from '../../data/current2026';
import { startDraft, isComplete, options, pick, spin, fallbackPick, pickFallback, affordableSlots } from '../draft';
import { ALL_SLOTS, type Player, type SlotId } from '../types';
import { autoFill, starterSquad } from '../collect/lineup';
import {
  CHALLENGE_ID, bestOfFor, newChallengeId, outcomeFor, parseChallenge, scoreFor, settle, sideCode, sideFits, sideRoster, statusOf,
  CHALLENGE_TTL_MS, type Challenge,
} from './challenge';

/** Draft ten from a seed the way a player would: best affordable option each spin (fallback if none). */
function draftTeam(seed: string): Partial<Record<SlotId, Player>> {
  let d = startDraft(current2026, seed);
  while (!isComplete(d)) {
    d = spin(d, current2026);
    const o = options(d, current2026).find((x) => x.affordable);
    if (o) d = pick(d, o.player.id, o.slots[0], current2026);
    else { const p = fallbackPick(d, current2026); d = pickFallback(d, p, affordableSlots(d, p, current2026)[0], current2026); }
  }
  return d.roster;
}

const lineupOf = (seed: string) => Object.fromEntries(Object.entries(autoFill(starterSquad(seed))).map(([k, id]) => [k, { id: id!, lv: 0 }]));
const RYAN = { pin: 'K7Q2XM', name: 'Ryan', avatar: 'captain' };
const JORDAN = { pin: 'B4N8TW', name: 'Jordan', avatar: 'rookie' };

function challenge(mode: Challenge['mode'], a: string, bestOf = 7): Challenge {
  return { v: 1, id: newChallengeId(() => 0.42), from: RYAN.pin, to: JORDAN.pin, mode, bestOf: bestOfFor(mode, bestOf), seed: 'duel-test-1', created: 1000, a: { ...RYAN, code: a }, status: 'open' };
}

describe('friend challenges', () => {
  it('ids, series lengths and validation', () => {
    expect(newChallengeId()).toMatch(CHALLENGE_ID);
    expect(bestOfFor('clash', 5)).toBe(5);
    expect(bestOfFor('clash', 4)).toBe(7);
    expect(bestOfFor('draft', 3)).toBe(7);
    expect(bestOfFor('finals', 5)).toBe(7);
    expect(parseChallenge({ v: 1 })).toBe(null);
    expect(parseChallenge(challenge('clash', sideCode(RYAN, { lineup: lineupOf('a') })))).not.toBe(null);
  });

  it('a side only fits a format when it brings that team', () => {
    const lineup = sideCode(RYAN, { lineup: lineupOf('a') });
    const team = sideCode(RYAN, { players: draftTeam('duel-fit') });
    expect(sideFits('clash', lineup, RYAN.pin)).not.toBe(null);
    expect(sideFits('draft', lineup, RYAN.pin)).toBe(null);
    expect(sideFits('draft', team, RYAN.pin)).not.toBe(null);
    expect(sideFits('finals', team, RYAN.pin)).not.toBe(null);
    // Someone else's code can't be passed off as yours.
    expect(sideFits('draft', team, JORDAN.pin)).toBe(null);
    const half = draftTeam('duel-half');
    delete half.B5;
    expect(sideFits('draft', sideCode(RYAN, { players: half }), RYAN.pin)).toBe(null);
  });

  it('a drafted team travels intact: the same ten players, ratings and positions come out the other side', () => {
    const team = draftTeam('duel-travel');
    const r = sideRoster('draft', { ...RYAN, code: sideCode(RYAN, { players: team }) }, ['#000', '#fff'])!;
    for (const k of ALL_SLOTS) {
      expect(r.slots[k].name).toBe(team[k]!.name);
      expect(r.slots[k].ovr).toBe(team[k]!.ovr);
    }
  });

  it('settling is deterministic: whoever settles it, both sides see the same series', () => {
    const c = challenge('draft', sideCode(RYAN, { players: draftTeam('duel-same') }));
    const b = { ...JORDAN, code: sideCode(JORDAN, { players: draftTeam('duel-same') }) };
    const one = settle(c, b, 2000);
    const two = settle(c, b, 2000);
    expect(one).toEqual(two);
    expect(one.status).toBe('done');
    const r = one.result!;
    expect(Math.max(r.winsA, r.winsB)).toBe(4);
    expect(r.games).toHaveLength(r.winsA + r.winsB);
    expect(r.games.filter(([x, y]) => x > y)).toHaveLength(r.winsA);
    // One side's win is the other's loss, with the score mirrored.
    expect([outcomeFor(one, RYAN.pin), outcomeFor(one, JORDAN.pin)].sort()).toEqual(['l', 'w']);
    expect(scoreFor(one, RYAN.pin).split('-').reverse().join('-')).toBe(scoreFor(one, JORDAN.pin));
    expect(outcomeFor(one, 'ZZZZZZ')).toBe(null);
  });

  it('card clash plays the chosen length', () => {
    const c = challenge('clash', sideCode(RYAN, { lineup: lineupOf('r') }), 3);
    const done = settle(c, { ...JORDAN, code: sideCode(JORDAN, { lineup: lineupOf('j') }) }, 5);
    expect(Math.max(done.result!.winsA, done.result!.winsB)).toBe(2);
  });

  it('an open challenge lapses after two weeks; a settled one never does', () => {
    const c = challenge('clash', sideCode(RYAN, { lineup: lineupOf('a') }));
    expect(statusOf(c, c.created + CHALLENGE_TTL_MS - 1)).toBe('open');
    expect(statusOf(c, c.created + CHALLENGE_TTL_MS + 1)).toBe('expired');
    expect(statusOf({ ...c, status: 'done' }, c.created + CHALLENGE_TTL_MS * 3)).toBe('done');
  });
});
