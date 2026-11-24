/**
 * Sound effects (the game has no music). The web synthesizes them live with Web Audio (audio/synth.ts); iOS and
 * Android play the same sounds pre-rendered to files (audio/native.ts). No licensed audio anywhere.
 */
import { Platform } from 'react-native';
import * as native from './native';
import { OUTPUT, SOUNDS, tearAt, type SoundName } from './synth';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let level = 1;

/** Sound-effects volume, 0..1 (Settings). */
export function setVolume(v: number) {
  level = Math.max(0, Math.min(1, v));
  if (master && ctx) master.gain.setValueAtTime(level, ctx.currentTime);
  native.setVolume(level);
}

/** The live Web Audio context (web only); null on native, where audio/native.ts plays files instead. */
export function audio(): AudioContext | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = level;
    master.connect(ctx.destination);
    OUTPUT.set(ctx, master);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function play(name: SoundName) {
  const c = audio();
  if (c) SOUNDS[name].play(c, c.currentTime);
  else native.play(name);
}

export type StingName = 'holo' | 'chrome' | 'gold' | 'violet' | 'rainbow' | 'cosmic';

/** A rare-pull sting (each rarer finish is bigger and longer). */
export function sting(name: StingName) {
  play(`sting_${name}`);
}

/** Foil crinkle while tearing: `level` 0..1 makes it brighter and louder as the tear runs. */
export function tear(level: number) {
  const c = audio();
  if (c) tearAt(c, c.currentTime, level);
  else native.play(level < 0.4 ? 'tear1' : level < 0.75 ? 'tear2' : 'tear3');
}


export const SFX = {
  /** Spinner tick: a short wooden click. */
  tick: () => play('tick'),
  /** Spinner lands: low thunk like a ball on hardwood. */
  thunk: () => play('thunk'),
  /** "The pick is in": two-note draft-night chime. */
  pickChime: () => play('pickChime'),
  /** Net swish. */
  swish: () => play('swish'),
  /** End-of-game buzzer. */
  buzzer: () => play('buzzer'),
  /** The pack tears open. */
  rip: () => play('rip'),
  /** A card turning over. */
  flip: () => play('flip'),
  /** Crowd swell for big playoff moments. */
  crowd: () => play('crowd'),
  /** Title fanfare. */
  fanfare: () => play('fanfare'),
};

export type SfxName = keyof typeof SFX;
