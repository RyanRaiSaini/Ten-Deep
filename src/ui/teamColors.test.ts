import { describe, expect, it } from 'vitest';
import { HISTORY } from '../data/modes';
import { teamGradient, whiteContrast } from './teamColors';

describe('team colors', () => {
  it('every team-season card keeps white text readable (3:1 or better)', () => {
    const bad = HISTORY.filter((t) => whiteContrast(teamGradient(t.colors)[0]) < 3).map((t) => `${t.label} ${t.colors.join('/')}`);
    expect(bad).toEqual([]);
  });

  it('dark primaries are kept as they are; light ones switch or darken', () => {
    expect(teamGradient(['#552583', '#FDB927'])[0]).toBe('#552583');
    expect(teamGradient(['#C4CED4', '#000000'])[0]).toBe('#000000');
    expect(whiteContrast(teamGradient(['#FFC72C', '#FFFFFF'])[0])).toBeGreaterThanOrEqual(3);
  });
});
