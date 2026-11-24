/**
 * Render Ten Deep's music (scripts/music/compose.js) to audio files.
 *   npx tsx scripts/music/render.mts --preview <outDir>      → <key>.mp3 previews (with a fade-out) of every track
 *   npx tsx scripts/music/render.mts --app <menuKey> <playoffsKey> → assets/audio/music_menu.m4a / music_playoffs.m4a
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const [mode, a, b] = process.argv.slice(2);
const { chromium } = createRequire(join(root, 'package.json'))('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ content: 'window.__name = (f) => f;' });
await page.addScriptTag({ content: readFileSync(join(root, 'scripts/music/compose.js'), 'utf8') });

type Out = { b64: string; seconds: number };
const renderWav = (key: string, preview: boolean): Promise<Out> => page.evaluate(async ([k, p]: [string, boolean]) => {
  const M = (window as unknown as { Music: any }).Music;
  const { L, R, sampleRate, seconds } = await M.render(k, { preview: p });
  const n = L.length, buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf);
  const s = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 2, true); v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  s(36, 'data'); v.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) {
    v.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 0x7fff, true);
    v.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 0x7fff, true);
  }
  let bin = ''; const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { b64: btoa(bin), seconds };
}, [key, preview] as [string, boolean]);

const tmp = mkdtempSync(join(tmpdir(), 'music-'));
if (mode === '--preview') {
  const out = a ?? join(root, 'music-previews');
  mkdirSync(out, { recursive: true });
  const list = await page.evaluate(() => (window as unknown as { Music: any }).Music.list());
  for (const t of list as { key: string; title: string; style: string; seconds: number }[]) {
    const r = await renderWav(t.key, true);
    const wav = join(tmp, `${t.key}.wav`);
    writeFileSync(wav, Buffer.from(r.b64, 'base64'));
    const n = String(list.indexOf(t) + 1);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '192k',
      '-metadata', `title=${t.title}`, '-metadata', 'artist=Ten Deep', join(out, `${n}-${t.key}.mp3`)]);
    console.log(`${n}. ${t.title} — ${t.style} (${Math.round(t.seconds)}s loop)`);
  }
} else if (mode === '--app') {
  for (const [slot, key] of [['menu', a], ['playoffs', b]] as const) {
    const r = await renderWav(key!, false);
    const wav = join(tmp, `${slot}.wav`);
    writeFileSync(wav, Buffer.from(r.b64, 'base64'));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-c:a', 'aac', '-b:a', '128k', join(root, `assets/audio/music_${slot}.m4a`)]);
    console.log(`${slot}: ${key} (${Math.round(r.seconds)}s loop)`);
  }
}
await browser.close();
rmSync(tmp, { recursive: true, force: true });
