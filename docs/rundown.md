# Ten Deep: rundown

## 1. Extra positions (proposal for your review)

The game gives every player one or two positions. A starter slot (PG, SG, SF, PF, C) takes a player who has that position; bench slots take anyone. A third and fourth position needs a small engine change, because players can only have two today. I'll make that change once you've approved the list.

**Today** is what the game has now, and **Proposed** is the full list after the change. Positions in **bold** are new.

| Player | Today | Proposed | Why |
|---|---|---|---|
| Giannis Antetokounmpo | PF | PF / **C** / **SF** | Plays center in closing lineups; handles like a wing |
| Scottie Barnes | SF / PF | SF / PF / **PG** / **C** | Point forward who also plays small-ball center |
| LeBron James | SF / PF | SF / PF / **PG** | Ran the point for most of his career |
| Luka Dončić | PG | PG / **SG** | |
| Nikola Jokić | C | C / **PF** | |
| Jayson Tatum | SF / PF | SF / PF / **SG** | |
| Kevin Durant | SF / PF | SF / PF / **SG** | |
| Cooper Flagg | SF / PF | SF / PF / **SG** | |
| Jalen Johnson | SF / PF | SF / PF / **PG** | Point forward |
| Draymond Green | PF / C | PF / C / **SF** | |
| Jimmy Butler | SF / PF | SF / PF / **SG** | |
| Pascal Siakam | PF / SF | PF / SF / **C** | |
| Paolo Banchero | PF | PF / **SF** | |
| Franz Wagner | SF | SF / **PF** / **SG** | |
| Josh Giddey | PG | PG / **SG** / **SF** | |
| Cade Cunningham | PG | PG / **SG** | |
| Shai Gilgeous-Alexander | PG | PG / **SG** | |
| Anthony Edwards | SG | SG / **SF** | |
| Devin Booker | SG | SG / **PG** | |
| Donovan Mitchell | SG | SG / **PG** | |
| Amen Thompson | SG / SF | SG / SF / **PG** / **PF** | Guards 1 through 4 |
| Ausar Thompson | SF / SG | SF / SG / **PF** | |
| Jalen Williams | SF / SG | SF / SG / **PG** | |
| Mikal Bridges | SF / SG | SF / SG / **PF** | |
| OG Anunoby | SF / PF | SF / PF / **SG** | |
| Deni Avdija | SF / PF | SF / PF / **SG** | |
| Brandon Miller | SF / SG | SF / SG / **PF** | |
| Herbert Jones | SF / SG | SF / SG / **PF** | |
| Josh Hart | SG / SF | SG / SF / **PF** | Rebounds like a big |
| Dyson Daniels | SG / PG | SG / PG / **SF** | |
| Kawhi Leonard | SF | SF / **PF** | |
| Aaron Gordon | PF | PF / **SF** | |
| Lauri Markkanen | PF / SF | PF / SF / **C** | |
| Zion Williamson | PF | PF / **C** | |
| Julius Randle | PF | PF / **C** | |
| Victor Wembanyama | C | C / **PF** | |

The same idea works for legends, for example Magic Johnson PG / SF / PF, Larry Bird SF / PF and Kevin Garnett PF / C. I can draft a historical list next if you want it.

## 2. How ratings are given

- **2026-27 players (Current Day):** set by hand and checked by you (for example Bridges 81, Jalen Williams 84). They never change automatically.
- **Famous historical team-seasons:** the ~250 hand-built teams (the 1996 Bulls, the 1986 Celtics and so on) keep their hand-set ratings exactly.
- **Everyone else, 1984 to now:** our own formula on each player's real season stats, from Basketball Reference:
  - box plus-minus (overall, offense and defense)
  - win shares per 48 minutes
  - PER and true shooting
  - usage, minutes per game and games played
  - honors: All-Star, All-NBA (1st team counts most), All-Defense and MVP voting
  - It's fitted so it reproduces the hand-set ratings; on average it lands within about 2 points of them.
