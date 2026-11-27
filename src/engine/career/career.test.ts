import { describe, expect, it } from 'vitest';
import { current2026 } from '../../data/current2026';
import { draftLeague } from '../aiDraft';
import { capRoom } from '../cap';
import { createRng } from '../rng';
import { ALL_SLOTS, type Player, type Roster } from '../types';
import { progressPlayer, retires } from './aging';
import { developDelta, outlookOf } from './development';
import { initialContracts } from './contracts';
import { draftOrder } from './lottery';
import { generateRookieClass } from './rookies';
import { securityAfter } from './security';
import { simulateCareer } from './simulate';

const base: Player = { ...current2026.teams[0].players[0] };

describe('aging', () => {
  it('young players improve, prime players hold, veterans decline (the aging curve)', () => {
    const rng = createRng('age');
    const avg = (age: number, ovr = 78) => {
      let s = 0;
      for (let i = 0; i < 2000; i++) s += developDelta({ name: 'Test Player', age, ovr, dur: 80 }, rng);
      return s / 2000;
    };
    expect(avg(20)).toBeGreaterThan(1.5);
    expect(Math.abs(avg(27))).toBeLessThan(0.8);
    expect(avg(35)).toBeLessThan(-2);
  });

  it('top prospects and elite young stars always improve unless injured; promising picks never stall', () => {
    const rng = createRng('prospects');
    const down = (p: Parameters<typeof developDelta>[0]) =>
      Array.from({ length: 2000 }, () => developDelta(p, rng)).filter((d) => d < 0).length / 2000;
    expect(outlookOf({ name: 'AJ Dybantsa', age: 19, ovr: 84 })).toBe('top');
    expect(outlookOf({ name: 'Victor Wembanyama', age: 22, ovr: 98 })).toBe('elite');
    expect(outlookOf({ name: 'Jaylen Wells', age: 23, ovr: 79 })).toBe('promising');
    expect(outlookOf({ name: 'LeBron James', age: 41, ovr: 88 })).toBe(null);
    // Only an injury can send them backwards (about 5% of seasons).
    expect(down({ name: 'AJ Dybantsa', age: 19, ovr: 84, dur: 85 })).toBeLessThan(0.08);
    expect(down({ name: 'Victor Wembanyama', age: 22, ovr: 98, dur: 85 })).toBeLessThan(0.08);
    expect(down({ name: 'Jaylen Wells', age: 23, ovr: 79, dur: 85 })).toBeLessThan(0.08);
    // An ordinary 23-year-old goes backwards much more often.
    expect(down({ name: 'Ordinary Player', age: 23, ovr: 79, dur: 85 })).toBeGreaterThan(0.25);
  });

  it('progressPlayer ages by one, keeps 64–99, moves sub-ratings with overall', () => {
    const rng = createRng('prog');
    for (const ovr of [64, 80, 99])
      for (const age of [19, 27, 37]) {
        const p = progressPlayer({ ...base, ovr, age, off: ovr, def: ovr }, rng);
        expect(p.age).toBe(age + 1);
        expect(p.ovr).toBeGreaterThanOrEqual(64);
        expect(p.ovr).toBeLessThanOrEqual(99);
        expect(p.off - ovr).toBe(p.ovr - ovr);
      }
  });

  it('retirement: never before 34, rare at 35, stars play on longer, everyone done by 41', () => {
    const rng = createRng('ret');
    const rate = (age: number, ovr = 80) => Array.from({ length: 4000 }, () => retires({ ...base, age, ovr }, false, rng)).filter(Boolean).length / 4000;
    expect(rate(30)).toBe(0);
    expect(rate(33)).toBe(0);
    expect(rate(35)).toBeLessThan(0.15);
    expect(rate(37)).toBeGreaterThan(0.15);
    expect(rate(37)).toBeLessThan(0.35);
    expect(rate(37, 92)).toBeLessThan(rate(37, 80));
    expect(rate(41)).toBe(1);
    expect(retires({ ...base, age: 30, ovr: 64 }, true, rng)).toBe(true); // aged out at the floor
  });
});

describe('contracts', () => {
  it('assigns 1–4 year deals deterministically', () => {
    const players = current2026.teams.flatMap((t) => t.players).slice(0, 50);
    const c = initialContracts(players, 'seed');
    for (const p of players) {
      expect(c[p.id]).toBeGreaterThanOrEqual(1);
      expect(c[p.id]).toBeLessThanOrEqual(4);
    }
    expect(initialContracts(players, 'seed')).toEqual(c);
  });
});

