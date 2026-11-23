import { describe, expect, it } from 'vitest';
import { challengeLink, parseChallenge, runShareText } from './share';

const run = { wins: 61, losses: 21, result: 'champion', resultLabel: 'Champions', mode: 'Current Day', ovrs: [97, 88, 85, 82, 80, 79, 75, 72, 70, 66], seed: 'abc-123', poolId: 'current-2026', name: 'Ryan', url: 'https://ten-deep.vercel.app' };

describe('share', () => {
  it('share text is spoiler-free: record, result and rating squares, plus a challenge link', () => {
    const txt = runShareText(run);
    expect(txt).toContain('61-21 · Champions 🏆');
    expect(txt).toContain('🟨🟩🟦🟦🟦 | ⬜⬜⬜⬜⬜');
    expect(txt).not.toMatch(/Jordan|Curry|James/);
    expect(txt).toContain('https://ten-deep.vercel.app/c?s=abc-123&p=current-2026&w=61&l=21&n=Ryan');
  });

  it('challenge links round-trip, and junk is rejected', () => {
    const url = new URL(challengeLink(run));
    const parsed = parseChallenge(Object.fromEntries(url.searchParams));
    expect(parsed).toEqual({ seed: 'abc-123', poolId: 'current-2026', w: 61, l: 21, name: 'Ryan' });
    expect(parseChallenge({ s: 'x', p: 'current-2026', w: '90', l: '0' })).toBeNull();
    expect(parseChallenge({ p: 'current-2026', w: '1', l: '1' })).toBeNull();
    expect(parseChallenge({ s: '<script>', p: 'a', w: '1', l: '1' })).toBeNull();
    expect(parseChallenge({ s: 'ok', p: 'a', w: '1', l: '1' })?.name).toBe('A friend');
  });
});
