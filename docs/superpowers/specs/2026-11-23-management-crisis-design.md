# Management Crisis — Design

*2026-11-23 · Owner request: "a manager situation… management cards… every 2 months… winner ones and loser ones"*

## Intent
A front-office mode: you draft a team, the board sets an objective, and every ~2 in-game months a **Crisis Card** forces a change to your roster or team. Some cards help, some hurt, a few are huge gambles. The fun is adapting: the season you drafted isn't the season you play. The name, cards and visuals are our own.

## Goals
- A new home-screen mode, "Management Crisis": draft in any mode's pool, then a season with 4 cards (preseason, December, February, April), then a board verdict.
- A 16-card deck: 6 good (green), 7 bad (red), 3 legendary (gold). Most cards are forced; some offer a choice.
- Board objective set from your roster's strength rank; verdict: Fired / Survived / Extended / Legend.
- Colorful card-flip reveal; choices and swap pickers use the existing player cards.
- Deterministic: everything comes from the run's seed, so it is reproducible.

## Non-goals (later)
- Multi-season career (aging, contracts, re-signing, job security across years): version 2.
- Online sharing and leaderboards for Crisis runs.

## Rules
- **Card timing (season rounds):** preseason before game 1 (round 0), December at 20, February at 45 (before the deadline at 50), April at 70. The season stops at each one.
- **Deck:** no repeats within a run; each draw is seeded by run seed + slot.
- **Swaps with the league:** when a card brings in a player who is on an AI team, your outgoing player goes to that team in the same slot. AI rosters stay at 10.
- **Cap and superstar limit:** card signings ignore the cap and the limit unless the card says otherwise ("the owner pays"). Cap Boost raises *your* cap 5% for the free-agent spin it grants.
- **Team modifiers:** temporary rating changes (Hot Streak, Coach Fired, etc.) are stored as `{amount, fromRound, toRound}` and applied to your team's effective rating in the sim.
- **Board objective,** by your roster's strength rank among the 30 teams at season start:
  - rank 1–4: "Win the title"
  - 5–10: "Reach the semifinals"
  - 11–18: "Make the playoffs"
  - 19–30: "Win 30 games"
- **Verdict:**
  - 👑 Legend: won the title.
  - ✍️ Extended: met the objective.
  - 😐 Survived: missed it by one step (one playoff round short, or within 5 wins).
  - 🔥 Fired: otherwise.

## Deck
| # | Card | Rarity | Effect |
|---|---|---|---|
| 1 | Cap Boost | good | Your cap +5%, then one free-agent spin: sign one player from it to replace one of yours (new cap applies) |
| 2 | Hot Streak | good | +3 team rating for the next 10 games |
| 3 | Rookie Gem | good | Pick 1 of 3 young players (age ≤ 22) to replace your lowest-rated player |
| 4 | Veteran Mentor | good | Pick 1 of 3 veterans (age ≥ 33) to replace your lowest-rated bench player, salary waived |
| 5 | Locker Room Glue | good | +1 team rating for the rest of the season |
| 6 | Clean Bill of Health | good | All your injuries are healed |
| 7 | Media Frenzy | bad | Ticket sales are tanking: pick 1 of 5 celebrity stars (high-profile veterans) and swap out one of your players |
| 8 | Blow It Up | bad | Your best player is traded for the best young prospect (age ≤ 23) in the league |
| 9 | Trade Demand | bad | A random starter demands a trade: pick 1 of 3 replacements at his position, each rated lower |
| 10 | Injury Bug | bad | Your two heaviest-minute players are out 8 and 15 games |
| 11 | Coach Fired | bad | −3 team rating for 10 games, then +1 for the rest of the season |
| 12 | Luxury Tax Panic | bad | Swap your highest-paid player for 1 of 3 players at least $10M cheaper |
| 13 | Locker Room Drama | bad | Choice: −2 team rating for 15 games, **or** trade your best bench player for a minimum-salary player |
| 14 | Superteam Rumor | legendary | Choice: sign a 95+ superstar (beyond the limit) and lose your two highest-paid starters, **or** decline |
| 15 | Legend Comeback | legendary | An all-time great (90+ from All-Time) replaces your lowest-rated bench player |
| 16 | Midseason Miracle | legendary | +4 team rating for the next 15 games |

## Architecture
- `src/engine/crisis/deck.ts`: card definitions (id, rarity, title, flavor, icon) and `drawCard(seed, slot, drawn)`.
- `src/engine/crisis/offers.ts`: candidate generation (celebrities, prospects, veterans, replacements), all seeded.
- `src/engine/crisis/apply.ts`: `applyCard(season, card, choice) → season`; pure.
- `src/engine/crisis/board.ts`: `boardObjective(season)` and `verdict(season, playoffs, objective)`.
- Engine changes:
  - `SeasonState` gains `stops` (card rounds to pause at), `mods` (team rating modifiers) and `userCap` (default 150).
  - `advance` honors `stops`.
  - `teamStrength` gains an optional `mod`.
- Store: `crisis` slice in `useGame` (objective, drawn cards, pending card).
- Screens: `/crisis` (card reveal, choices, pickers) and mode entry on home; season and result screens show the objective and verdict.

## Tests that pin it
- Deck: 16 unique cards; a run draws 4 with no repeats, deterministically.
- `advance` stops at every card round and the deadline.
- Each card's `applyCard` keeps both rosters at 10, keeps every player on at most one team, and applies its documented effect.
- Modifiers change sim strength only during their window.
- Objective tiers and verdicts match the table above.
- Browser test: play a full Crisis run through all 4 cards to the verdict.
