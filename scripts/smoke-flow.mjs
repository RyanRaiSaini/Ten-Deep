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

  await step('all-time lakers run starts and drafts', async () => {
    await page.getByText('All-Time Franchises').click();
    await page.getByTestId('mode-franchise-lal').click();
    await page.getByTestId('spin').click();
    await page.locator('[data-testid="option"], [data-testid="respin"]').first().waitFor({ timeout: 15000 });
    await shot('10-lakers-draft');
    await page.getByTestId('option').first().click();
  });
}
