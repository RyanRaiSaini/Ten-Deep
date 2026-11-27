/**
 * Every NBA Finals since 1957-58: season end year → [champion, runner-up], as the game's franchise keys (the
 * St. Louis Hawks are 'atl', the Seattle SuperSonics 'okc', the Baltimore/Washington Bullets 'was'). Crisis cards
 * use it for "Championship DNA" and "Finals experience". 2025-26 is left out until it's played.
 */
export const FINALS: Record<number, readonly [champion: string, runnerUp: string]> = {
  1958: ['atl', 'bos'], 1959: ['bos', 'lal'], 1960: ['bos', 'atl'], 1961: ['bos', 'atl'], 1962: ['bos', 'lal'],
  1963: ['bos', 'lal'], 1964: ['bos', 'gsw'], 1965: ['bos', 'lal'], 1966: ['bos', 'lal'], 1967: ['phi', 'gsw'],
  1968: ['bos', 'lal'], 1969: ['bos', 'lal'], 1970: ['nyk', 'lal'], 1971: ['mil', 'was'], 1972: ['lal', 'nyk'],
  1973: ['nyk', 'lal'], 1974: ['bos', 'mil'], 1975: ['gsw', 'was'], 1976: ['bos', 'phx'], 1977: ['por', 'phi'],
  1978: ['was', 'okc'], 1979: ['okc', 'was'], 1980: ['lal', 'phi'], 1981: ['bos', 'hou'], 1982: ['lal', 'phi'],
  1983: ['phi', 'lal'], 1984: ['bos', 'lal'], 1985: ['lal', 'bos'], 1986: ['bos', 'hou'], 1987: ['lal', 'bos'],
  1988: ['lal', 'det'], 1989: ['det', 'lal'], 1990: ['det', 'por'], 1991: ['chi', 'lal'], 1992: ['chi', 'por'],
  1993: ['chi', 'phx'], 1994: ['hou', 'nyk'], 1995: ['hou', 'orl'], 1996: ['chi', 'okc'], 1997: ['chi', 'uta'],
  1998: ['chi', 'uta'], 1999: ['sas', 'nyk'], 2000: ['lal', 'ind'], 2001: ['lal', 'phi'], 2002: ['lal', 'bkn'],
  2003: ['sas', 'bkn'], 2004: ['det', 'lal'], 2005: ['sas', 'det'], 2006: ['mia', 'dal'], 2007: ['sas', 'cle'],
  2008: ['bos', 'lal'], 2009: ['lal', 'orl'], 2010: ['lal', 'bos'], 2011: ['dal', 'mia'], 2012: ['mia', 'okc'],
  2013: ['mia', 'sas'], 2014: ['sas', 'mia'], 2015: ['gsw', 'cle'], 2016: ['cle', 'gsw'], 2017: ['gsw', 'cle'],
  2018: ['gsw', 'cle'], 2019: ['tor', 'gsw'], 2020: ['lal', 'mia'], 2021: ['mil', 'phx'], 2022: ['gsw', 'bos'],
  2023: ['den', 'mia'], 2024: ['bos', 'dal'], 2025: ['okc', 'ind'],
};

export const wonTitle = (franchise: string, year: number) => FINALS[year]?.[0] === franchise;
export const madeFinals = (franchise: string, year: number) => !!FINALS[year] && FINALS[year].includes(franchise);
