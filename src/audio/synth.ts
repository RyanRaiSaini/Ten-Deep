/**
 * The game's sounds and music voices, as pure Web Audio graph code (no React Native, no files).
 * The web plays these live (sfx.ts, music.ts). For iOS/Android, scripts/render-audio.mts renders the very same
 * functions offline in Chromium into assets/audio/*, which audio/native.ts plays. One source, identical sound.
 */
import { midiToHz, type NoteEvent } from './score';

type Ctx = BaseAudioContext;

export function tone(
  c: Ctx, freq: number, start: number, dur: number,
  { type = 'sine', gain = 0.2, slideTo, out = c.destination }: { type?: OscillatorType; gain?: number; slideTo?: number; out?: AudioNode } = {},
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

export function noise(c: Ctx, start: number, dur: number, { gain = 0.15, lowpass = 1200, highpass = 0, out = c.destination as AudioNode } = {}) {
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

/** A short bell: a sine plus a quiet inharmonic partial, long decay. */
function bell(c: Ctx, freq: number, start: number, dur = 1.2, gain = 0.12) {
  tone(c, freq, start, dur, { type: 'sine', gain });
  tone(c, freq * 2.76, start, dur * 0.5, { type: 'sine', gain: gain * 0.25 });
}

/** Foil crinkle while tearing: `level` 0..1 makes it brighter and louder as the tear runs. */
export function tearAt(c: Ctx, t: number, level: number) {
  noise(c, t, 0.05 + level * 0.04, { gain: 0.05 + level * 0.12, lowpass: 7000 + level * 5000, highpass: 1800 });
}

/**
 * The suspense hum: a low sawtooth that rises over 6 s. Returns its gain node so a live player can fade it out;
 * offline it's rendered whole (and faded by volume on native).
 */
export function humAt(c: Ctx, t: number, strong: boolean, out: AudioNode = c.destination) {
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
  o.connect(f).connect(g).connect(out);
  o.start(t); lfo.start(t);
  return { gain: g, stop: (when: number) => { o.stop(when); lfo.stop(when); } };
}

/** Every one-shot sound: how long it rings (for offline rendering) and how to play it at time `t`. */
export const SOUNDS = {
  /** Spinner tick: a short wooden click. */
  tick: { dur: 0.08, play: (c: Ctx, t: number) => tone(c, 1800, t, 0.03, { type: 'square', gain: 0.05 }) },
  /** Spinner lands: low thunk like a ball on hardwood. */
  thunk: { dur: 0.35, play: (c: Ctx, t: number) => { tone(c, 140, t, 0.25, { type: 'sine', gain: 0.5, slideTo: 60 }); noise(c, t, 0.08, { gain: 0.12, lowpass: 600 }); } },
  /** "The pick is in": two-note draft-night chime. */
  pickChime: {
    dur: 0.85,
    play: (c: Ctx, t: number) => {
      tone(c, 659.25, t, 0.35, { type: 'triangle', gain: 0.22 });
      tone(c, 987.77, t + 0.14, 0.6, { type: 'triangle', gain: 0.22 });
      tone(c, 1318.5, t + 0.14, 0.6, { type: 'sine', gain: 0.06 });
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
  /** Title fanfare: rising brass-ish arpeggio. */
  fanfare: {
    dur: 2.1,
    play: (c: Ctx, t: number) => {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, f, t + i * 0.13, 0.5, { type: 'sawtooth', gain: 0.1 }));
      tone(c, 1046.5, t + 0.55, 1.2, { type: 'triangle', gain: 0.2 });
      noise(c, t + 0.5, 1.5, { gain: 0.15, lowpass: 900 });
    },
  },
  /** Foil crinkles at three tear depths (native picks the nearest; the web renders any level live). */
  tear1: { dur: 0.12, play: (c: Ctx, t: number) => tearAt(c, t, 0.2) },
  tear2: { dur: 0.12, play: (c: Ctx, t: number) => tearAt(c, t, 0.55) },
  tear3: { dur: 0.14, play: (c: Ctx, t: number) => tearAt(c, t, 0.9) },
  /** Rare-pull stings, one per finish: each rarer finish is bigger and longer. */
  sting_holo: { dur: 0.6, play: (c: Ctx, t: number) => [1318.5, 1568, 2093].forEach((f, i) => tone(c, f, t + i * 0.06, 0.35, { type: 'triangle', gain: 0.08 })) },
  sting_chrome: {
    dur: 1,
    play: (c: Ctx, t: number) => { bell(c, 1760, t, 0.9, 0.1); bell(c, 1764, t + 0.02, 0.9, 0.06); noise(c, t, 0.25, { gain: 0.06, lowpass: 12000, highpass: 5000 }); },
  },
  sting_gold: {
    dur: 1.8,
    play: (c: Ctx, t: number) => {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, f, t + i * 0.08, 0.6, { type: 'sawtooth', gain: 0.07 }));
      bell(c, 2093, t + 0.32, 1.4, 0.1);
      noise(c, t + 0.3, 1, { gain: 0.1, lowpass: 900 });
    },
  },
  sting_violet: {
    dur: 2.2,
    play: (c: Ctx, t: number) => {
      // A minor-ninth shimmer with a slow chorus: mysterious, not triumphant.
      [440, 523.25, 659.25, 987.77, 1046.5].forEach((f, i) => {
        tone(c, f, t + i * 0.1, 1.2, { type: 'triangle', gain: 0.07 });
        tone(c, f * 1.006, t + i * 0.1, 1.2, { type: 'sine', gain: 0.04 });
      });
      bell(c, 1975.5, t + 0.5, 1.6, 0.08);
    },
  },
  sting_rainbow: {
    dur: 2.9,
    play: (c: Ctx, t: number) => {
      // Upward glissando, a sparkle run, then a big major chord with the crowd.
      tone(c, 220, t, 0.7, { type: 'sawtooth', gain: 0.08, slideTo: 1760 });
      [1046.5, 1318.5, 1568, 2093, 2637, 3136].forEach((f, i) => tone(c, f, t + 0.45 + i * 0.05, 0.4, { type: 'triangle', gain: 0.06 }));
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f) => tone(c, f, t + 0.8, 1.8, { type: 'sawtooth', gain: 0.05 }));
      bell(c, 2093, t + 0.8, 2, 0.1);
      noise(c, t + 0.75, 2, { gain: 0.2, lowpass: 1000 });
    },
  },
  sting_cosmic: {
    dur: 3.7,
    play: (c: Ctx, t: number) => {
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
  },
  /** The suspense hum, rendered whole for native (6 s rise + a short tail). */
  hum_soft: { dur: 6.3, play: (c: Ctx, t: number) => humAt(c, t, false).stop(t + 6.3) },
  hum_strong: { dur: 6.3, play: (c: Ctx, t: number) => humAt(c, t, true).stop(t + 6.3) },
} satisfies Record<string, { dur: number; play: (c: Ctx, t: number) => void }>;

