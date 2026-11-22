# Ten Deep

**Draft ten deep. Survive 82.** An NBA draft-and-simulate game: spin a team or era, draft a 10-man rotation under a salary cap, then watch your season, the trade deadline and the playoffs play out.

## What's in the game

- **Draft:** spin a team-season, pick one player per spin into a 10-man rotation (PG, SG, SF, PF, C and 5 bench). $150M cap, at most two players rated 95+, two respins. The cap reserve knows the player pool, so a draft can never dead-end.
- **Season:** 82 games at your chosen sim speed (with skip buttons), injuries that cost exactly the games they say, a one-swap trade deadline at game 50, then 16-team best-of-7 playoffs played game by game.
- **Difficulty:** tuned so 70 wins needs an elite roster and 82-0 never happens (see `src/engine/calibration.test.ts`).
- **Modes:**
  - Current Day (2026-27)
  - 10 all-time franchises
  - 6 eras: Jordan, Shaq/Kobe/Duncan, LeBron, Steph, 2010s, All-Time

  150 iconic team-seasons and 950 unique players; each player appears once per mode, at his best season.
- **Daily challenges:** Daily Draft (same spins for everyone), Trivia, Player Rank, Team Rank, 1v1 Derby, Team Duel. One shot each per day.
- **Duels:** pass-and-play head-to-head. Shared spins, snake picks, separate caps, then a best-of-7.
- **Profile:** drafts played, titles, best record, and 40 original stylized avatars (no real likenesses).
- **Feel:** synthesized sound effects and two original music loops (Settings → Sound lab), haptics on phones.
- **Notifications** (phones): daily challenge ready at 9:00, and a streak reminder at 19:00 if you haven't drafted.
- **11 languages:** English, French, Spanish, Portuguese, Turkish, Italian, Dutch, German, Japanese, Korean, Arabic (right-to-left).
- **Settings and legal:** music, sound, haptics, notifications, sim speed, nationality, language, Privacy Policy, Terms, Contact, and Delete account (wipes all data).

## Run it on any laptop

Requires Node.js 20+.

```bash
git clone https://github.com/RyanRaiSaini/Ten-Deep.git
cd Ten-Deep
npm install
npm run web        # opens the game in your browser
```

Phone: install **Expo Go**, run `npm start`, and scan the QR code. Notifications, haptics and native right-to-left need a development build (`npx eas-cli@latest build --profile development`).

| Command | What it does |
|---|---|
| `npm test` | 159 tests: engine, calibration, draft and duel fuzzing, data, i18n, stores |
| `npm run smoke` | Builds the web app and plays the whole game in a headless browser |
| `npm run typecheck` | TypeScript check |
| `npm run review` | Regenerates the ratings review sheets in `docs/ratings-review/` |
| `npm run calibrate` | Difficulty report (e.g. `npm run calibrate -- 40 k=0.014`) |
| `npm run build:web` | Static web build into `dist/` (deployable as-is; `vercel.json` included) |

## Project map

```
src/app/          screens (Expo Router)
src/engine/       pure, seeded game engine: cap, draft, duel, AI league, game sim, season, playoffs, daily challenges
src/data/         2026 pool, historical team-seasons, mode definitions
src/store/        persisted state (run, profile, settings, daily results, duel)
src/ui/           design system, avatars, spinner, roster board
src/audio/        synthesized sound effects and music
src/notifications/ local reminder rules + scheduling
src/i18n/         11 locales
docs/             design spec, plans, ratings review sheets
```

## Not built yet (needs owner accounts)

- **Sign-in, online duels, global leaderboards:** need a Supabase project (free). The duel and daily engines are deterministic and UI-independent, so they plug into a server as-is.
- **Live website:** connect this repo in Vercel; `vercel.json` already has the build settings.
- **Ads** (e.g. ad-unlocked trade-deadline swaps) and app-store release.
