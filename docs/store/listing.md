# Ten Deep: store listing (draft)

Everything here is ready to paste into App Store Connect and the Google Play Console. Items marked **Owner** need your input or your accounts.

## Before you submit: read this first

- **Player names need a licence.** Ten Deep uses real NBA player names (no photos, logos or likenesses). A commercial app usually needs a group licence from the players' association (NBPA) to use names. App Review and Google Play can reject or remove sports apps that use real names without one. Options: get a licence, ship with fictional names, or release a free, non-commercial build and accept the risk. **Owner decision.**
- **No NBA marks.** The app uses no NBA or team logos. Team names and colours are factual references. Keep it that way in screenshots and the icon.
- **Legal pages.** Fill in `publisher` and `supportEmail` in `src/config.ts` (both stores require a support contact and a privacy policy URL).

## App Store (iOS)

| Field | Value |
|---|---|
| Name (30) | Ten Deep: Basketball GM |
| Subtitle (30) | Draft ten deep. Survive 82. |
| Category | Games → Sports (secondary: Games → Simulation) |
| Age rating | 4+ (no objectionable content; no gambling: picks are free and can't be bought) |
| Price | Free |
| Bundle ID | `app.tendeep` |

**Promotional text (170)**
New: Management Crisis, multi-season Careers with trades and a Hall of Fame, and Player Picks with 42 achievements to chase.

**Keywords (100)**
basketball,gm,draft,simulation,sports,manager,salary cap,playoffs,dynasty,career,cards,trivia,daily

**Description**

Draft ten deep. Survive 82.

Spin a team, take one player, and build a 10-man rotation under a $200M salary cap. Only two 95+ superstars allowed. Then live with it: an 82-game season, injuries, a trade deadline, and best-of-seven playoffs played game by game.

It's hard on purpose. 70 wins takes an elite roster. 82-0 has never happened.

MODES
• Current Day: 2026-27 rosters
• All-Time Franchises: draft from one franchise's history
• Eras: Jordan, Shaq-Kobe-Duncan, LeBron, Steph, the 1980s, 1990s, 2010s, and All-Time
• Management Crisis: the board sets a goal, and every two months a crisis card changes everything
• Career: one franchise, season after season, with aging, contracts, the draft lottery, free agency, trades and morale, until the board fires you
• Daily Challenges: the same draft for everyone, plus trivia, player rank and more. One shot each.
• Duels: pass-and-play head-to-head drafts and a best-of-seven

COLLECT
• Player Picks after every run: five cards, keep one
• Six tiers from Common to Ultra, published odds, and set bonuses for completing a team-season
• Build a card lineup and fight through the Gauntlet, ten historic teams from good to all-time great
• Daily and weekly missions and 42 achievements

THE STORY OF YOUR SEASON
League leaders, MVP and award races, a news feed, box scores and playoff game recaps.

11 languages. No ads. No accounts. Your progress stays on your device.

Ten Deep is not affiliated with or endorsed by the NBA, its teams or its players.

**What's New (first release)**
First release. Draft, simulate, collect, and try to survive 82.

**URLs (Owner)**
- Support URL: needs a page or email.
- Privacy policy URL: host the in-app Privacy Policy text (Settings → Privacy) on a public page.

**App Privacy ("nutrition label")**
Data not collected. Everything is stored on the device. Notifications are local reminders scheduled on the phone.

## Google Play

| Field | Value |
|---|---|
| App name (30) | Ten Deep: Basketball GM |
| Short description (80) | Draft a 10-man rotation under the cap, then survive 82 games and the playoffs. |
| Category | Sports (Games) |
| Content rating | Everyone (IARC questionnaire: no violence, no gambling, no user content) |
| Package | `app.tendeep` |
| Data safety | No data collected or shared |

Full description: same as the App Store description above (Play allows 4,000 characters).

## Screenshots

`npm run smoke` saves full-page screenshots to `smoke-shots/`. For store sizes, run a development build on a simulator or phone and capture:

1. Draft: a spin landing on a team (`03-draft-landed`)
2. Season: record, news feed and a box score (`33-season-news-box`)
3. League: MVP race (`34-league`)
4. Playoffs: game recap (`07-playoffs`)
5. Player Pick reveal (`27-pack-revealed`)
6. Gauntlet (`30-gauntlet`)
7. Career hub: Hall of Fame (`24-career-hub`)
8. Missions and achievements (`32-missions`)

Required sizes: iPhone 6.9" (1320×2868) and 6.5" (1284×2778); iPad 13" if `supportsTablet` stays on; Play: phone screenshots at 1080×1920 or larger, plus a 1024×500 feature graphic.

## Build and submit (Owner accounts)

```bash
npx eas-cli@latest login
npx eas-cli@latest init            # links the project, writes the projectId into app.json
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --profile production --platform ios
npx eas-cli@latest submit --profile production --platform android
```

Needs: an Apple Developer account ($99/year), a Google Play developer account ($25 once), and an Expo account (free). `eas.json` already defines `development` (dev client), `preview` (internal APK) and `production` (auto-incremented build numbers) profiles.
