/** Full game flow for scripts/smoke.mjs: draft 10 → season → deadline → playoffs → result. */
export async function runFlow({ page, base, step, shot }) {
  await step('draft ten players', async () => {
    await page.goto(base);
    await page.getByTestId('mode-current').click();
    await page.getByTestId('spin').waitFor();
    await shot('02-draft-empty');
    for (let pick = 0; pick < 10; pick++) {
      if (await page.getByTestId('spin').count()) await page.getByTestId('spin').click();
      // wait for the reel to land: either options, a respin, or the fallback appear
      await page.locator('[data-testid="option"], [data-testid="respin"], [data-testid="fallback"]').first().waitFor({ timeout: 15000 });
      if (pick === 0) await shot('03-draft-landed');
      const option = page.getByTestId('option').first();
      if (await option.count()) {
        await option.click();
        // multi-slot players need a slot tap: take the first highlighted open slot
        const before = await page.getByTestId('spin').count();
        if (!before && !(await page.getByTestId('start-season').count())) {
          for (const slot of ['PG', 'SG', 'SF', 'PF', 'C', 'B1', 'B2', 'B3', 'B4', 'B5']) {
            const cell = page.getByTestId(`slot-${slot}`);
            await cell.click();
            if ((await page.getByTestId('spin').count()) || (await page.getByTestId('start-season').count())) break;
          }
        }
      } else if (await page.getByTestId('respin').count()) {
        await page.getByTestId('respin').click();
        await page.waitForTimeout(300); // reel restarts; the next loop iteration waits for it to land
        pick--;
        continue;
      } else {
        await page.getByTestId('fallback').click();
      }
      await page.locator('[data-testid="spin"], [data-testid="start-season"]').first().waitFor({ timeout: 5000 });
    }
    await page.getByTestId('start-season').waitFor();
    await shot('04-draft-complete');
    // Choose a division: the Pacific, in the West.
    await page.getByTestId('division-toggle').click();
    await page.getByTestId('division-pacific').click();
    await shot('04b-division');
    const current = await page.getByTestId('division-current').textContent();
    if (!current?.includes('Pacific')) throw new Error(`division not chosen: ${current}`);
  });

  if (process.env.SMOKE_FLOW_DRAFT_ONLY) return;

  await step('refreshing mid-season resumes the season', async () => {
    await page.getByTestId('start-season').click();
    await page.getByTestId('record').waitFor();
    if (!(await page.getByText(/West #\d+/).count())) throw new Error('season should show the West seed');
    await page.waitForTimeout(1500); // let a few games tick and get saved
    await page.reload();
    await page.getByTestId('record').waitFor({ timeout: 10000 });
  });

  await step('season runs to the deadline', async () => {
    await page.getByTestId('skip-deadline').click();
    await page.getByTestId('deadline-skip').waitFor({ timeout: 30000 });
    await shot('05-deadline');
  });

  await step('stand pat at the deadline', async () => {
    await page.getByTestId('deadline-skip').click();
    await page.getByTestId('skip-playoffs').waitFor();
  });

  await step('news, a box score, league leaders and award races mid-season', async () => {
    await page.getByTestId('news').waitFor();
    await page.getByTestId('game-line').first().click();
    await page.getByTestId('box-score').first().waitFor();
    await shot('33-season-news-box');
    await page.getByTestId('to-league').click();
    await page.getByTestId('standings').first().waitFor();
    if ((await page.getByTestId('standings').count()) !== 2) throw new Error('expected East and West tables');
    await shot('34a-standings');
    await page.getByText('Leaders', { exact: true }).click();
    await page.getByTestId('leaders-pts').waitFor();
    await page.getByText('Award race').click();
    await page.getByTestId('award-mvp').waitFor();
    await shot('34-league');
    await page.locator('[data-testid="back"]:visible').click();
  });

  await step('skip to playoffs', async () => {
    await page.getByTestId('skip-playoffs').click();
    await page.getByTestId('to-playoffs').waitFor({ timeout: 30000 });
    await shot('06-season-done');
    await page.getByTestId('to-playoffs').click();
  });

  await step('playoffs to a result', async () => {
    await page.getByTestId('playoff-next').or(page.getByTestId('playoff-sim')).first().waitFor({ timeout: 15000 });
    if (await page.getByTestId('stake-snap').count()) await page.getByTestId('stake-snap').click();
    if (await page.getByTestId('playoff-next').count()) {
      await page.getByTestId('playoff-next').click();
      await page.getByTestId('recap').waitFor();
      await shot('07-playoffs');
    }
    await page.getByTestId('playoff-sim').click();
    await page.getByTestId('bracket').waitFor();
    await page.getByTestId('see-result').click();
    await page.getByTestId('play-again').waitFor({ timeout: 15000 });
    await page.getByTestId('awards').waitFor();
    await page.getByTestId('share').waitFor();
    await page.getByTestId('league-gain').waitFor();
    await page.getByTestId('run-rewards').waitFor();
    await page.getByTestId('season-breakdown').waitFor();
    await page.getByTestId('season-breakdown').scrollIntoViewIfNeeded();
    await shot('08b-breakdown');
    await shot('08-result');
    await page.getByTestId('go-home').click();
    await page.getByTestId('tab-bar').waitFor();
    await page.goto(`${base}/profile`);
    const drafts = (await page.getByTestId('stat-drafts').textContent())?.trim() === '1';
    if (!drafts) throw new Error('drafts-played counter did not increment');
  });

  await step('a friend\'s challenge link: same spins, their record to beat', async () => {
    await page.goto(`${base}/c?s=smoke-seed&p=current-2026&w=55&l=27&n=Ryan`);
    await page.getByTestId('challenge-record').waitFor();
    await shot('36-challenge');
    await page.getByTestId('challenge-accept').click();
    await page.getByTestId('spin').waitFor();
    // A shared /run link (answered by the server on Vercel) lands on the same challenge when the app opens it.
    await page.goto(`${base}/run?s=smoke-seed&p=current-2026&w=55&l=27&n=Ryan&v=2&res=round1`);
    await page.getByTestId('challenge-record').waitFor();
    await page.goto(`${base}/c?s=bad&p=nope&w=1&l=1`);
    await page.getByText('This challenge link is broken.').waitFor();
    await page.goto(`${base}/ladder`);
    await page.getByTestId('ladder-table').waitFor();
    await shot('37-ladder');
  });

  await step('daily trivia and player rank play through and record', async () => {
    await page.goto(base);
    await page.getByTestId('tab-daily').click();
    await page.getByTestId('daily-trivia').click();
    for (let q = 0; q < 5; q++) {
      await page.getByTestId('trivia-choice').first().click();
      if (q === 0) await shot('11-trivia');
      await page.getByTestId('trivia-next').click();
    }
    await page.getByTestId('trivia-score').waitFor();
    await page.getByTestId('trivia-done').click();
    await page.getByTestId('daily-rank').click();
    await page.getByTestId('up-4').click();
    await page.getByTestId('rank-submit').click();
    await page.getByTestId('rank-score').waitFor();
    await shot('12-rank');
    await page.getByTestId('back').last().click();
    if (!(await page.getByText(/\d\/5/).count())) throw new Error('daily hub did not show scores');

    await page.getByTestId('daily-team-rank').click();
    await page.getByTestId('down-0').click();
    await page.getByTestId('rank-submit').click();
    await page.getByTestId('rank-score').waitFor();
    await page.getByTestId('back').last().click();

    await page.getByTestId('daily-derby').click();
    for (let r = 0; r < 5; r++) {
      await page.getByTestId('pick-side').first().click();
      await page.getByTestId('pick-next').click();
    }
    await page.getByTestId('pick-done').click();

    await page.getByTestId('daily-team-duel').click();
    await page.getByTestId('pick-side').last().click();
    await shot('15-team-duel');
    // One shot: backing out after the reveal and returning must not allow a second guess.
    await page.goto(`${base}/daily/pick?kind=duel`);
    await page.getByTestId('pick-score').waitFor({ timeout: 5000 });
    await page.getByTestId('pick-done').click();
    await shot('13-daily-hub');
  });

  await step('management crisis: 4 cards, deadline, playoffs, board verdict', async () => {
    await page.goto(base);
    await page.getByTestId('mode-crisis').click();
    await page.getByTestId('mode-current-2026').click();
    await draftTen(page);
    await page.getByTestId('start-season').click();
    const cards = await playCrisisSeason(page, shot);
    if (cards !== 4) throw new Error(`expected 4 crisis cards, saw ${cards}`);
    await shot('19-crisis-season');
    await page.getByTestId('to-playoffs').click();
    await page.getByTestId('playoff-sim').click();
    await page.getByTestId('see-result').click();
    await page.getByTestId('crisis-verdict').waitFor({ timeout: 10000 });
    await shot('20-crisis-verdict');
  });

  await step('career: season 1, full offseason, season 2 begins', async () => {
    await page.goto(base);
    await page.getByTestId('tab-career').click();
    await page.getByTestId('career-start').click();
    await draftTen(page);
    await page.getByTestId('start-season').click();
    await playCrisisSeason(page);
    await page.getByTestId('to-playoffs').click();
    await page.getByTestId('playoff-sim').click();
    await page.getByTestId('see-result').click();
    await page.getByTestId('career-continue').click();
    if (await page.getByTestId('career-over').count()) return; // fired in year one is a legit ending
    await page.getByTestId('off-contracts').waitFor();
    await shot('21-offseason-contracts');
    await page.getByTestId('off-contracts').click();
    await page.getByTestId('pick-no').waitFor();
    await page.getByTestId('lottery').waitFor();
    if (await page.getByTestId('lottery-skip').count()) await page.getByTestId('lottery-skip').click();
    if (await page.getByTestId('off-skip-rookie').count()) {
      await page.getByTestId('slot-B5').last().click();
    }
    await shot('22-offseason-draft');
    await page.getByTestId('off-draft').click();
    // Offseason trade: propose one deal and get an answer from their GM.
    await page.getByTestId('to-trade').click();
    await page.getByTestId('trade-give').first().click();
    await page.getByTestId('trade-team').first().click();
    await page.getByTestId('trade-want').first().click();
    await page.getByTestId('trade-propose').click();
    await page.getByTestId('trade-msg').waitFor();
    await shot('35-trade');
    await page.locator('[data-testid="back"]:visible').click();
    for (let i = 0; i < 12 && !(await page.getByTestId('off-start').count()); i++) {
      if (await page.getByTestId('fa-option').count()) {
        await page.getByTestId('fa-option').first().click();
        for (const slot of ['PG', 'SG', 'SF', 'PF', 'C', 'B1', 'B2', 'B3', 'B4', 'B5']) {
          if (!(await page.getByTestId('fa-option').first().isVisible().catch(() => false))) break;
          const before = await page.getByTestId('fa-option').count();
          await page.getByTestId(`slot-${slot}`).last().click();
          if ((await page.getByTestId('fa-option').count()) !== before || (await page.getByTestId('off-start').count())) break;
        }
      } else if (await page.getByTestId('fa-min').count()) await page.getByTestId('fa-min').click();
      await page.waitForTimeout(150);
    }
    await shot('23-offseason-fa');
    await page.getByTestId('off-start').click();
    await page.getByTestId('crisis-card').waitFor({ timeout: 10000 });
    await page.goto(`${base}/career`);
    await page.getByText('Season 2').waitFor({ timeout: 5000 });
    await page.getByText('2026-27').first().waitFor();
    await shot('24-career-hub');
  });

  await step('player pick: open a pack, reveal 5, keep 1, see it in the collection', async () => {
    await page.goto(base);
    await page.getByTestId('picks-banner').click();
    await page.getByTestId('pack-open').waitFor();
    await shot('25-pack-closed');
    // Power-up taps (up to three) before opening.
    for (let i = 0; i < 3 && (await page.getByTestId('pack-power').count()); i++) await page.getByTestId('pack-power').click();
    // The pack floats and sways, so it never holds still for Playwright's stability check.
    await page.getByTestId('pack-open').click({ force: true });
    await page.getByTestId('pack-reveal-all').click();
    await page.waitForTimeout(400);
    await shot('26-pack-revealing');
    await page.getByTestId('pack-keep').waitFor({ timeout: 6000 });
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="pack-card-face"]').length === 5, null, { timeout: 6000 });
    await page.getByTestId('pack-card-face').first().click();
    await shot('27-pack-revealed');
    await page.getByTestId('pack-keep').click();
    await page.goto(`${base}/collection`);
    const txt = await page.getByTestId('collection-count').textContent();
    if (!/[1-9]/.test(txt ?? '')) throw new Error(`collection count: ${txt}`);
    await shot('28-collection');
  });

  await step('card lineup auto-fill and a Gauntlet stage', async () => {
    await page.goto(`${base}/collection`);
    await page.getByTestId('to-lineup').click();
    await page.getByTestId('lineup-autofill').click();
    await page.getByTestId('lineup-rating').waitFor();
    await shot('29-lineup');
    await page.getByTestId('to-gauntlet').click();
    await page.getByTestId('gauntlet-play').click();
    for (let i = 0; i < 3 && !(await page.getByTestId('gauntlet-result').count()); i++) await page.getByTestId('gauntlet-next').click();
    await page.getByTestId('gauntlet-result').waitFor();
    await shot('30-gauntlet');
  });

  await step('missions: progress from the runs so far, achievements unlocked', async () => {
    await page.goto(base);
    await page.getByTestId('to-missions').click();
    await page.getByTestId('achievements').waitFor();
    const grid = await page.getByTestId('achievements').textContent();
    if (!grid?.includes('✓')) throw new Error('no achievement unlocked after several finished seasons');
    const claim = page.locator('[data-testid^="claim-"]:not([aria-disabled="true"])');
    if (await claim.count()) await claim.first().click();
    await shot('32-missions');
  });

  await step('card detail: tap a collection card, see level and sets', async () => {
    await page.goto(`${base}/collection`);
    await page.getByTestId('collection-card').first().click();
    const meta = await page.getByTestId('card-meta').textContent();
    if (!/\d/.test(meta ?? '')) throw new Error(`card meta: ${meta}`);
    await shot('31-card-detail');
  });

  await step('pass-and-play duel: 20 picks and a best-of-7', async () => {
    await page.goto(base);
    await page.getByTestId('tab-duels').click();
    await page.getByTestId('p1').fill('Ryan');
    await page.getByTestId('p2').fill('Friend');
    await page.getByTestId('duel-start').click();
    for (let i = 0; i < 20; i++) {
      await page.locator('[data-testid="duel-option"], [data-testid="duel-fallback"]').first().waitFor({ timeout: 5000 });
      if (i === 1) await shot('16-duel-draft');
      const before = await page.getByTestId('duel-turn').textContent();
      const opt = page.getByTestId('duel-option').first();
      if (await opt.count()) {
        await opt.click();
        if ((await page.getByTestId('duel-turn').count()) && (await page.getByTestId('duel-turn').textContent()) === before) {
          for (const slot of ['PG', 'SG', 'SF', 'PF', 'C', 'B1', 'B2', 'B3', 'B4', 'B5']) {
            await page.getByTestId(`slot-${slot}`).last().click();
            if (!(await page.getByTestId('duel-turn').count()) || (await page.getByTestId('duel-turn').textContent()) !== before) break;
          }
        }
      } else await page.getByTestId('duel-fallback').click();
    }
    await page.getByTestId('duel-series').click();
    while (await page.getByTestId('duel-next').count()) await page.getByTestId('duel-next').click();
    await page.getByTestId('duel-winner').waitFor();
    await shot('17-duel-result');
  });

  await step('friends: add by link, Card Clash best of 5, W/L/D tally', async () => {
    // A friend code made by encodeFriend (PIN K7Q2XM, "Jordan"): unknown cards are dropped, so it stays valid as data grows.
    const code = 'TD1WzEsIks3UTJYTSIsIkpvcmRhbiIsImFjZSIsWzg3LDksMjMsMzEyLDVdLCJ3a0hlUDFoWllVdTFDMEphZzF0VDZGTjE3MVA3SzFoYUJlXzFmVVVDbjFYdk5kVTE5WHdpYzFoODZVdDEiLCI3MVA3S3RUNkZOaGFCZV93a0hlUGZVVUNuWHZOZFU5WHdpY2g4NlV0eWh5X0YtZXBIYkMwSmFnenI3YXFzaVBqS1dsTkp2YXdGUE85NnBFaGhaWVV1c1BxVzBsNzVOTWZBb1AxVzZ2cFZGTm9QMzd0NUZITnk1MHo5WEtnUVdKVGZNbFFnMWZZSkFDOC1nMmRFekY2V1gyMzhLcDVIVUNseE9iOE1LY0tVdDFKWHBBTFhpLWZncDZNTVFVWFVqX0E4VXJSZ1paaTdLSnZRMDI5S3pleTlpTnExTmRWdFBDaVpURU03bVBwMFVQRDB2cFVQMktSLTBhTG1USnZXTU11YmNvTVFEZk42b3JxSDlCMGhSRWg2NUZKbzhKUEM0SldaaVhMS2dPdDN3TkkiLFsiY3VycmVudC0yMDI2Iiw1OCwyNCwiY2hhbXBpb24iLFsiVzZ2cFYiLCJGTm9QMyIsImUwUzZVIiwiNGNJZW8iLCJMWlIwZyIsIl9PaTFHIiwiWmpVVEoiLCJvZzg4UCIsImc1N1ZtIiwwXV1d';
    await page.goto(`${base}/f?c=${code}`);
    await page.getByTestId('h2h').waitFor({ timeout: 15000 });
    await shot('40-friend');
    await page.getByText('Best of 5').click();
    await page.getByTestId('play-clash').click();
    await page.getByTestId('fsim').click();
    await page.getByTestId('fwinner').waitFor();
    await shot('41-clash');
    await page.goto(`${base}/duel`);
    await page.getByTestId('friend-K7Q2XM').waitFor();
    const rec = (await page.getByTestId('friend-K7Q2XM').textContent()) ?? '';
    if (!/[01]-[01]/.test(rec)) throw new Error(`tally not shown: ${rec}`);
  });

  await step('shop: free daily reroll and an ad break add rerolls', async () => {
    await page.goto(`${base}/shop`);
    const before = Number(await page.getByTestId('reroll-count').textContent());
    await page.getByTestId('shop-free').click();
    await page.getByTestId('shop-ad').click();
    await page.getByTestId('ad-claim').click({ timeout: 9000 });
    await page.waitForFunction((n) => Number(document.querySelector('[data-testid="reroll-count"]')?.textContent) === n, before + 2);
    await page.getByTestId('buy-10').click();
    await page.getByTestId('soon-ok').click();
    await shot('42-shop');
  });

  await step('profile: pick an avatar', async () => {
    await page.goto(base);
    await page.getByTestId('avatar').click();
    await page.getByTestId('avatar-loc-star').click();
    await page.locator('[data-testid="avatar-loc-star"] >> text=✓').waitFor();
    await shot('14-profile');
  });

  await step('delete account wipes progress', async () => {
    await page.goto(`${base}/legal/delete`);
    await page.getByTestId('confirm-delete').click();
    await page.getByText('✓ Deleted').waitFor();
    await page.goto(base);
    await page.getByTestId('welcome-skip').click(); // a fresh account sees the welcome again
    await page.goto(`${base}/profile`);
    await page.waitForFunction(() => document.querySelector('[data-testid="stat-drafts"]')?.textContent?.trim() === '0', null, { timeout: 5000 });
  });

  await step('all-time lakers run starts and drafts', async () => {
    await page.goto(base);
    await page.getByTestId('mode-franchise').click();
    await page.getByTestId('mode-franchise-lal').click();
    await page.getByTestId('spin').click();
    await page.locator('[data-testid="option"], [data-testid="respin"]').first().waitFor({ timeout: 15000 });
    await shot('10-lakers-draft');
    await page.getByTestId('option').first().click();
  });
}

const SLOTS = ['PG', 'SG', 'SF', 'PF', 'C', 'B1', 'B2', 'B3', 'B4', 'B5'];

/** Draft a full ten on the draft screen (best affordable option each spin). */
async function draftTen(page) {
  await page.getByTestId('spin').waitFor();
  await page.waitForTimeout(500); // let the screen transition finish before tapping
  for (let pick = 0; pick < 10; pick++) {
    if (await page.getByTestId('spin').count()) await page.getByTestId('spin').click();
    await page.locator('[data-testid="option"], [data-testid="respin"], [data-testid="fallback"]').first().waitFor({ timeout: 15000 });
    const option = page.getByTestId('option').first();
    if (await option.count()) {
      await option.click();
      if (!(await page.getByTestId('spin').count()) && !(await page.getByTestId('start-season').count()))
        for (const slot of SLOTS) {
          await page.getByTestId(`slot-${slot}`).click();
          if ((await page.getByTestId('spin').count()) || (await page.getByTestId('start-season').count())) break;
        }
    } else if (await page.getByTestId('respin').count()) { await page.getByTestId('respin').click(); await page.waitForTimeout(300); pick--; continue; }
    else await page.getByTestId('fallback').click();
    await page.locator('[data-testid="spin"], [data-testid="start-season"]').first().waitFor({ timeout: 5000 });
  }
}

/** From the first crisis card to the end of the regular season; returns how many cards were played. */
async function playCrisisSeason(page, shot) {
  let cards = 0;
  for (let guard = 0; guard < 40; guard++) {
    await page.locator('[data-testid="crisis-card"], [data-testid="skip-deadline"], [data-testid="skip-playoffs"], [data-testid="deadline-skip"], [data-testid="to-playoffs"]').first().waitFor({ timeout: 15000 });
    if (await page.getByTestId('crisis-card').count()) {
      cards++;
      if (cards === 1 && shot) { await page.waitForTimeout(600); await shot('18-crisis-card'); }
      if (await page.getByTestId('crisis-option-a').count()) { await page.getByTestId('crisis-option-a').click(); continue; }
      const offers = page.getByTestId('crisis-offer');
      if (await offers.count()) await offers.first().click();
      const accept = page.getByTestId('crisis-accept');
      for (const slot of SLOTS) {
        if (await accept.isEnabled()) break;
        await page.getByTestId(`slot-${slot}`).last().click();
      }
      await accept.click();
    } else if (await page.getByTestId('deadline-skip').count()) await page.getByTestId('deadline-skip').click();
    else if (await page.getByTestId('to-playoffs').count()) break;
    else if (await page.getByTestId('skip-deadline').count()) await page.getByTestId('skip-deadline').click();
    else await page.getByTestId('skip-playoffs').click();
    await page.waitForTimeout(200);
  }
  return cards;
}
