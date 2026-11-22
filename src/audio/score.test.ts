import { describe, expect, it } from 'vitest';
import { TRACKS, barEvents, midiToHz } from './score';

describe('music score', () => {
  it('has a menu and a playoffs track with different tempos', () => {
    expect(TRACKS.menu.bpm).toBeLessThan(TRACKS.playoffs.bpm);
  });

  it('every bar has kick, snare, hats, bass and chord events within the bar', () => {
    for (const track of Object.values(TRACKS))
      for (let bar = 0; bar < 8; bar++) {
        const ev = barEvents(track, bar);
        const kinds = new Set(ev.map((e) => e.kind));
        for (const k of ['kick', 'snare', 'hat', 'bass', 'chord']) expect(kinds.has(k as never)).toBe(true);
        for (const e of ev) {
          expect(e.beat).toBeGreaterThanOrEqual(0);
          expect(e.beat).toBeLessThan(4);
        }
      }
  });

  it('loops: bar n and bar n + progression length are identical', () => {
    const t = TRACKS.menu;
    expect(barEvents(t, 1)).toEqual(barEvents(t, 1 + t.progression.length));
  });

  it('midi 69 is A440', () => {
    expect(midiToHz(69)).toBeCloseTo(440);
  });
});
