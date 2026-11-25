/**
 * Fetch every NBA season's league-wide stat pages from Basketball Reference (cached; polite: one request every
 * 4 s, under their 20-per-minute limit): per-game and advanced, 1984 through 2025. These give every player on
 * every team, which scripts/rosters/build.mts turns into full rosters.
 *   npx tsx scripts/rosters/fetch.mts <cacheDir> [fromYear] [toYear]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const [dir, from = '1984', to = '2025'] = process.argv.slice(2);
mkdirSync(dir, { recursive: true });
const BASE = 'https://www.basketball-reference.com';
const jobs: { file: string; url: string }[] = [];
for (let y = +from; y <= +to; y++) {
  for (const kind of ['per_game', 'advanced']) jobs.push({ file: `${kind}-${y}.html`, url: `${BASE}/leagues/NBA_${y}_${kind}.html` });
}
const todo = jobs.filter((j) => !existsSync(join(dir, j.file)));
console.log(`${jobs.length} pages, ${todo.length} to fetch (~${Math.ceil((todo.length * 4) / 60)} min)`);
let failed = 0;
for (const [i, j] of todo.entries()) {
  // curl, not fetch: Node's fetch ignores the sandbox's HTTPS proxy.
  const out = join(dir, j.file);
  try {
    const code = execFileSync('curl', ['-s', '-m', '60', '-A', 'Mozilla/5.0 (compatible; research script; one-time roster lookup)', '-o', out, '-w', '%{http_code}', j.url]).toString();
    if (code !== '200') {
      failed++; console.log(`HTTP ${code} ${j.url}`);
      if (existsSync(out)) unlinkSync(out);
      if (code === '429') await new Promise((ok) => setTimeout(ok, 60_000));
    } else if (statSync(out).size < 20_000) { failed++; console.log(`tiny page ${j.url}`); unlinkSync(out); }
  } catch (e) { failed++; console.log(`ERR ${j.url} ${String(e).slice(0, 80)}`); }
  if ((i + 1) % 10 === 0) console.log(`${i + 1}/${todo.length}`);
  await new Promise((ok) => setTimeout(ok, 4000));
}
console.log(`done, ${failed} failed`);
