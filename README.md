# Ten Deep

**Draft ten deep. Survive 82.** An NBA draft-and-simulate game: spin a team or era, draft a 10-man rotation under a salary cap, then watch your season, the trade deadline, and the playoffs play out.

- Design: [`docs/superpowers/specs/2026-11-22-ten-deep-design.md`](docs/superpowers/specs/2026-11-22-ten-deep-design.md)
- Current plan: [`docs/superpowers/plans/2026-11-22-phase1-core.md`](docs/superpowers/plans/2026-11-22-phase1-core.md)

## Run it on any laptop

Requires Node.js 20+.

```bash
git clone https://github.com/RyanRaiSaini/Ten-Deep.git
cd Ten-Deep
npm install
npm run web        # opens the game in your browser
```

Phone: install **Expo Go**, run `npm start`, and scan the QR code.

| Command | What it does |
|---|---|
| `npm test` | Engine unit tests and sim calibration |
| `npm run typecheck` | TypeScript check |
| `npm run build:web` | Static web build into `dist/` |

## Project map

```
src/app/      screens (Expo Router)
src/engine/   pure, seeded game engine: cap, draft, AI league, game sim, season, playoffs
src/data/     player pools and ratings
src/ui/       design system components
src/i18n/     11 languages
src/audio/    synthesized sound effects
docs/         design spec, plans, ratings review sheets
```
