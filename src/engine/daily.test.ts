import { describe, expect, it } from 'vitest';
import { MODE_BY_ID } from '../data/modes';
import { dailyKey, dailyRank, dailySeed, dailyTrivia, scoreRank } from './daily';

const allTime = MODE_BY_ID['all-time'].pool;

describe('daily', () => {
  it('keys by local calendar day', () => {
    expect(dailyKey(new Date(2026, 10, 22, 23, 59))).toBe('2026-11-22');
    expect(dailySeed('2026-11-22')).toBe('daily-2026-11-22');
  });

  it('trivia: 5 questions, same for everyone on a day, different the next day', () => {
    const a = dailyTrivia(allTime, '2026-11-22');
    expect(a).toHaveLength(5);
    expect(dailyTrivia(allTime, '2026-11-22')).toEqual(a);
    expect(dailyTrivia(allTime, '2026-11-23')).not.toEqual(a);
  });

  it('trivia: every question has 4 distinct choices and the answer is one of them and correct', () => {
    for (const day of ['2026-11-22', '2026-12-01', '2027-01-15']) {
      for (const q of dailyTrivia(allTime, day)) {
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(q.answer);
        if (q.kind === 'highest') {
          expect(q.players).toHaveLength(4);
          expect(new Set(q.players.map((p) => p.ovr)).size).toBe(4);
          const best = [...q.players].sort((a, b) => b.ovr - a.ovr)[0];
          expect(q.answer).toBe(best.name);
        }
        if (q.kind === 'team') {
          const team = allTime.teams.find((t) => t.players.some((p) => p.name === q.players[0].name))!;
          expect(q.answer).toBe(`${team.city} ${team.name}`);
        }
      }
    }
  });

  it('player rank: 5 players with distinct overalls; scoring counts exact positions', () => {
    const r = dailyRank(allTime, '2026-11-22');
    expect(r.players).toHaveLength(5);
    expect(new Set(r.players.map((p) => p.ovr)).size).toBe(5);
    const correct = [...r.players].sort((a, b) => b.ovr - a.ovr).map((p) => p.id);
    expect(r.answer).toEqual(correct);
    expect(scoreRank(r.answer, r.answer)).toBe(5);
    expect(scoreRank([...r.answer].reverse(), r.answer)).toBe(1);
  });
});
