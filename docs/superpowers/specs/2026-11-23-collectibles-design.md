# Collectibles: Player Picks and Collection — Design

*2026-11-23 · Owner: "after every draft… a player pick where you choose between 5 players to keep… pack opening… lots of sparkles… tiers… every 7 days a better pick… 31 days something crazy… 82-0 a legendary card… win the championship an 83+ pick"*

## Cards
- A card is a **player-season** from the historical database plus the 2026 pool; id is the player-season id. Name, season label, team, position and overall come from the data.
- **Tiers by overall:** Common 64–74 · Uncommon 75–79 · Rare 80–84 · Epic 85–89 · Mythic 90–94 · Ultra 95–99. (The tier names are our own.)
- Stylized art only: tier frame, team colors, jersey number. No faces.

## Player Picks (5 cards, keep 1)
| Pick | When | Odds / guarantee |
|---|---|---|
| Daily | once per calendar day | base odds |
| Run | after any finished draft run | base; better if you made the playoffs |
| Weekly | every 7th consecutive login day | boosted odds (≈20% per card to be 85+) |
| Champion | won the title | all 5 cards 83+ |
| Mythic | 31st consecutive login day | one guaranteed 90+ |
| Legendary | went 82-0 | one guaranteed Ultra |

Each card in a pick rolls a tier by the pick's odds table (shown in the UI), then a random card of that tier. The 5 cards are always distinct. Everything is seeded (date or run seed + pick id), so picks are reproducible. No purchases: picks are earned only.

## Streak
Consecutive days the app was opened. A missed day resets it to 1. Weekly picks on days 7, 14, 21, 28…; a Mythic pick on day 31 (then every 31 days).

## Screens
- **Pack opening** (`/packs`):
  - The next unopened pick shows as a glowing pack in its color.
  - Tapping it plays a shake, a sparkle burst and five face-down cards dealt out.
  - Tapping a card flips it, and tier glows reveal what it is. "Reveal all" flips them all, best last.
  - Choose 1 to keep, then confirm.
- **Collection** (`/collection`): a grid of owned cards with tier frames, tier filters and counts.
- Home shows a "Picks" badge with the number of unopened picks. The result screen offers the run's pick.

## Later
Collection lineups (10 from your cards) for duels against the computer and online friends, plus duplicate handling (convert to XP).
