import { describe, expect, it } from 'vitest';
import { flagOf, nationOf } from './nation';

const p = (name: string, year = 2026) => ({ name, id: `${name.toLowerCase().replace(/\W+/g, '-')}-${year}` });

describe('player countries', () => {
  it('follows the owner’s calls: the country a player is identified with, birth country otherwise', () => {
    const cases: [string, string][] = [
      ['Joel Embiid', 'cm'], ['Steve Nash', 'za'], ['Tony Parker', 'fr'], ['Nikola Vučević', 'me'], ['Luol Deng', 'ss'],
      ['Thon Maker', 'ss'], ['Enes Kanter', 'tr'], ['Bojan Bogdanović', 'hr'], ['Ivica Zubac', 'hr'], ['Peja Stojaković', 'rs'],
      ['Vladimir Radmanović', 'rs'], ['Karl-Anthony Towns', 'do'], ['Domantas Sabonis', 'lt'], ['Joakim Noah', 'fr'],
      ['Jordan Clarkson', 'ph'], ['Tim Duncan', 'vi'], ['J.J. Barea', 'pr'], ['Mickaël Piétrus', 'fr'], ['Hakeem Olajuwon', 'ng'],
      ['Nikola Jokić', 'rs'], ['Luka Dončić', 'si'], ['Victor Wembanyama', 'fr'], ['Shai Gilgeous-Alexander', 'ca'],
    ];
    for (const [name, code] of cases) expect(nationOf(p(name)), name).toBe(code);
  });

  it('Americans born abroad are American, and anyone unlisted is too', () => {
    for (const name of ['Kyrie Irving', 'Dominique Wilkins', 'Patrick Ewing', 'Carlos Boozer', 'LeBron James', 'Made Up Rookie']) {
      expect(nationOf(p(name)), name).toBe('us');
    }
  });

  it('tells the two Jeff Taylors apart', () => {
    expect(nationOf(p('Jeff Taylor', 1985))).toBe('us');
    expect(nationOf(p('Jeff Taylor', 2014))).toBe('se');
  });

  it('draws flags from country codes', () => {
    expect(flagOf('fr')).toBe('🇫🇷');
    expect(flagOf('pr')).toBe('🇵🇷');
  });
});
