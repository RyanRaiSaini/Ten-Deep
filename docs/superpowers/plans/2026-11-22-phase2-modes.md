# Ten Deep — Phase 2 (Modes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add the All-Time Franchise and Era modes (spec §5.7) on top of the Phase 1 engine, with prime-version player cards and a franchise-mode league drawn from the All-Time pool.

**Architecture:** One historical database of iconic team-seasons (`src/data/history/*.ts`, same line format as Phase 1). `buildPool(filter)` derives each mode's Pool by filtering seasons and keeping each player once, on his highest-rated season in range (spec §5.2 "prime version for that mode"). Modes are registered in a `MODES` table that the home screen and store read.

**Tech Stack:** Same as Phase 1. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-22-ten-deep-design.md` (§5.2, §5.3, §5.4, §5.7, §10)

## Global Constraints
- Overall 64–99; 99 only for all-time peak seasons (e.g. '91 Jordan, '16 Curry, '13 LeBron, '00 Shaq).
- Each player appears at most once per pool (prime version in range); identity = player name.
- Franchise modes: the user drafts from the franchise pool; the 29 AI teams draft from the All-Time pool excluding the user's picks (spec §10).
- Eras: Jordan 1984–1998, Shaq & Kobe / Duncan 1999–2010, LeBron 2003–2018, Steph 2015–2026, NBA 2010s 2010–2019, All-Time (all seasons).
- Launch franchises: Lakers, Celtics, Bulls, Warriors, Spurs, Knicks, Heat, 76ers, Pistons, Rockets.
- Season label convention: the year the season ended (e.g. `1996` = 1995-96).
- Superstar limit (2 players rated 95+) and cap rules apply unchanged.

## Review Focus
1. **A franchise pool too small to draft 10** (few cheap players at a position). Expected: the draft never dead-ends; the pool-aware reserve and fallback still work. Tested by the fuzz draft per franchise in Task 2.
2. **The same player on several team-seasons** (Jordan on '91, '92, '96 Bulls). Expected: one card at the best rating. Tested in Task 1.
3. **League-size feasibility for franchise modes.** The AI drafts 290 players from All-Time; All-Time must have at least 400 unique players. Tested in Task 2.
4. **Calibration in all-time pools:** stronger pools must not make 82-0 possible. Spot-check calibration on the All-Time pool in Task 3.
5. **Saved Phase 1 runs** referencing `current-2026` must still load (pool ids unchanged).

---

### Task 1: Pool builder
**Files:** `src/data/history/build.ts`, `src/data/history/build.test.ts`
**Produces:** `season(franchise, city, name, year, colors, roster)` returning a `TeamSeason` with `season` = year string and a `franchise` field; `buildPool(id, label, seasons, filter): Pool` that dedupes players by name, keeping the max-overall instance (ties → earliest), and drops empty team-seasons.
- [ ] Tests: dedupe keeps the max-overall card; filter by year range; ids are unique across a pool.
- [ ] Commit: `feat(data): historical season builder with prime-version dedupe`.

### Task 2: Historical database and mode pools
**Files:** `src/data/history/{lakers,celtics,bulls,warriors,spurs,knicks,heat,sixers,pistons,rockets,others}.ts`, `src/data/modes.ts`, `src/data/modes.test.ts`, `src/data/index.ts`
- [ ] At least 8 seasons per launch franchise; `others.ts` has iconic non-launch teams (Suns, Mavs, Thunder, Jazz, Magic, Sonics, Kings, Pacers, Nets, Raptors, Bucks, Nuggets, Blazers, Cavs, Clippers, Wolves, Grizzlies, Hawks).
- [ ] `MODES`: id, kind (`current` | `franchise` | `era`), label key, poolId, `leaguePoolId` (franchise → `all-time`).
- [ ] Tests: every pool covers all 5 positions; All-Time has at least 400 unique players; each franchise pool has at least 40 players; fuzz 50 drafts per pool never dead-end; overall 64–99; no duplicate ids per pool.
- [ ] `npm run review` writes a sheet per pool.
- [ ] Commit: `feat(data): all-time franchise and era pools`.

### Task 3: Wire modes into the game
**Files:** `src/store/game.ts` (league pool), `src/app/index.tsx` (mode picker), `src/app/modes/[kind].tsx` (list of franchises or eras), `src/i18n/locales/*.json` (new keys)
- [ ] `startSeason` drafts AI teams from `leaguePoolId ?? poolId`, excluding the user's picks; AI team names come from distinct franchises in that pool.
- [ ] Home: the Franchises and Eras cards are live and open a picker; picking one starts a run.
- [ ] Calibration spot-check on the All-Time pool: the best roster never goes 82-0 in 20 seasons.
- [ ] Smoke: start a Lakers run and complete a draft.
- [ ] Commit: `feat: franchise and era modes playable`.
