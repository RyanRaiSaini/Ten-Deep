import { describe, expect, it } from 'vitest';
import { planNotifications } from './plan';

const base = { daily: true, streak: true, playedToday: false };

describe('planNotifications', () => {
  it('daily challenge repeats every day at 9:00', () => {
    const p = planNotifications({ ...base, now: new Date(2026, 10, 22, 8, 0) });
    expect(p.find((x) => x.kind === 'daily')!.trigger).toEqual({ type: 'daily', hour: 9, minute: 0 });
  });

  it('streak reminder: tonight at 19:00 if you have not drafted yet', () => {
    const p = planNotifications({ ...base, now: new Date(2026, 10, 22, 12, 0) });
    expect(p.find((x) => x.kind === 'streak')!.trigger).toEqual({ type: 'date', at: new Date(2026, 10, 22, 19, 0) });
  });

  it('streak reminder moves to tomorrow once you have played today, or after 19:00', () => {
    const played = planNotifications({ ...base, playedToday: true, now: new Date(2026, 10, 22, 12, 0) });
    expect(played.find((x) => x.kind === 'streak')!.trigger).toEqual({ type: 'date', at: new Date(2026, 10, 23, 19, 0) });
    const late = planNotifications({ ...base, now: new Date(2026, 10, 22, 20, 0) });
    expect(late.find((x) => x.kind === 'streak')!.trigger).toEqual({ type: 'date', at: new Date(2026, 10, 23, 19, 0) });
  });

  it('respects the toggles', () => {
    expect(planNotifications({ ...base, daily: false, streak: false, now: new Date() })).toEqual([]);
    expect(planNotifications({ ...base, daily: false, now: new Date() }).map((x) => x.kind)).toEqual(['streak']);
  });
});
