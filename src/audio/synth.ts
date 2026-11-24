/**
 * The game's sound effects, as pure Web Audio graph code (no React Native, no files). There is no music, and no
 * notes or chords: every sound is noise, clicks or a percussive thump.
 * The web plays these live (sfx.ts). For iOS/Android, scripts/render-audio.mts renders the very same functions
 * offline in Chromium into assets/audio/*, which audio/native.ts plays. One source, identical sound.
 */

type Ctx = BaseAudioContext;

/** Where a context's sounds go: the live player registers a volume node here; offline renders use the destination. */
export const OUTPUT = new WeakMap<BaseAudioContext, AudioNode>();
const out0 = (c: Ctx): AudioNode => OUTPUT.get(c) ?? c.destination;

export function tone(
  c: Ctx, freq: number, start: number, dur: number,
  { type = 'sine', gain = 0.2, slideTo, out = out0(c) }: { type?: OscillatorType; gain?: number; slideTo?: number; out?: AudioNode } = {},
) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(out);
  o.start(start);
  o.stop(start + dur + 0.02);
}

export function noise(c: Ctx, start: number, dur: number, { gain = 0.15, lowpass = 1200, highpass = 0, out = out0(c) } = {}) {
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
  chain.connect(g).connect(out);
  src.start(start);
}


/** Foil crinkle while tearing: `level` 0..1 makes it brighter and louder as the tear runs. */
export function tearAt(c: Ctx, t: number, level: number) {
  noise(c, t, 0.05 + level * 0.04, { gain: 0.05 + level * 0.12, lowpass: 7000 + level * 5000, highpass: 1800 });
}


/** Sparkle: a scatter of tiny bright noise ticks over `dur` seconds (no pitch). Deterministic pattern. */
function sparkle(c: Ctx, t: number, count: number, dur: number, gain = 0.05) {
  for (let i = 0; i < count; i++) {
    const at = t + ((i * 0.6180339) % 1) * dur;
    noise(c, at, 0.03 + (i % 3) * 0.01, { gain: gain * (0.6 + ((i * 7) % 5) / 10), lowpass: 14000, highpass: 6000 + ((i * 1300) % 4000) });
  }
}

/** A rising whoosh: noise whose filter opens over `dur`. */
function whoosh(c: Ctx, t: number, dur: number, gain = 0.12, from = 300, to = 6000) {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(out0(c));
  src.start(t);
}

