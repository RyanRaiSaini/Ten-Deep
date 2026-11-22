/**
 * Synthesized sound effects (Web Audio). No audio files, no licensing.
 * Web only for now; native audio arrives in the polish phase (calls are no-ops there).
 */
import { Platform } from 'react-native';

type Ctx = AudioContext;
let ctx: Ctx | null = null;

function audio(): Ctx | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(
  c: Ctx, freq: number, start: number, dur: number,
  { type = 'sine', gain = 0.2, slideTo }: { type?: OscillatorType; gain?: number; slideTo?: number } = {},
) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

function noise(c: Ctx, start: number, dur: number, { gain = 0.15, lowpass = 1200 } = {}) {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lowpass;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(start);
}

export const SFX = {
  /** Spinner tick — a short wooden click. */
  tick() {
    const c = audio(); if (!c) return;
    tone(c, 1800, c.currentTime, 0.03, { type: 'square', gain: 0.05 });
  },
  /** Spinner lands — low thunk like a ball on hardwood. */
  thunk() {
    const c = audio(); if (!c) return;
    tone(c, 140, c.currentTime, 0.25, { type: 'sine', gain: 0.5, slideTo: 60 });
    noise(c, c.currentTime, 0.08, { gain: 0.12, lowpass: 600 });
  },
  /** "The pick is in" — two-note draft-night chime. */
  pickChime() {
    const c = audio(); if (!c) return;
    const t = c.currentTime;
    tone(c, 659.25, t, 0.35, { type: 'triangle', gain: 0.22 });
    tone(c, 987.77, t + 0.14, 0.6, { type: 'triangle', gain: 0.22 });
    tone(c, 1318.5, t + 0.14, 0.6, { type: 'sine', gain: 0.06 });
  },
  /** Net swish — filtered noise burst. */
  swish() {
    const c = audio(); if (!c) return;
    noise(c, c.currentTime, 0.35, { gain: 0.18, lowpass: 3500 });
  },
  /** End-of-game buzzer. */
  buzzer() {
    const c = audio(); if (!c) return;
    tone(c, 220, c.currentTime, 0.9, { type: 'sawtooth', gain: 0.12 });
    tone(c, 223, c.currentTime, 0.9, { type: 'square', gain: 0.06 });
  },
  /** Crowd swell for big playoff moments. */
  crowd() {
    const c = audio(); if (!c) return;
    noise(c, c.currentTime, 1.6, { gain: 0.22, lowpass: 900 });
  },
  /** Title fanfare — rising brass-ish arpeggio. */
  fanfare() {
    const c = audio(); if (!c) return;
    const t = c.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, f, t + i * 0.13, 0.5, { type: 'sawtooth', gain: 0.1 }));
    tone(c, 1046.5, t + 0.55, 1.2, { type: 'triangle', gain: 0.2 });
    noise(c, t + 0.5, 1.5, { gain: 0.15, lowpass: 900 });
  },
};

export type SfxName = keyof typeof SFX;
