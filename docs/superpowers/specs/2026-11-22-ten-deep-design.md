# Ten Deep — Design

*2026-11-22 · Status: draft for approval*

## 1. Intent

Ten Deep is an NBA draft-and-simulate game. A player spins a team or era, drafts a **10-man rotation** under a **salary cap**, then watches a realistic 82-game season, playoffs and Finals play out.

**Why it exists:** draft games are popular right now, and the NBA versions (Draft 82-0, DraftBattle, DraftDawg) all stop at a starting five. Ten Deep's hook is depth: the bench plays real minutes, injuries happen, and a mid-season trade deadline lets you fix your roster. The owner sees v1 as the start of a long-lived app with many more features to come.

**What success looks like:** the core loop (spin → draft → sim → result) is fun, fair and hard. Winning a title feels earned. 70 wins takes an "insane" roster. 82-0 is near impossible.

## 2. Goals, non-goals, anti-goals

**Goals (v1, built in phases — see §9)**
- Draft and sim loop with spin-plus-cap balance, a 10-man rotation and injuries
- Game modes: Current Day (2026), all-time franchises, eras
- Required sign-in (Apple, Google, email), profile, avatar, nationality flag
- Live head-to-head duels with friends
- Daily challenges: daily draft, trivia and player rank first, then team rank, 1v1 derby and team duel
- Settings: music, sound, haptics, notifications, sim speed, nationality, language
- 11 languages: English, French, Spanish, Portuguese, Turkish, Italian, Dutch, German, Japanese, Korean, Arabic (Arabic is right-to-left)
- Privacy Policy, Terms of Service, account deletion, Contact Us
- iOS, Android and web from one codebase

