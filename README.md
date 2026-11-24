# Ten Deep

**Draft ten deep. Survive 82.** An NBA draft-and-simulate game: spin a team or era, draft a 10-man rotation under a salary cap, then watch your season, the trade deadline and the playoffs play out.

## What's in the game

- **Draft:** spin a team-season, pick one player per spin into a 10-man rotation (PG, SG, SF, PF, C and 5 bench). $200M cap with **real contracts** (each real salary ÷ that season's cap × $171M, so a 35% supermax is $60M; rookie-scale, max, supermax, two-way and minimum deals are labeled; rebuilt by `scripts/contracts/`), at most two players rated 95+, two respins. The cap reserve knows the player pool, so a draft can never dead-end.
- **Season:** 82 games at your chosen sim speed (with skip buttons), injuries that cost exactly the games they say, a one-swap trade deadline at game 50, then 16-team best-of-7 playoffs played game by game.
- **Difficulty:** tuned so 70 wins needs an elite roster and 82-0 never happens (see `src/engine/calibration.test.ts`).
- **Modes:**
  - Current Day (2026-27)
  - All-Time Franchises: all 30 franchises
  - 8 eras: All-Time, Jordan, Shaq/Kobe/Duncan, LeBron, Steph, 1980s, 1990s, 2010s
  - Management Crisis: the board sets a goal, and a crisis card lands every two months
  - Career: one franchise across seasons, with aging, contracts, draft lottery, free agency, offseason trades, morale, franchise records and a Hall of Fame, until the board fires you

  250 team-seasons and 1,288 unique players; each player appears once per mode, at his best season in range.
- **Daily challenges:** Daily Draft (same spins for everyone), Trivia, Player Rank, Team Rank, 1v1 Derby, Team Duel. One shot each per day.
- **Duels:** pass-and-play head-to-head. Shared spins, snake picks, separate caps, then a best-of-7.
- **Collectibles:** a Player Pick (5 cards, keep 1) after every run, plus daily, weekly and streak picks with published odds. 2,171 player-season cards in six tiers. Duplicates level a card up (+1 rating, max +3), and completing a team-season set pays a pick.
- **Card lineups and the Gauntlet:** field your cards as a 10-man lineup with chemistry bonuses, then beat 10 historic teams from good to all-time great.
- **Missions and achievements:** 3 daily and 3 weekly missions, and 42 bronze/silver/gold achievements, all paid in Player Picks.
- **Stats and story:** league leaders, live MVP, DPOY, ROY and Sixth Man races, a season news feed, box scores, playoff game recaps, and season awards.
- **Profile:** drafts played, titles, best record, and 40 original illustrated portraits (no real likenesses).
- **Feel:** synthesized sound effects with a volume control (Settings; preview them in Sound lab), no music, haptics on phones, team-color washes, confetti, welcome slides.
- **Notifications** (phones): daily challenge ready at 9:00, and a streak reminder at 19:00 if you haven't drafted.
- **11 languages:** English, French, Spanish, Portuguese, Turkish, Italian, Dutch, German, Japanese, Korean, Arabic (right-to-left), with each language's own plural forms.
- **Settings and legal:** sound-effects volume, haptics, notifications, sim speed, nationality, language, Privacy Policy, Terms, Contact, and Delete account (wipes all data).

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
| `npm test` | 347 tests: engine, calibration, draft and duel fuzzing, data, i18n, stores |
| `npm run smoke` | Builds the web app and plays the whole game in a headless browser |
| `npm run typecheck` | TypeScript check |
| `npm run review` | Regenerates the ratings review sheets in `docs/ratings-review/` |
| `npm run calibrate` | Difficulty report (e.g. `npm run calibrate -- 40 k=0.014`) |
| `npm run build:web` | Static web build into `dist/` (deployable as-is; `vercel.json` included) |

## Project map

```
src/app/          screens (Expo Router)
src/engine/       pure, seeded game engine: cap, draft, duel, AI league, game sim, season, playoffs, daily challenges,
                  crisis cards, career, collectibles, missions/achievements, stats and story
src/data/         2026 pool, historical team-seasons, mode definitions
src/store/        persisted state (run, profile, settings, daily, duel, career, collection, progress)
src/ui/           design system, portraits, logo, cards, effects, spinner, roster board
src/audio/        synthesized sound effects (rendered to files for iOS/Android)
src/notifications/ local reminder rules + scheduling
src/i18n/         11 locales
docs/             design specs, plans, ratings review sheets, store listing draft
```

## Not built yet (needs owner accounts)

- **Sign-in, online duels, global leaderboards:** need a Supabase project (free). The duel and daily engines are deterministic and UI-independent, so they plug into a server as-is.
- **Live website:** connect this repo in Vercel; `vercel.json` already has the build settings.
- **Ads** (e.g. ad-unlocked trade-deadline swaps).
- **App-store release:** `eas.json` is ready, and `docs/store/listing.md` has the listing text, screenshot plan and submit commands. It needs Apple and Google developer accounts, and a decision on player-name licensing (see the top of that file).
