# Career Mode (multi-season Management Crisis) — Design

*2026-11-23 · Owner: "start the multi-season career mode" (MyGM-style, building on Management Crisis)*

## Intent
Keep one franchise across many seasons. Each season is a Management Crisis season (board objective, 4 crisis cards, verdict); between seasons comes an offseason of aging, retirements, contracts, a rookie draft and free agency. The career ends when the board fires you. Success means building a lasting team, not just one lucky draft.

## Loop
1. **Season 1:** draft 10 from the Current Day pool, then a Crisis season (unchanged rules).
2. **Verdict and job security:** security starts at 60 (0–100). Legend +30, Extended +15, Survived −15, Fired −40. A "Fired" verdict ends the career only if security drops to 0 or below; otherwise it's a final warning.
3. **Offseason**, then the next season (same franchise; AI teams persist and evolve). The season label advances (2026-27 → 2027-28 …).

## Offseason steps (all seeded by career seed + season number)
1. **Aging and progression:** age +1. Rating change by age, plus noise of ±1:
   - ≤22: +2 to +5
   - 23–26: 0 to +3
   - 27–30: −1 to +1
   - 31–33: −3 to 0
   - 34+: −6 to −2

   Clamped to 64–99. Sub-ratings move with overall.
2. **Retirements:** age 36: 10%, 37: 25%, 38: 45%, 39: 70%, 40+: 100%. A player rated 64 who also declined that offseason retires too (aged out).
3. **Contracts:** every player has `yearsLeft`. Initial deals for drafted and Current Day players are 1–4 years (seeded); rookies get 3; free agents get 1–3. At the offseason all contracts tick down by 1.
   - **User:** expiring players are re-signed (new deal 1–4 years) or released. Released players join the free-agent pool.
   - **AI:** re-signs expiring players rated 75 or higher, releases the rest.
4. **Draft lottery and rookie draft:** a generated class of 30 rookies with invented names, ages 19–21, rated 66–82 (top-heavy), assigned by archetype and position.
   - Draft order is reverse regular-season record; the 14 non-playoff teams are in a weighted lottery for the top 4 picks.
   - The user picks one rookie at their slot from those left. AI teams pick the best available.
   - Every team then has 11 players and must cut to 10: the user chooses, AI cuts its lowest-rated.
5. **Free agency:** each open slot is filled one at a time.
   - The user spins a free-agent "bin" (players grouped by position) and signs one affordable player, with the same cap and superstar rules as the draft.
   - AI teams fill their open slots from the best affordable free agents.
6. **New season:** new schedule and a new board objective from the strength rank; injuries clear; season stops at the card rounds.

## Data and state
- `CareerState { seed, season (1-based), label, security, history[], contracts: {id: yearsLeft}, teams: Roster[] (index 0 = user), freeAgents: Player[], phase }`
- `history[]`: season label, record, seed, playoff result, verdict, cards.
- Player ids persist across seasons; generated rookies get ids `rk-<season>-<n>`.

## Non-goals (later)
- Trades between seasons beyond crisis cards; player morale; owner budget; multi-league history browsing.

## Tests that pin it
- Aging curve direction by age band; ratings stay 64–99; deterministic per seed.
- Retirement odds by age band (statistical); forced at 40+.
- Contracts tick down; expiring players become free agents unless re-signed.
- Lottery: only non-playoff teams; worst record has the best odds; the draft gives every team exactly one rookie; teams end at 10.
- Free agency leaves every team at 10, legal under cap rules, with no duplicate players.
- A 5-season simulated career runs end to end with legal rosters every season.
- Job security math and career-ending rule.