describe('rookies', () => {
  it('generates a 30-player class with invented names, ages 19–21, rated 66–82', () => {
    const cls = generateRookieClass(2, 'seed');
    expect(cls).toHaveLength(30);
    expect(new Set(cls.map((p) => p.name)).size).toBe(30);
    expect(new Set(cls.map((p) => p.id)).size).toBe(30);
    for (const p of cls) {
      expect(p.age).toBeGreaterThanOrEqual(19);
      expect(p.age).toBeLessThanOrEqual(21);
      expect(p.ovr).toBeGreaterThanOrEqual(66);
      expect(p.ovr).toBeLessThanOrEqual(82);
    }
    expect(generateRookieClass(2, 'seed')).toEqual(cls);
  });
});

describe('lottery', () => {
  it('orders every team once; picks 5–14 are non-playoff teams by record; playoff teams pick 15–30', () => {
    const wins = Array.from({ length: 30 }, (_, i) => i + 20); // team 0 is worst (20 wins)
    const playoff = new Set(Array.from({ length: 16 }, (_, i) => 29 - i));
    for (let k = 0; k < 20; k++) {
      const order = draftOrder(wins, playoff, createRng(`lot-${k}`));
      expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: 30 }, (_, i) => i));
      expect(order.slice(0, 14).every((t) => !playoff.has(t))).toBe(true);
      expect(order.slice(14).every((t) => playoff.has(t))).toBe(true);
      const nonTop = order.slice(4, 14);
      for (let i = 1; i < nonTop.length; i++) expect(wins[nonTop[i]]).toBeGreaterThanOrEqual(wins[nonTop[i - 1]]);
    }
  });

  it('the worst team wins the top pick more often than the 14th-worst', () => {
    const wins = Array.from({ length: 30 }, (_, i) => i + 20);
    const playoff = new Set(Array.from({ length: 16 }, (_, i) => 29 - i));
    let worst = 0;
    let fourteenth = 0;
    for (let k = 0; k < 2000; k++) {
      const first = draftOrder(wins, playoff, createRng(`odds-${k}`))[0];
      if (first === 0) worst++;
      if (first === 13) fourteenth++;
    }
    expect(worst).toBeGreaterThan(fourteenth * 3);
  });
});

describe('job security', () => {
  it('moves with verdicts; a career ends only when security hits 0', () => {
    expect(securityAfter(60, 'legend')).toEqual({ security: 90, ended: false });
    expect(securityAfter(60, 'extended')).toEqual({ security: 75, ended: false });
    expect(securityAfter(60, 'survived')).toEqual({ security: 45, ended: false });
    expect(securityAfter(60, 'fired')).toEqual({ security: 20, ended: false });
    expect(securityAfter(20, 'fired')).toEqual({ security: 0, ended: true });
    expect(securityAfter(95, 'legend').security).toBe(100);
  });
});

describe('simulated career', () => {
  it('runs 5 seasons with legal rosters, aging, rookies and free agency every year', () => {
    const user: Roster = { ...draftLeague(current2026, new Set(), 1, createRng('car-user'))[0], id: 'user', name: 'You' };
    const log = simulateCareer(user, current2026, 'career-test', 5);
    expect(log.seasons).toHaveLength(5);
    for (const s of log.seasons) {
      for (const t of s.teams) {
        for (const k of ALL_SLOTS) expect(t.slots[k], `${s.label} ${t.name} ${k}`).toBeDefined();
        expect(capRoom(t.slots)).toBeGreaterThanOrEqual(-60); // card-free sim; AI keeps payroll sane
      }
      const names = s.teams.flatMap((t) => ALL_SLOTS.map((k) => t.slots[k].name));
      expect(new Set(names).size, s.label).toBe(names.length);
    }
    // time passes: the user's roster at season 5 is mostly different people or older versions
    const first = log.seasons[0].teams[0];
    const last = log.seasons[4].teams[0];
    const ages = (r: Roster, name: string) => ALL_SLOTS.map((k) => r.slots[k]).find((p) => p.name === name)?.age;
    const stayer = ALL_SLOTS.map((k) => first.slots[k]).find((p) => ages(last, p.name) !== undefined);
    if (stayer) expect(ages(last, stayer.name)).toBe((stayer.age ?? 0) + 4);
    expect(log.seasons.map((s) => s.label)).toEqual(['2026-27', '2027-28', '2028-29', '2029-30', '2030-31']);
    expect(log.seasons.some((s) => s.teams.some((t) => ALL_SLOTS.some((k) => t.slots[k].id.startsWith('rk-'))))).toBe(true);
  }, 120_000);
});
