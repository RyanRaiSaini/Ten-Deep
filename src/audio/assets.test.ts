import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SOUNDS } from './synth';

/** iOS/Android play pre-rendered files: every synthesized sound must have one (run `npm run audio` after changes). */
describe('native audio assets', () => {
  const map = readFileSync(join(__dirname, 'assets.native.ts'), 'utf8');
  it('every sound and music track is rendered and mapped', () => {
    for (const name of Object.keys(SOUNDS)) {
      expect(map, `${name} missing: run npm run audio`).toContain(`${name}: require('../../assets/audio/${name}.m4a')`);
      expect(existsSync(join(__dirname, `../../assets/audio/${name}.m4a`))).toBe(true);
    }
    for (const track of ['menu', 'playoffs']) {
      expect(map).toContain(`${track}: require('../../assets/audio/music_${track}.wav')`);
      expect(existsSync(join(__dirname, `../../assets/audio/music_${track}.wav`))).toBe(true);
    }
  });
});
