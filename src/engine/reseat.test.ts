import { describe, expect, it } from 'vitest';
import { reseat, startersLegal } from './reseat';
import { ALL_SLOTS, type Player, type Pos, type RosterSlots } from './types';

const p = (name: string, pos: Pos, ovr: number, pos2?: Pos): Player => ({ id: name, name, pos, pos2, ovr, off: ovr, def: ovr, reb: ovr, ast: ovr, three: ovr, dur: 90 });

describe('reseat', () => {
  it('leaves a legal lineup alone', () => {
    const r: RosterSlots = { PG: p('a', 'PG', 80), SG: p('b', 'SG', 80), SF: p('c', 'SF', 80), PF: p('d', 'PF', 80), C: p('e', 'C', 80), B1: p('f', 'C', 70) };
    expect(reseat(r)).toBe(r);
  });

  it('moves a center out of the PG spot and keeps all ten players', () => {
    const r: RosterSlots = {
      PG: p('bam', 'C', 88, 'PF'), SG: p('b', 'SG', 80), SF: p('c', 'SF', 80), PF: p('d', 'PF', 82), C: p('e', 'C', 81),
      B1: p('guard', 'PG', 76), B2: p('g', 'SF', 70), B3: p('h', 'PF', 70), B4: p('i', 'SG', 70), B5: p('j', 'C', 70),
    };
    const out = reseat(r);
    expect(startersLegal(out)).toBe(true);
    expect(out.PG!.name).toBe('guard');
    expect(new Set(ALL_SLOTS.map((k) => out[k]!.name)).size).toBe(10);
    expect([out.PF!.name, out.C!.name]).toContain('bam');
  });
});