export type SoundName = keyof typeof SOUNDS;

/** One music note event (drums, bass, chord stabs) into `out`. */
export function voice(c: Ctx, out: AudioNode, e: NoteEvent, t: number, spb: number) {
  const end = t + e.len * spb;
  const env = (g: GainNode, peak: number, attack = 0.005) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
  };
  if (e.kind === 'kick') {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.2);
    env(g, 0.9);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(end + 0.05);
    return;
  }
  if (e.kind === 'snare' || e.kind === 'hat') {
    const dur = e.kind === 'snare' ? 0.16 : 0.04;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = e.kind === 'snare' ? 'bandpass' : 'highpass';
    f.frequency.value = e.kind === 'snare' ? 1800 : 7000;
    const g = c.createGain();
    g.gain.setValueAtTime(e.kind === 'snare' ? 0.35 : 0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t);
    return;
  }
  for (const n of e.notes) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = e.kind === 'bass' ? 'triangle' : 'sine';
    o.frequency.setValueAtTime(midiToHz(n), t);
    env(g, e.kind === 'bass' ? 0.32 : 0.06, e.kind === 'bass' ? 0.01 : 0.03);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(end + 0.05);
  }
}

/** The music bus: master gain into a lo-fi low-pass (darker on the menu). */
export function musicBus(c: Ctx, key: 'menu' | 'playoffs', out: AudioNode = c.destination) {
  const lofi = c.createBiquadFilter();
  lofi.type = 'lowpass';
  lofi.frequency.value = key === 'menu' ? 3200 : 6000;
  const master = c.createGain();
  master.gain.value = 0.28;
  master.connect(lofi).connect(out);
  return master;
}