- **Before 1984 (1958 to 1983):** box plus-minus and usage weren't recorded yet, so a "classic" version uses what was kept:
  - PER and win shares per 48
  - true shooting compared with that season's league average
  - minutes and games
  - the same honors
  - Its average error is also about 2 points.
- **Range:** ratings run from 64 (end of bench) to 99. An average team's top ten averages about 77 in every era, so no era is stronger.
- **Other traits:** the play-style tag (scorer, rim protector, 3-and-D and so on) comes from how he played: 3-point rate, assist, rebound and block rates, usage and defense. Durability comes from games played.
- **Squad Rating:** each starter counts 15%, and the bench counts 9 / 6 / 5 / 3 / 2%.

## 3. Difficulty: what I found

Average wins by Squad Rating (20 seasons each, same roster shifted up or down):

| Mode | League average | SR 80 | SR 84 | SR 88 | SR 91 | SR 93 |
|---|---|---|---|---|---|---|
| Current Day | 81.7 | 39 | 60 | 67 | 77 | 78 |
| LeBron era | 78.3 | 41 | 63 | 74 | 80 | 80 |
| Magic vs. Bird | 78.7 | 44 | 69 | 77 | 79 | 81 |
| Jordan era | 78.9 | 44 | 61 | 74 | 79 | 81 |
| Modern era | 79.3 | 43 | 58 | 75 | 79 | 80 |
| All-Time | 80.9 | 29 | 53 | 62 | 78 | 78 |

**Two problems:**

1. **Era leagues are weaker.** Their computer teams average about 78–79, while Current Day averages 82, so the same squad wins far more in an era. An 88 wins 74 in the LeBron era.
2. **Even in Current Day, a team just above average wins too much.** An 84 is barely above the league's 82, and it wins about 60.

**What shipped:**

- Every computer league is now levelled to the same strength, so an 84 means the same thing in every era.
- The win curve is retuned to your targets. Measured over 40 drafted squads:

| Squad Rating | Average wins |
|---|---|
| 83 | 42 |
| 85 | 52 |
| 87 | 64 |
| 89 | 69 |
| 91 | 73.5 |
| 93 | 78 |

- An 84 in the LeBron era now averages about 49 wins. It was 63, and you went 74-8.
- The best squad the cap allows is about 89.7 in Current Day and 91–92 in the eras, so 82-0 stays out of reach in real play.

## 4. Setting up ADMIN_KEY on Vercel

1. Make a long random key. On a Mac, open Terminal and run `openssl rand -base64 33`; any random string of 24 or more characters works. Keep a copy somewhere safe, like your password manager.
2. Open vercel.com and go to your team, the **ten-deep** project, then **Settings**, then **Environment Variables**.
3. Add a variable:
   - Key: `ADMIN_KEY`
   - Value: the key you made
   - Environment: **Production** (Preview too if you want it on preview links)
   - Turn on **Sensitive** so nobody can read it back.
4. Save, then go to **Deployments**, open the latest production deployment, and choose **Redeploy**. The new key only takes effect after a redeploy.
5. Go to ten-deep.vercel.app/admin and enter the same key. It's stored only on that device.

Don't paste the key into chat or into the repo.

## 5. Status of your latest list (all live)

| Item | Status |
|---|---|
| Trade deadline: budget = cap room + outgoing salary, shown on screen | Done |
| Difficulty: levelled leagues, retuned curve | Done |
| Same player twice on one team (JJ Redick): one name per person | Done |
| "Rookie scale" only for players 26 and under (Sabonis) | Done |
| Must pick your division before the season starts | Done |
| Era leagues: Magic vs. Bird = real 1987-88 (23 teams + you, 4 divisions); Jordan = real 1996-97 (29 + you) | Done |
| Bench switch: one per run, 5% of the cap ($10M of $200M) | Done |
| First-time "How to play" pop-up | Done |
| New franchise and Management Crisis pickers | Done |
| Extra positions (section 1) | Waiting for your OK on the list |
