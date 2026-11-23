import { describe, expect, it } from 'vitest';
import { POWER_TAPS, UPGRADE_CHANCE, nextType, tapUpgrades } from './powerup';

describe('power-up taps', () => {
  it('upgrades one step at a time and stops at Mythic', () => {
    expect(nextType('daily')).toBe('run');
    expect(nextType('weekly')).toBe('champion');
    expect(nextType('mythic')).toBeNull();
    expect(nextType('legendary')).toBeNull();
  });

  it('each tap hits about its published chance, and the same pick always rolls the same', () => {
    for (let tap = 0; tap < POWER_TAPS; tap++) {
      let hits = 0;
      for (let i = 0; i < 20000; i++) if (tapUpgrades(`p${i}`, tap)) hits++;
      expect(hits / 20000).toBeGreaterThan(UPGRADE_CHANCE[tap] - 0.02);
      expect(hits / 20000).toBeLessThan(UPGRADE_CHANCE[tap] + 0.02);
    }
    expect(tapUpgrades('fixed', 0)).toBe(tapUpgrades('fixed', 0));
    expect(tapUpgrades('fixed', 3)).toBe(false);
  });
});
