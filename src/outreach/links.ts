import { GAME_URL } from './types';

/** The campaign link for a landing path and link code (the code goes in `c`; no personal data in URLs). */
export function landingUrl(landing: string, code: string): string {
  const u = new URL(landing || '/', GAME_URL);
  if (code) u.searchParams.set('c', code);
  return u.toString();
}
