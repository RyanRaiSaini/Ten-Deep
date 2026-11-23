/**
 * Synthesized sound effects (Web Audio). No audio files, no licensing.
 * Web only for now; native audio arrives in the polish phase (calls are no-ops there).
 */
import { Platform } from 'react-native';

type Ctx = AudioContext;
let ctx: Ctx | null = null;

export function audio(): Ctx | null {
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

function noise(c: Ctx, start: number, dur: number, { gain = 0.15, lowpass = 1200, highpass = 0 } = {}) {
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
  let chain: AudioNode = src.connect(f);
  if (highpass) {
    const h = c.createBiquadFilter();
    h.type = 'highpass';
    h.frequency.value = highpass;
    chain = chain.connect(h);
  }
  chain.connect(g).connect(c.destination);
  src.start(start);
}

/** A short bell: a sine plus a quiet inharmonic partial, long decay. */
function bell(c: Ctx, freq: number, start: number, dur = 1.2, gain = 0.12) {
  tone(c, freq, start, dur, { type: 'sine', gain });
  tone(c, freq * 2.76, start, dur * 0.5, { type: 'sine', gain: gain * 0.25 });
}

/** Rare-pull stings, one per finish: each rarer finish is bigger and longer. */
const STINGS = {
  holo(c: Ctx, t: number) {
    [1318.5, 1568, 2093].forEach((f, i) => tone(c, f, t + i * 0.06, 0.35, { type: 'triangle', gain: 0.08 }));
  },
  chrome(c: Ctx, t: number) {
    bell(c, 1760, t, 0.9, 0.1); bell(c, 1764, t + 0.02, 0.9, 0.06);
    noise(c, t, 0.25, { gain: 0.06, lowpass: 12000, highpass: 5000 });
  },
  gold(c: Ctx, t: number) {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, f, t + i * 0.08, 0.6, { type: 'sawtooth', gain: 0.07 }));
    bell(c, 2093, t + 0.32, 1.4, 0.1);
    noise(c, t + 0.3, 1, { gain: 0.1, lowpass: 900 });
  },
  violet(c: Ctx, t: number) {
    // A minor-ninth shimmer with a slow chorus: mysterious, not triumphant.
    [440, 523.25, 659.25, 987.77, 1046.5].forEach((f, i) => {
      tone(c, f, t + i * 0.1, 1.2, { type: 'triangle', gain: 0.07 });
      tone(c, f * 1.006, t + i * 0.1, 1.2, { type: 'sine', gain: 0.04 });
    });
    bell(c, 1975.5, t + 0.5, 1.6, 0.08);
  },
  rainbow(c: Ctx, t: number) {
    // Upward glissando, a sparkle run, then a big major chord with the crowd.
    tone(c, 220, t, 0.7, { type: 'sawtooth', gain: 0.08, slideTo: 1760 });
    [1046.5, 1318.5, 1568, 2093, 2637, 3136].forEach((f, i) => tone(c, f, t + 0.45 + i * 0.05, 0.4, { type: 'triangle', gain: 0.06 }));
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f) => tone(c, f, t + 0.8, 1.8, { type: 'sawtooth', gain: 0.05 }));
    bell(c, 2093, t + 0.8, 2, 0.1);
    noise(c, t + 0.75, 2, { gain: 0.2, lowpass: 1000 });
  },
  cosmic(c: Ctx, t: number) {
    // Deep boom, a long rising whoosh, then a wide pad that hangs.
    tone(c, 70, t, 1.4, { type: 'sine', gain: 0.6, slideTo: 35 });
    noise(c, t, 0.4, { gain: 0.2, lowpass: 400 });
    noise(c, t + 0.2, 1.4, { gain: 0.12, lowpass: 6000, highpass: 1500 });
    [261.63, 392, 523.25, 783.99, 1046.5, 1567.98].forEach((f, i) => {
      tone(c, f, t + 0.9 + i * 0.04, 2.6, { type: 'triangle', gain: 0.05 });
      tone(c, f * 1.004, t + 0.9 + i * 0.04, 2.6, { type: 'sine', gain: 0.04 });
    });
    [2093, 2637, 3136, 4186].forEach((f, i) => bell(c, f, t + 1.2 + i * 0.12, 1.5, 0.05));
  },
};
export type StingName = keyof typeof STINGS;

export function sting(name: StingName) {
  const c = audio(); if (!c) return;
  STINGS[name](c, c.currentTime);
}

/** Foil crinkle while tearing: `level` 0..1 makes it brighter and louder as the tear runs. */
export function tear(level: number) {
  const c = audio(); if (!c) return;
  const t = c.currentTime;
  noise(c, t, 0.05 + level * 0.04, { gain: 0.05 + level * 0.12, lowpass: 7000 + level * 5000, highpass: 1800 });
}

/**
 * A low hum that rises while a glowing card waits to be flipped. Returns a stop function.
 * `strong` (a big pull inside) makes it higher, louder and wobblier.
 */
export function hum(strong: boolean): () => void {
  const c = audio(); if (!c) return () => {};
  const t = c.currentTime;
  const o = c.createOscillator();
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(strong ? 98 : 73, t);
  o.frequency.linearRampToValueAtTime(strong ? 196 : 110, t + 6);
  f.type = 'lowpass';
  f.frequency.setValueAtTime(300, t);
  f.frequency.linearRampToValueAtTime(strong ? 1400 : 600, t + 6);
  lfo.frequency.value = strong ? 7 : 3;
  lfoGain.gain.value = strong ? 0.03 : 0.012;
  lfo.connect(lfoGain).connect(g.gain);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(strong ? 0.07 : 0.035, t + 0.6);
  o.connect(f).connect(g).connect(c.destination);
  o.start(t); lfo.start(t);
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const n = c.currentTime;
    g.gain.cancelScheduledValues(n);
    g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), n);
    g.gain.exponentialRampToValueAtTime(0.0001, n + 0.15);
    o.stop(n + 0.2); lfo.stop(n + 0.2);
  };
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
  /** The pack tears open: a ripping burst over a low thump. */
  rip() {
    const c = audio(); if (!c) return;
    const t = c.currentTime;
    noise(c, t, 0.32, { gain: 0.28, lowpass: 9000, highpass: 1200 });
    noise(c, t + 0.05, 0.2, { gain: 0.16, lowpass: 4000, highpass: 600 });
    tone(c, 120, t, 0.35, { type: 'sine', gain: 0.45, slideTo: 50 });
  },
  /** A card turning over: a quick airy flick. */
  flip() {
    const c = audio(); if (!c) return;
    noise(c, c.currentTime, 0.12, { gain: 0.12, lowpass: 6000, highpass: 1500 });
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
