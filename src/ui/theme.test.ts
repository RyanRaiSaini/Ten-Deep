import { describe, expect, it } from 'vitest';
import { alpha } from './theme';

describe('alpha', () => {
  it('appends a two-digit alpha to 3- and 6-digit hex colors', () => {
    expect(alpha('#E8833A', 0.4)).toBe('#E8833A66');
    expect(alpha('#fff', 1)).toBe('#ffffffff');
    expect(alpha('#0B1020', 0)).toBe('#0B102000');
    expect(alpha('#0B1020FF', 0.5)).toBe('#0B102080');
  });
});
