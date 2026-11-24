/**
 * iOS/Android playback of the pre-rendered sound effects (assets/audio, made by scripts/render-audio.mts from
 * the same synth code the web plays live). No-ops on the web and in tests: expo-audio is only required on native.
 */
import { Platform } from 'react-native';
import { SFX_ASSETS } from './assets';
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
let volume = 1;

export function setVolume(v: number) { volume = v; }

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
    p.volume = volume;
    void p.seekTo(0);
    p.play();
  } catch { /* a sound is never worth a crash */ }
}


