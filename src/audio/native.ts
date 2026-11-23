/**
 * iOS/Android playback of the pre-rendered sounds and music (assets/audio, made by scripts/render-audio.mts from
 * the same synth code the web plays live). No-ops on the web and in tests: expo-audio is only required on native.
 */
import { Platform } from 'react-native';
import { MUSIC_ASSETS, SFX_ASSETS } from './assets';
import type { SoundName } from './synth';

type ExpoAudio = typeof import('expo-audio');
type Player = ReturnType<ExpoAudio['createAudioPlayer']>;

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
let lib: ExpoAudio | null = null;
function audioLib(): ExpoAudio | null {
  if (!isNative) return null;
  if (!lib) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    lib = require('expo-audio') as ExpoAudio;
    // Sound effects mix with whatever the player is already listening to, and respect the silent switch.
    void lib.setAudioModeAsync({ interruptionMode: 'mixWithOthers', playsInSilentMode: false, shouldPlayInBackground: false }).catch(() => {});
  }
  return lib;
}

/** A few players per sound, so quick repeats (tear crinkles, ticks) overlap instead of cutting each other off. */
const POOL = 3;
const pools = new Map<SoundName, Player[]>();
const next = new Map<SoundName, number>();

function player(name: SoundName): Player | null {
  const a = audioLib();
  const src = SFX_ASSETS[name];
  if (!a || src == null) return null;
  let list = pools.get(name);
  if (!list) { list = []; pools.set(name, list); }
  const i = next.get(name) ?? 0;
  next.set(name, (i + 1) % POOL);
  if (!list[i]) list[i] = a.createAudioPlayer(src);
  return list[i];
}

export function play(name: SoundName) {
  const p = player(name);
  if (!p) return;
  try {
    p.volume = 1;
    void p.seekTo(0);
    p.play();
  } catch { /* a sound is never worth a crash */ }
}

/** Fade a player out over ~150 ms, then pause it. */
function fadeOut(p: Player) {
  let v = p.volume;
  const id = setInterval(() => {
    v -= 0.2;
    try {
      if (v <= 0) { clearInterval(id); p.pause(); p.volume = 1; } else p.volume = v;
    } catch { clearInterval(id); }
  }, 30);
}

/** The suspense hum (a 6 s rise); returns a stop function that fades it out. */
export function hum(strong: boolean): () => void {
  const p = player(strong ? 'hum_strong' : 'hum_soft');
  if (!p) return () => {};
  try { p.volume = 1; void p.seekTo(0); p.play(); } catch { return () => {}; }
  let stopped = false;
  return () => { if (!stopped) { stopped = true; fadeOut(p); } };
}

let music: { key: keyof typeof MUSIC_ASSETS; player: Player } | null = null;

export function startMusic(key: 'menu' | 'playoffs') {
  const a = audioLib();
  const src = MUSIC_ASSETS[key];
  if (!a || src == null) return;
  if (music?.key === key) return;
  stopMusic();
  try {
    const p = a.createAudioPlayer(src);
    p.loop = true;
    p.volume = 1;
    p.play();
    music = { key, player: p };
  } catch { music = null; }
}

export function stopMusic() {
  if (!music) return;
  const p = music.player;
  music = null;
  fadeOut(p);
  setTimeout(() => { try { p.remove(); } catch { /* already gone */ } }, 400);
}