**Non-goals (later)**
- Ads and in-app purchases. The trade-deadline swap is free in v1 and becomes ad-unlocked later.
- App Store and Play Store publishing (needs the owner's developer accounts)
- Live stats feeds. Data is hand-built.

**Anti-goals (a failure even if it works)**
- **Superteams.** LeBron, Jordan, Steph and Kobe on one roster must be impossible.
- **Easy titles or easy 70-win seasons.**
- **Real-person likenesses or NBA/team logos and trademarks** in art. Player names and stats as facts are fine.
- **A copy of any other game's look.** Ten Deep has its own visual identity.
- Guest play. Sign-in is required.

## 3. Constraints

- The owner won't do manual setup. Anything that needs the owner's identity (creating the GitHub repo, Apple Developer and Google Cloud OAuth credentials, a Supabase account) is listed as an owner step and kept to a minimum. Everything else is automated.
- Commits: about 20–30 per day of work, meaningful rather than spammy.
- Player ratings are original numbers, not copied from any other game.

## 4. Approaches considered

| Approach | Trade-off | Verdict |
|---|---|---|
| **Expo (React Native) + Supabase** | One TypeScript codebase for iOS, Android and web. Real haptics and push notifications. Supabase gives auth (Apple, Google, email), Postgres and realtime for live duels. | **Chosen** |
| Next.js web app (PWA) | Fastest to ship, but iOS limits push and haptics in the browser and it doesn't feel like an app | Rejected |
| Native Swift + Kotlin | Best feel, but two codebases and no web | Rejected |
| Firebase instead of Supabase | Equivalent, but weaker SQL for leaderboards and duel state | Rejected |

**Balance approach (owner picked):** spin plus salary cap, over spin-only (still allows a lucky stack) and cap-only (less excitement).

## 5. Game design

### 5.1 Core loop
```
HOME → choose mode → DRAFT (10 picks) → SEASON SIM (82 games, fast)
     → TRADE DEADLINE (1 swap, ~game 50) → finish season → PLAYOFFS (game by game)
     → RESULT (record, awards, title?) → drafts-played counter +1
```

### 5.2 Draft
- **Roster:** 10 slots. Starters are PG, SG, SF, PF and C. The bench is 5 slots of any position. A player can fill their primary or secondary position.
- **Each pick:** the spinner lands on a *team-season* from the mode's pool (for example "2016 Warriors" or "2026 Thunder"). The player sees that roster, with players who don't fit an open slot or the remaining cap greyed out, and picks one.
- **Respins:** 2 per draft, used when a spin is useless.
- **Salary cap:** $150M total for 10 players. Salary is a function of overall rating, not real contracts. Starting curve (builder tunes it): 99 ≈ $50M, 95 ≈ $42M, 90 ≈ $30M, 85 ≈ $20M, 80 ≈ $12M, 75 ≈ $6M, 70 ≈ $3M, 64 ≈ $1M.
  - **Target:** at most about 2 players rated 95+ fit, and doing it forces a cheap bench.
  - **Hard rule:** the draft UI never lets the player pick someone that would leave the remaining slots unfillable at minimum salary. "Cap left after reserving minimums" is the number the UI shows.
- **Each player appears once per draft.** In era and all-time modes, a player has one card per mode at their *prime* version for that mode.

### 5.3 Ratings
- **Overall range is 64–99.** 64 is the floor and nobody goes below it.
- **Current Day (2026)** uses ratings as of the 2026-27 season. Age matters: Wembanyama, Jokić, Dončić and Gilgeous-Alexander are about 97; LeBron is in the high 80s or low 90s.
- **Era and all-time modes** use the player's prime within that era, for example 2016 Curry at 99 or prime LeBron at 99. Ratings should not be inflated: 99 is reserved for all-time peak seasons.
- **Sub-ratings** drive the sim: overall, offense, defense, rebounding, playmaking, three-point shooting, durability (injury risk), position(s), and an archetype tag.
- **Owner reviews the data.** Ratings live in human-readable data files (one per mode or roster pool), so they're easy to scan and edit, plus a generated review sheet.

### 5.4 League and opponents
*Builder's call, marked:* the other 29 teams are AI teams drafted from the **same mode pool, under the same cap rules**, after the player's draft. That means no duplicate players, every mode works the same way, and opponents are always realistic for the mode. AI drafting has variance, so the league has a spread of strong and weak teams.

### 5.5 Simulation
- **Possession-level game model** driven by the sub-ratings, with minutes distributed by rotation slot. Starters play about 30–36 minutes and bench players about 10–24. Fatigue and foul trouble shift minutes.
- **Calibration targets** (tested automatically by simulating thousands of seasons):
  - An average roster goes about 41-41.
  - A strong, well-built draft wins about 55–62.
  - 70+ wins needs a near-optimal roster and still happens only sometimes.
  - **82-0 is about one in 10,000 or rarer, even for the best possible roster.**
  - The best affordable rosters win the title roughly 30–40% of the time; a good, typical draft about 10–15%.
- **Injuries:** each game there's a per-player chance based on durability and minutes. Severity ranges from day-to-day to season-ending. When a player is out, the rotation backfills automatically. This is where bench depth pays off.
- **Pacing:**
  - The regular season ticks quickly. The record counter rolls and there's a feed of headline games and injuries. A **Skip to Deadline** or **Skip to Playoffs** button is always visible.
  - Sim speed (a setting) scales tick rate: 0.5×, 1×, 2× or 4×.
  - Playoffs are best-of-seven series, one game at a time, with a box-score summary. The player taps to continue.
- **Results:** record, seed, playoff run, Finals result, team stats, and MVP and other awards if earned.

### 5.6 Trade deadline (transfer window)
At about game 50 (the sim calendar's early February), the deadline opens. The player may swap **one** player out and spin once for a replacement, under the same cap rules. Free in v1; ad-unlocked when ads ship.

### 5.7 Modes
- **Current Day:** the 2026-27 season, about 30 teams × about 15 players. The pool is all 2026 teams.
- **All-time franchises:** Lakers, Celtics, Bulls, Warriors, Spurs, Knicks, Heat, 76ers, Pistons and Rockets at launch. The spin lands on a historical season of that franchise.
- **Eras:** the Jordan Era (1984–1998), the Shaq & Kobe / Duncan Era (1999–2010), the LeBron Era (2003–2018), the Steph Era (2015–2026), the NBA 2010s, and All-Time (every season).
- Era and franchise pools need historical rosters. Those contain only notable players (about 8–10 per team-season), which is enough for drafting.

### 5.8 Daily challenges
- **Daily draft:** the same seeded spins for everyone that day, a sim with a fixed seed, and a global leaderboard by wins and playoff result.
- **Trivia:** 5 questions a day, generated from the dataset plus a hand-written question bank.
- **Player rank:** order 5 players by a stat or rating.
- **Later in v1:** team rank, **1v1 derby** (two players' versions head-to-head; guess who wins), **team duel** (two historic team-seasons; guess who wins).

### 5.9 Duels (live head-to-head)
- Invite a friend by username or share link. Both players join a room.
- Snake draft from **shared spins**: both players see the same spun team-season and alternate picks, each under their own cap.
- After the draft, the two rosters play a **best-of-seven series**, simulated identically for both and shown live.
- Supabase Realtime carries room state; the server (an edge function) owns the random seeds and validates picks so nobody can cheat.

### 5.10 Accounts, profile and settings
- Sign-in is required: Apple, Google and email (magic link or password). There's no guest play.
- Profile: username, avatar (one of about 40), nationality flag, drafts played, titles, best record, duel record.
- **Avatars:** about 40 original stylized illustrations, built as SVG with no real faces. They're silhouettes and archetypes (big man, floor general, sharpshooter, "legend" variants with gold trim), each with color schemes not tied to NBA team marks.
- **Settings:** music on/off, sound effects on/off, haptics on/off, notifications (each of the three types), sim speed, nationality, language, plus Privacy Policy, Terms, Contact Us and Delete Account (deletes the auth user and all data).

### 5.11 Audio, haptics and notifications
- **Sound effects** are synthesized in code: spinner ticks that slow down, a landing thunk, a "pick is in" draft chime, a buzzer, crowd swells in the playoffs, a title fanfare. There's a demo page the owner can listen to before they ship.
- **Music:** royalty-free (CC0) loops, with menu and playoff variants.
- **Haptics:** ticks during the spin, a heavy impact on landing and on the pick, and a success pattern on a title.
- **Notifications:** daily challenge ready; streak or daily at risk ("you haven't drafted today"); duel invite. Delivered through Expo push notifications.

### 5.12 Internationalization
Every string goes through i18n (i18next). Arabic uses a right-to-left layout. The translations in v1 are machine-quality and flagged for native review later. Player and team names are not translated.

## 6. Visual direction
Dark, high-contrast "arena night" UI: a deep navy or charcoal background, a hardwood-orange accent and a single neon highlight, with big bold condensed type for numbers and ratings. Player cards show overall, position and salary. The look is our own.

## 7. Architecture
```
ten-deep/
  app/                Expo Router screens (home, draft, sim, duels, daily, profile, settings, legal)
  src/engine/         pure TS: draft rules, cap, AI drafter, game sim, season, playoffs, injuries  (unit-tested)
  src/data/           player and roster pools per mode (TS/JSON), rating review generator
  src/i18n/           11 locale files
  src/audio/          synthesized sound effects plus music player
  src/ui/             design system components (PlayerCard, Spinner, CapMeter, ...)
  supabase/           SQL migrations (profiles, drafts, daily results, duels), edge functions
```
- The engine has no React or network dependencies, so it is deterministic given a seed. That makes daily drafts, duels and calibration tests possible.
- Saved data: profile, draft history, daily results and leaderboards, duel rooms and friends.

## 8. Owner steps (unavoidable, kept minimal)
1. Create the empty GitHub repo `ten-deep`. One click: `https://github.com/new?name=ten-deep`
2. Later, for live sign-in and duels: a Supabase project, Google OAuth client and Apple Developer account. The app runs locally against a dev auth setup until then.

## 9. Build phases
1. **Core:** engine, data, draft and sim UI, Current Day mode, local profile, settings, i18n scaffold, sound demo
2. **Modes:** franchise and era pools, trade deadline, injuries polish, rating review sheet
3. **Accounts:** Supabase auth (Apple, Google, email), profile, avatars, legal pages, account deletion
4. **Daily challenges:** daily draft, trivia, player rank, then team rank, 1v1 derby, team duel
5. **Duels:** live rooms, friends, notifications
6. **Polish:** full translations, RTL pass, music, haptics tuning

## 10. Decisions from the review pass (builder's calls, owner can override)
- **Data scope:** curated, not exhaustive. All-Time covers notable team-seasons from 1960 on (about 250 team-seasons × 8–10 players). Ratings are written from basketball knowledge, then the owner reviews them. **Current Day rosters reflect the most recent known 2026-27 rosters; offseason moves after mid-2026 need the owner's check** (flagged in the review sheet).
- **Stats:** each player-season carries a few headline stats (PPG, RPG, APG) and accolades (MVP, All-NBA, titles) for trivia and player rank. Trivia also draws from a hand-written question bank.
- **Franchise-mode league:** the player drafts from the franchise pool. The 29 AI opponents are drafted from the All-Time pool, excluding the player's picks. Once-per-draft still holds.
- **"Shipped" for v1:** a hosted web build on Vercel. Native builds (push notifications, on-device Apple sign-in, haptics) come with the store-launch step, which needs the owner's Expo and Apple accounts.

## 11. Left to the builder
Exact cap curve and sim coefficients (to hit §5.5 targets), component styling, trivia question bank, avatar art, the precise AI draft strategy, the database schema.