/** Every one-shot sound: how long it rings (for offline rendering) and how to play it at time `t`. */
export const SOUNDS = {
  /** Spinner tick: a short wooden click. */
  tick: { dur: 0.08, play: (c: Ctx, t: number) => tone(c, 1800, t, 0.03, { type: 'square', gain: 0.05 }) },
  /** Spinner lands: low thunk like a ball on hardwood. */
  thunk: { dur: 0.35, play: (c: Ctx, t: number) => { tone(c, 140, t, 0.25, { type: 'sine', gain: 0.5, slideTo: 60 }); noise(c, t, 0.08, { gain: 0.12, lowpass: 600 }); } },
  /** "The pick is in": a crisp card snap on a soft thump (no notes). */
  pickChime: {
    dur: 0.4,
    play: (c: Ctx, t: number) => {
      noise(c, t, 0.07, { gain: 0.22, lowpass: 9000, highpass: 2500 });
      tone(c, 170, t, 0.16, { type: 'sine', gain: 0.32, slideTo: 70 });
      sparkle(c, t + 0.05, 4, 0.2, 0.035);
    },
  },
  /** Net swish: filtered noise burst. */
  swish: { dur: 0.4, play: (c: Ctx, t: number) => noise(c, t, 0.35, { gain: 0.18, lowpass: 3500 }) },
  /** End-of-game buzzer. */
  buzzer: { dur: 0.95, play: (c: Ctx, t: number) => { tone(c, 220, t, 0.9, { type: 'sawtooth', gain: 0.12 }); tone(c, 223, t, 0.9, { type: 'square', gain: 0.06 }); } },
  /** The pack tears open: a ripping burst over a low thump. */
  rip: {
    dur: 0.45,
    play: (c: Ctx, t: number) => {
      noise(c, t, 0.32, { gain: 0.28, lowpass: 9000, highpass: 1200 });
      noise(c, t + 0.05, 0.2, { gain: 0.16, lowpass: 4000, highpass: 600 });
      tone(c, 120, t, 0.35, { type: 'sine', gain: 0.45, slideTo: 50 });
    },
  },
  /** A card turning over: a quick airy flick. */
  flip: { dur: 0.15, play: (c: Ctx, t: number) => noise(c, t, 0.12, { gain: 0.12, lowpass: 6000, highpass: 1500 }) },
  /** Crowd swell for big playoff moments. */
  crowd: { dur: 1.65, play: (c: Ctx, t: number) => noise(c, t, 1.6, { gain: 0.22, lowpass: 900 }) },
  /** Title celebration: a crowd roar swelling up, with confetti pops (no fanfare). */
  fanfare: {
    dur: 2.4,
    play: (c: Ctx, t: number) => {
      noise(c, t, 2.2, { gain: 0.3, lowpass: 1100 });
      noise(c, t + 0.15, 1.8, { gain: 0.1, lowpass: 5000, highpass: 1800 });
      tone(c, 110, t, 0.3, { type: 'sine', gain: 0.4, slideTo: 45 });
      sparkle(c, t + 0.3, 16, 1.6, 0.05);
    },
  },
  /** Foil crinkles at three tear depths (native picks the nearest; the web renders any level live). */
  tear1: { dur: 0.12, play: (c: Ctx, t: number) => tearAt(c, t, 0.2) },
  tear2: { dur: 0.12, play: (c: Ctx, t: number) => tearAt(c, t, 0.55) },
  tear3: { dur: 0.14, play: (c: Ctx, t: number) => tearAt(c, t, 0.9) },
  /** Rare-pull sparkles, one per finish: each rarer finish shimmers bigger and longer. No notes or chords. */
  sting_holo: { dur: 0.6, play: (c: Ctx, t: number) => sparkle(c, t, 8, 0.45, 0.05) },
  sting_chrome: {
    dur: 0.9,
    play: (c: Ctx, t: number) => { noise(c, t, 0.3, { gain: 0.08, lowpass: 14000, highpass: 5000 }); sparkle(c, t + 0.05, 12, 0.7, 0.055); },
  },
  sting_gold: {
    dur: 1.5,
    play: (c: Ctx, t: number) => { whoosh(c, t, 0.45, 0.1, 400, 7000); sparkle(c, t + 0.35, 18, 1, 0.06); noise(c, t + 0.4, 0.9, { gain: 0.08, lowpass: 900 }); },
  },
  sting_violet: {
    dur: 2,
    play: (c: Ctx, t: number) => { whoosh(c, t, 0.6, 0.1, 300, 6000); sparkle(c, t + 0.45, 26, 1.4, 0.055); },
  },
  sting_rainbow: {
    dur: 2.6,
    play: (c: Ctx, t: number) => {
      whoosh(c, t, 0.75, 0.13, 250, 9000);
      tone(c, 120, t + 0.7, 0.35, { type: 'sine', gain: 0.4, slideTo: 50 });
      sparkle(c, t + 0.7, 36, 1.7, 0.06);
      noise(c, t + 0.7, 1.8, { gain: 0.18, lowpass: 1000 });
    },
  },
  sting_cosmic: {
    dur: 3.4,
    play: (c: Ctx, t: number) => {
      tone(c, 70, t, 1.2, { type: 'sine', gain: 0.6, slideTo: 35 });
      noise(c, t, 0.4, { gain: 0.2, lowpass: 400 });
      whoosh(c, t + 0.2, 1.1, 0.12, 200, 10000);
      sparkle(c, t + 1.1, 48, 2.1, 0.06);
      noise(c, t + 1.1, 2.1, { gain: 0.16, lowpass: 1000 });
    },
  },
} satisfies Record<string, { dur: number; play: (c: Ctx, t: number) => void }>;

export type SoundName = keyof typeof SOUNDS;
