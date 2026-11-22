/** Full game flow for scripts/smoke.mjs: draft 10 → season → deadline → playoffs → result. */
export async function runFlow({ page, base, step, shot }) {
  await step('draft ten players', async () => {
    await page.goto(base);
    await page.getByText('Current Day').click();
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
  });

  if (process.env.SMOKE_FLOW_DRAFT_ONLY) return;

  await step('refreshing mid-season resumes the season', async () => {
    await page.getByTestId('start-season').click();
    await page.getByTestId('record').waitFor();
    await page.waitForTimeout(1500); // let a few games tick and get saved
    await page.reload();
    await page.getByTestId('record').waitFor({ timeout: 10000 });
  });

  await step('season runs to the deadline', async () => {
    await page.getByTestId('skip-deadline').click();
    await page.getByTestId('deadline-skip').waitFor({ timeout: 30000 });
    await shot('05-deadline');
  });

  await step('stand pat, skip to playoffs', async () => {
    await page.getByTestId('deadline-skip').click();
    await page.getByTestId('skip-playoffs').click();
    await page.getByTestId('to-playoffs').waitFor({ timeout: 30000 });
    await shot('06-season-done');
    await page.getByTestId('to-playoffs').click();
  });

  await step('playoffs to a result', async () => {
    await page.getByTestId('playoff-next').or(page.getByTestId('playoff-sim')).first().waitFor({ timeout: 15000 });
    if (await page.getByTestId('playoff-next').count()) {
      await page.getByTestId('playoff-next').click();
      await shot('07-playoffs');
    }
    await page.getByTestId('playoff-sim').click();
    await page.getByTestId('see-result').click();
    await page.getByTestId('play-again').waitFor({ timeout: 15000 });
    await shot('08-result');
    await page.getByTestId('go-home').click();
    await page.getByText('TEN DEEP', { exact: true }).waitFor();
    const drafts = await page.getByText('🔥 1').count();
    if (!drafts) throw new Error('drafts-played counter did not increment');
  });

  await step('daily trivia and player rank play through and record', async () => {
    await page.goto(base);
    await page.getByText('Daily Challenge').click();
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
    await page.getByTestId('pick-next').click();
    await page.getByTestId('pick-done').click();
    await shot('13-daily-hub');
  });

  await step('pass-and-play duel: 20 picks and a best-of-7', async () => {
    await page.goto(base);
    await page.getByText('Duels').click();
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

  await step('profile: pick an avatar', async () => {
    await page.goto(base);
    await page.getByTestId('avatar').click();
    await page.getByTestId('avatar-legend-gold').click();
    await page.getByText('Legend', { exact: false }).first().waitFor();
    await shot('14-profile');
  });

  await step('delete account wipes progress', async () => {
    await page.goto(`${base}/legal/delete`);
    await page.getByTestId('confirm-delete').click();
    await page.getByText('✓ Deleted').waitFor();
    await page.goto(base);
    await page.getByText('🔥 0').waitFor({ timeout: 5000 });
  });

  await step('all-time lakers run starts and drafts', async () => {
    await page.goto(base);
    await page.getByText('All-Time Franchises').click();
    await page.getByTestId('mode-franchise-lal').click();
    await page.getByTestId('spin').click();
    await page.locator('[data-testid="option"], [data-testid="respin"]').first().waitFor({ timeout: 15000 });
    await shot('10-lakers-draft');
    await page.getByTestId('option').first().click();
  });
}
