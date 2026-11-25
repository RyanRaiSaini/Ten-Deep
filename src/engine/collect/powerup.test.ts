import { describe, expect, it } from 'vitest';
import { UPGRADE_CHANCE, nextType, tapUpgrades } from './powerup';

describe('power-up (one a day)', () => {
  it('upgrades one step at a time and stops at Mythic', () => {
    expect(nextType('daily')).toBe('run');
    expect(nextType('run')).toBe('good');
    expect(nextType('confFinals')).toBe('finals');
    expect(nextType('champion')).toBe('sweep');
    expect(nextType('mythic')).toBeNull();
    expect(nextType('legendary')).toBeNull();
    expect(nextType('ultimate')).toBeNull();
  });

  it('hits about its published chance, and the same pick on the same day always rolls the same', () => {
    let hits = 0;
    for (let i = 0; i < 20000; i++) if (tapUpgrades(`p${i}`, '2026-11-25')) hits++;
    expect(hits / 20000).toBeGreaterThan(UPGRADE_CHANCE - 0.02);
    expect(hits / 20000).toBeLessThan(UPGRADE_CHANCE + 0.02);
    expect(tapUpgrades('fixed', '2026-11-25')).toBe(tapUpgrades('fixed', '2026-11-25'));
  });
});
