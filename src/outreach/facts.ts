/**
 * What Ten Deep actually does today, verified against the code (see docs/outreach/README.md, "Audit").
 * Drafts and AI prompts use only these facts. Claims in `UNSUPPORTED` are flagged by the draft checks.
 * Update this file when the game changes; do not add planned features as available.
 */

export const FACTS: { id: string; text: string }[] = [
  { id: 'web', text: 'It is a free web game at ten-deep.vercel.app. No download or sign-up is needed to play.' },
  { id: 'draft', text: 'You spin for a random NBA team-season and pick one player per spin until you have a 10-man rotation (PG, SG, SF, PF, C and five bench spots).' },
  { id: 'cap', text: 'There is a $200M salary cap. Each player costs his real contract scaled to that season\'s cap (rookie scale, max, supermax and minimum deals are labeled).' },
  { id: 'limits', text: 'At most two players rated 95 or higher, and two free respins per draft.' },
  { id: 'season', text: 'Then it simulates an 82-game season with injuries and a one-swap trade deadline, then best-of-7 playoffs, game by game.' },
  { id: 'modes', text: 'Modes include Current Day (2026-27 rosters), All-Time Franchises (all 30 franchises across eras) and a Daily Draft where everyone gets the same spins that day.' },
  { id: 'challenge', text: 'After a run you can share a challenge link: the other person gets the same spins in every round and the same 29 AI opponents, and tries to beat your record. If they draft a player an AI team had, that team signs a similar replacement, so the picks are the only difference. Current Day ratings move daily with real games, so playing on another day can shift a few ratings.' },
  { id: 'party', text: 'Party rooms let up to 8 friends draft live from the same spins and play a shared season.' },
  { id: 'career', text: 'Career mode runs multiple seasons with an offseason, a draft lottery, re-signing and free agency.' },
  { id: 'form', text: 'Current Day ratings are nudged daily by real NBA box scores.' },
  { id: 'extras', text: 'Extras: weekly leagues, daily trivia and player rank games, collectible player cards from packs, friend duels.' },
  { id: 'languages', text: 'The game is available in 11 languages.' },
];

/** Claims the game cannot back up today. Each is checked as a case-insensitive pattern. */
export const UNSUPPORTED: { id: string; pattern: RegExp; why: string }[] = [
  { id: 'app-store', pattern: /\b(app store|play store|google play|download (the|our|my) app|on (ios|android)\b)/i, why: 'The game is web-only today; the iOS and Android apps are not released.' },
  { id: 'identical-results', pattern: /\bidentical (conditions|seasons?|results?|ratings)\b|\bexact same (season|results?|ratings)\b|\bsame (results|outcome)\b/i, why: 'Challenges share spins and opponents, not results: each player\'s picks change the season, and Current Day ratings move daily.' },
  { id: 'licensed', pattern: /\b(official(ly)? (nba|licensed)|nba[- ]licensed|licensed by the nba|partnered with the nba)\b/i, why: 'Ten Deep is not affiliated with or licensed by the NBA.' },
  { id: 'prizes', pattern: /\b(prize|prizes|cash|win money|giveaway|paid (you|partnership|sponsorship)|sponsor(ship)? deal)\b/i, why: 'There are no prizes, payments or sponsorship offers.' },
  { id: 'ai-powered', pattern: /\b(ai[- ]powered|powered by ai|machine learning|neural)\b/i, why: 'The simulation is a hand-built model, not AI.' },
  { id: 'leaderboard-global', pattern: /\b(global|worldwide) leaderboard\b/i, why: 'There is no global leaderboard; weekly leagues compare you with a group.' },
  { id: 'player-count', pattern: /\b\d[\d,.]*k?\+? (players|users|people|fans) (are |have )?(playing|play|played|signed up)\b/i, why: 'No verified player counts exist yet.' },
];
