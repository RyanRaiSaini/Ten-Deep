/** Basketball Reference team codes for our franchises, by season end year (they changed with relocations). */
export function bbrefCode(franchise: string, year: number): string {
  switch (franchise) {
    case 'atl': return year < 1969 ? 'STL' : 'ATL';
    case 'bkn': return year < 2013 ? 'NJN' : 'BRK';
    case 'cha': return year < 2003 ? 'CHH' : year < 2015 ? 'CHA' : 'CHO';
    case 'gsw': return year < 1963 ? 'PHW' : year < 1972 ? 'SFW' : 'GSW';
    case 'lac': return year < 1979 ? 'BUF' : year < 1985 ? 'SDC' : 'LAC';
    case 'mem': return year < 2002 ? 'VAN' : 'MEM';
    case 'nop': return year < 2014 ? (year === 2006 || year === 2007 ? 'NOK' : 'NOH') : 'NOP';
    case 'okc': return year < 2009 ? 'SEA' : 'OKC';
    case 'sac': return year < 1973 ? 'CIN' : year < 1976 ? 'KCO' : year < 1986 ? 'KCK' : 'SAC';
    case 'uta': return year < 1980 ? 'NOJ' : 'UTA';
    case 'was': return year < 1974 ? 'BAL' : year < 1975 ? 'CAP' : year < 1998 ? 'WSB' : 'WAS';
    case 'phx': return 'PHO';
    default: return franchise.toUpperCase();
  }
}

/** "2026-27" → 2027; "2016" → 2016 (our historical seasons are the end year). */
export const endYear = (season: string) => (season.includes('-') ? Number(season.slice(0, 4)) + 1 : Number(season));
