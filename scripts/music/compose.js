/**
 * Ten Deep's music: original tracks composed in code and rendered offline (scripts/music/render.mts).
 * Plain browser JavaScript, run inside Chromium with an OfflineAudioContext. Nothing here ships in the app:
 * the app plays the rendered files.
 */
(() => {
  // ---------- notes & helpers ----------
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const N = (name) => {
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
    return 12 * (Number(m[3]) + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  };
  const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
  const notes = (s) => s.split(' ').map(N);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const vary = (v, amt = 0.15) => v * (1 - amt / 2 + rnd() * amt);

  function env(g, t, peak, attack, decayTo, decayTime) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, decayTo), t + attack + decayTime);
  }
  function noiseBuf(c, dur) {
    const b = c.createBuffer(1, Math.max(1, Math.ceil(c.sampleRate * dur)), c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
    return b;
  }
  const NB = new Map();
  const noise = (c, dur) => { const k = Math.round(dur * 100); if (!NB.has(k)) NB.set(k, noiseBuf(c, dur)); const s = c.createBufferSource(); s.buffer = NB.get(k); return s; };
  function filt(c, type, f, q = 0.7) { const x = c.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; }
  const satCurve = (() => { const n = 1024; const a = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; a[i] = Math.tanh(x * 2.2); } return a; })();

  // ---------- mixer ----------
  function mixer(c, { tone = 18000, reverb = 0.25, revTime = 2.2, delay = 0 } = {}) {
    const master = c.createGain(); master.gain.value = 0.9;
    const lp = filt(c, 'lowpass', tone, 0.5);
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 3.5; comp.attack.value = 0.006; comp.release.value = 0.18;
    const out = c.createGain(); out.gain.value = 1;
    master.connect(lp).connect(comp).connect(out).connect(c.destination);
    // Reverb: decaying stereo noise impulse.
    const conv = c.createConvolver();
    const len = Math.floor(c.sampleRate * revTime);
    const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * (1 - i / len) ** 3; }
    conv.buffer = ir;
    const revOut = c.createGain(); revOut.gain.value = reverb;
    conv.connect(filt(c, 'highpass', 250)).connect(revOut).connect(master);
    // Tempo delay (set per track).
    let dl = null;
    if (delay) {
      dl = c.createDelay(2); dl.delayTime.value = delay;
      const fb = c.createGain(); fb.gain.value = 0.32;
      const dlOut = c.createGain(); dlOut.gain.value = 0.5;
      dl.connect(filt(c, 'lowpass', 3500)).connect(fb).connect(dl);
      dl.connect(dlOut).connect(master);
    }
    const bus = (gain, pan = 0, rev = 0, del = 0) => {
      const g = c.createGain(); g.gain.value = gain;
      const p = c.createStereoPanner(); p.pan.value = pan;
      g.connect(p).connect(master);
      if (rev) { const s = c.createGain(); s.gain.value = rev; p.connect(s).connect(conv); }
      if (del && dl) { const s = c.createGain(); s.gain.value = del; p.connect(s).connect(dl); }
      return g;
    };
    /** Sidechain-style pump: duck a bus on every beat. */
    const pump = (g, t, beats, spb, depth = 0.6) => {
      const base = g.gain.value;
      for (let i = 0; i < beats; i++) {
        const b = t + i * spb;
        g.gain.setValueAtTime(base * (1 - depth), b);
        g.gain.linearRampToValueAtTime(base, b + spb * 0.55);
      }
    };
    return { bus, pump, out };
  }

  // ---------- drums ----------
  const D = {
    kick(c, o, t, v = 1, tight = false) {
      const os = c.createOscillator(); const g = c.createGain();
      os.frequency.setValueAtTime(tight ? 180 : 150, t); os.frequency.exponentialRampToValueAtTime(tight ? 55 : 46, t + 0.1);
      env(g, t, v, 0.002, 0.001, tight ? 0.28 : 0.42);
      os.connect(g).connect(o); os.start(t); os.stop(t + 0.5);
      const n = noise(c, 0.02); const ng = c.createGain(); env(ng, t, 0.25 * v, 0.001, 0.001, 0.015);
      n.connect(filt(c, 'highpass', 1500)).connect(ng).connect(o); n.start(t);
    },
    snare(c, o, t, v = 1, long = false) {
      const n = noise(c, 0.35); const g = c.createGain(); env(g, t, 0.55 * v, 0.001, 0.001, long ? 0.32 : 0.18);
      n.connect(filt(c, 'bandpass', 1900, 0.6)).connect(g).connect(o); n.start(t);
      const os = c.createOscillator(); os.type = 'triangle'; const tg = c.createGain();
      os.frequency.setValueAtTime(210, t); os.frequency.exponentialRampToValueAtTime(150, t + 0.08);
      env(tg, t, 0.45 * v, 0.001, 0.001, 0.12); os.connect(tg).connect(o); os.start(t); os.stop(t + 0.2);
    },
    clap(c, o, t, v = 1) {
      const n = noise(c, 0.4); const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      [0, 0.011, 0.023].forEach((d) => { g.gain.setValueAtTime(0.7 * v, t + d); g.gain.exponentialRampToValueAtTime(0.08 * v, t + d + 0.009); });
      g.gain.setValueAtTime(0.5 * v, t + 0.032); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
      n.connect(filt(c, 'bandpass', 1150, 1.1)).connect(g).connect(o); n.start(t);
    },
    hat(c, o, t, v = 1, open = false) {
      const n = noise(c, 0.4); const g = c.createGain(); env(g, t, 0.32 * v, 0.001, 0.001, open ? 0.3 : 0.035);
      n.connect(filt(c, 'highpass', 7500)).connect(filt(c, 'peaking', 10000, 1)).connect(g).connect(o); n.start(t);
    },
    shaker(c, o, t, v = 1) {
      const n = noise(c, 0.1); const g = c.createGain(); env(g, t, 0.18 * v, 0.012, 0.001, 0.05);
      n.connect(filt(c, 'bandpass', 6500, 1.5)).connect(g).connect(o); n.start(t);
    },
    rim(c, o, t, v = 1) {
      const os = c.createOscillator(); os.type = 'square'; os.frequency.value = 1750; const g = c.createGain();
      env(g, t, 0.18 * v, 0.001, 0.001, 0.03); os.connect(filt(c, 'bandpass', 1750, 4)).connect(g).connect(o); os.start(t); os.stop(t + 0.06);
    },
    tom(c, o, t, f, v = 1) {
      const os = c.createOscillator(); const g = c.createGain();
      os.frequency.setValueAtTime(f * 1.6, t); os.frequency.exponentialRampToValueAtTime(f, t + 0.08);
      env(g, t, 0.7 * v, 0.002, 0.001, 0.45); os.connect(g).connect(o); os.start(t); os.stop(t + 0.5);
    },
    crash(c, o, t, v = 1) {
      const n = noise(c, 2.2); const g = c.createGain(); env(g, t, 0.28 * v, 0.002, 0.001, 2);
      n.connect(filt(c, 'highpass', 4500)).connect(g).connect(o); n.start(t);
    },
    riser(c, o, t, dur, v = 1) {
      const n = noise(c, dur); const f = filt(c, 'bandpass', 300, 2); const g = c.createGain();
      f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35 * v, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.02);
      n.connect(f).connect(g).connect(o); n.start(t);
    },
    crackle(c, o, t, dur) {
      const b = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate); const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (rnd() < 0.0007 ? (rnd() * 2 - 1) * 0.7 : 0) + (rnd() * 2 - 1) * 0.012;
      const s = c.createBufferSource(); s.buffer = b; s.connect(filt(c, 'bandpass', 3000, 0.4)).connect(o); s.start(t);
    },
  };

  // ---------- instruments ----------
  const I = {
    /** Electric piano: sine + bell partial, tremolo, soft decay. */
    rhodes(c, o, t, ns, len, v = 1) {
      for (const n of ns) {
        const f = hz(n) * (1 + (rnd() - 0.5) * 0.002);
        const g = c.createGain(); env(g, t, 0.11 * v, 0.004, 0.025 * v, Math.max(0.3, len));
        g.gain.setTargetAtTime(0.0001, t + len, 0.18);
        const trem = c.createOscillator(); trem.frequency.value = 4.8; const tg = c.createGain(); tg.gain.value = 0.025 * v; trem.connect(tg).connect(g.gain);
        const a = c.createOscillator(); a.frequency.value = f;
        const b = c.createOscillator(); b.frequency.value = f * 4.01; const bg = c.createGain(); env(bg, t, 0.25, 0.002, 0.001, 0.25);
        a.connect(g); b.connect(bg).connect(g); g.connect(o);
        [a, b, trem].forEach((x) => { x.start(t); x.stop(t + len + 1); });
      }
    },
    /** Piano-ish: triangle with harmonics, fast attack, long exponential decay. */
    piano(c, o, t, ns, len, v = 1) {
      for (const n of ns) {
        const f = hz(n); const g = c.createGain();
        env(g, t, 0.13 * v, 0.003, 0.0001, Math.min(2.2, len + 0.8));
        const lp = filt(c, 'lowpass', 2800 + n * 15, 0.3);
        [[f, 'triangle', 1], [f * 2, 'sine', 0.25], [f * 3.01, 'sine', 0.08]].forEach(([fr, type, amp]) => {
          const os = c.createOscillator(); os.type = type; os.frequency.value = fr; const og = c.createGain(); og.gain.value = amp;
          os.connect(og).connect(lp); os.start(t); os.stop(t + len + 1.2);
        });
        lp.connect(g).connect(o);
      }
    },
    /** Warm pad: detuned saws, slow attack, low-pass. */
    pad(c, o, t, ns, len, v = 1, bright = 1400) {
      for (const n of ns) {
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035 * v, t + Math.min(0.6, len * 0.4));
        g.gain.setValueAtTime(0.035 * v, t + len); g.gain.linearRampToValueAtTime(0.0001, t + len + 0.7);
        const lp = filt(c, 'lowpass', bright, 0.4);
        [-8, 8].forEach((cents) => {
          const os = c.createOscillator(); os.type = 'sawtooth'; os.frequency.value = hz(n); os.detune.value = cents;
          os.connect(lp); os.start(t); os.stop(t + len + 0.8);
        });
        lp.connect(g).connect(o);
      }
    },
    /** Strings: like a pad with vibrato and a softer, slower swell. */
    strings(c, o, t, ns, len, v = 1) {
      for (const n of ns) {
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03 * v, t + Math.min(0.9, len * 0.5));
        g.gain.setValueAtTime(0.03 * v, t + len); g.gain.linearRampToValueAtTime(0.0001, t + len + 0.9);
        const lp = filt(c, 'lowpass', 2200, 0.3);
        const vib = c.createOscillator(); vib.frequency.value = 5.2; const vg = c.createGain(); vg.gain.value = 6; vib.connect(vg);
        [-5, 6, 0].forEach((cents, i) => {
          const os = c.createOscillator(); os.type = i === 2 ? 'triangle' : 'sawtooth'; os.frequency.value = hz(n) * (i === 2 ? 0.5 : 1); os.detune.value = cents;
          vg.connect(os.detune); os.connect(lp); os.start(t); os.stop(t + len + 1);
        });
        vib.start(t); vib.stop(t + len + 1);
        lp.connect(g).connect(o);
      }
    },
    /** Pluck: bright saw through a closing filter. */
    pluck(c, o, t, n, v = 1, dec = 0.25, wave = 'sawtooth') {
      const os = c.createOscillator(); os.type = wave; os.frequency.value = hz(n);
      const lp = filt(c, 'lowpass', 4500, 2); lp.frequency.setValueAtTime(4500, t); lp.frequency.exponentialRampToValueAtTime(350, t + dec);
      const g = c.createGain(); env(g, t, 0.09 * v, 0.002, 0.0001, dec + 0.1);
      os.connect(lp).connect(g).connect(o); os.start(t); os.stop(t + dec + 0.2);
    },
    /** Clav: short square chords with a quick filter blip. */
    clav(c, o, t, ns, v = 1) { for (const n of ns) I.pluck(c, o, t, n, 0.7 * v, 0.12, 'square'); },
    /** Brass stab: saws with a filter that opens fast. */
    brass(c, o, t, ns, len, v = 1) {
      for (const n of ns) {
        const lp = filt(c, 'lowpass', 600, 1.5); lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(2800, t + 0.05); lp.frequency.exponentialRampToValueAtTime(1300, t + 0.3);
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06 * v, t + 0.025);
        g.gain.setValueAtTime(0.05 * v, t + len); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.15);
        [-6, 6].forEach((d) => { const os = c.createOscillator(); os.type = 'sawtooth'; os.frequency.value = hz(n); os.detune.value = d; os.connect(lp); os.start(t); os.stop(t + len + 0.3); });
        lp.connect(g).connect(o);
      }
    },
    /** Lead: square/saw with delayed vibrato and optional glide from the previous note. */
    lead(c, o, t, n, len, v = 1, wave = 'square', from = null) {
      const os = c.createOscillator(); os.type = wave;
      if (from != null) { os.frequency.setValueAtTime(hz(from), t); os.frequency.exponentialRampToValueAtTime(hz(n), t + 0.07); } else os.frequency.value = hz(n);
      const vib = c.createOscillator(); vib.frequency.value = 5.6; const vg = c.createGain();
      vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(12, t + Math.min(0.4, len)); vib.connect(vg).connect(os.detune);
      const lp = filt(c, 'lowpass', 2600, 1);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.055 * v, t + 0.012);
      g.gain.setValueAtTime(0.05 * v, t + len * 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.08);
      os.connect(lp).connect(g).connect(o); [os, vib].forEach((x) => { x.start(t); x.stop(t + len + 0.15); });
    },
    /** 808: saturated sine with a little pitch punch and optional glide. */
    bass808(c, o, t, n, len, v = 1, glideTo = null) {
      const os = c.createOscillator(); const f = hz(n);
      os.frequency.setValueAtTime(f * 1.5, t); os.frequency.exponentialRampToValueAtTime(f, t + 0.03);
      if (glideTo != null) { os.frequency.setValueAtTime(f, t + len * 0.6); os.frequency.exponentialRampToValueAtTime(hz(glideTo), t + len * 0.85); }
      const sh = c.createWaveShaper(); sh.curve = satCurve;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.55 * v, t + 0.005);
      g.gain.setValueAtTime(0.5 * v, t + len); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.08);
      os.connect(sh).connect(filt(c, 'lowpass', 900)).connect(g).connect(o); os.start(t); os.stop(t + len + 0.1);
    },
    /** Round sub bass (lo-fi / cinematic). */
    sub(c, o, t, n, len, v = 1) {
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.42 * v, t + 0.01);
      g.gain.setValueAtTime(0.36 * v, t + len); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.1);
      [['triangle', 1], ['sine', 0.6]].forEach(([type, a]) => { const os = c.createOscillator(); os.type = type; os.frequency.value = hz(n); const og = c.createGain(); og.gain.value = a; os.connect(og).connect(g); os.start(t); os.stop(t + len + 0.12); });
      g.connect(filt(c, 'lowpass', 700)).connect(o);
    },
    /** Funk / synth bass: saw with a snappy resonant filter. */
    synthBass(c, o, t, n, len, v = 1, snap = 2400) {
      const os = c.createOscillator(); os.type = 'sawtooth'; os.frequency.value = hz(n);
      const lp = filt(c, 'lowpass', snap, 7); lp.frequency.setValueAtTime(snap, t); lp.frequency.exponentialRampToValueAtTime(220, t + 0.16);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.32 * v, t + 0.004);
      g.gain.setValueAtTime(0.28 * v, t + len); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.05);
      os.connect(lp).connect(g).connect(o); os.start(t); os.stop(t + len + 0.08);
    },
  };

  // ---------- sequencing ----------
  /** Run `fn(step, char, time)` for each non-dot in a 16-step pattern, with optional swing on off-16ths. */
  function steps(pat, t0, spb, fn, swing = 0) {
    const p = pat.replace(/\s/g, '');
    for (let i = 0; i < p.length; i++) {
      if (p[i] === '.') continue;
      fn(i, p[i], t0 + i * (spb / 4) + (i % 2 ? swing * (spb / 4) : 0));
    }
  }
  const acc = (ch) => (ch === 'X' ? 1 : ch === 'x' ? 0.8 : ch === 'o' ? 0.45 : 0.3);

  // ---------- tracks ----------
  const TRACKS = {};

  /** 1. Shootaround: lo-fi hip-hop. Rhodes, vinyl, swung boom-bap. */
  TRACKS.shootaround = {
    title: 'Shootaround', style: 'Lo-fi hip-hop · chill', bpm: 84, bars: 16,
    mix: { tone: 6500, reverb: 0.22 },
    play(c, m, t0, spb) {
      const sw = 0.33;
      const drums = m.bus(0.9), keys = m.bus(0.9, -0.15, 0.35), bass = m.bus(0.85), mel = m.bus(0.8, 0.2, 0.45), vinyl = m.bus(0.6);
      const prog = [
        { b: N('D2'), ch: notes('F3 A3 C4 E4') }, { b: N('G2'), ch: notes('F3 B3 E4') },
        { b: N('C2'), ch: notes('E3 G3 B3 D4') }, { b: N('A2'), ch: notes('G3 Bb3 C#4 E4') },
      ];
      const melody = [[0, 'A4', 3], [3, 'C5', 1], [4, 'D5', 2], [6, 'E5', 2], [10, 'D5', 2], [12, 'C5', 4],
        [16, 'B4', 3], [19, 'D5', 1], [20, 'E5', 4], [26, 'D5', 2], [28, 'C#5', 4]];
      D.crackle(c, vinyl, t0, this.bars * 4 * spb + 1);
      for (let bar = 0; bar < this.bars; bar++) {
        const t = t0 + bar * 4 * spb, ch = prog[bar % 4];
        steps(bar % 4 === 3 ? 'X.....x...x..x..' : 'X.....x...X.....', t, spb, (i, k, tt) => D.kick(c, drums, tt, vary(acc(k))), sw);
        steps('....X.......X..o', t, spb, (i, k, tt) => D.snare(c, drums, tt, vary(acc(k))), sw);
        steps('x.o.x.o.x.o.x.oo', t, spb, (i, k, tt) => D.hat(c, drums, tt, vary(acc(k) * 0.7)), sw);
        I.rhodes(c, keys, t, ch.ch, spb * 1.6, vary(0.9));
        I.rhodes(c, keys, t + spb * 1.5 + sw * spb / 4, ch.ch.slice(1), spb * 0.9, vary(0.55));
        I.rhodes(c, keys, t + spb * 3, ch.ch, spb * 0.9, vary(0.5));
        steps('X.........x.....', t, spb, (i, k, tt) => I.sub(c, bass, tt, ch.b, i ? spb * 1.4 : spb * 2.3), sw);
        if (bar >= 8) for (const [s, n, l] of melody) {
          const local = s - ((bar - 8) % 2) * 16;
          if (local >= 0 && local < 16) I.rhodes(c, mel, t + local * spb / 4, [N(n)], l * spb / 4, 0.85);
        }
      }
    },
  };

  /** 2. Primetime: funk/disco. Four on the floor, octave bass, clav, brass. */
  TRACKS.primetime = {
    title: 'Primetime', style: 'Funk / disco · upbeat', bpm: 112, bars: 24,
    mix: { reverb: 0.16 },
    play(c, m, t0, spb) {
      const drums = m.bus(0.85), bass = m.bus(0.8), clav = m.bus(0.7, 0.3, 0.1), brass = m.bus(0.75, -0.25, 0.3), pad = m.bus(0.6, 0, 0.4);
      const A = [{ b: N('E2'), ch: notes('G3 B3 D4 F#4') }, { b: N('E2'), ch: notes('G3 B3 D4 F#4') }, { b: N('A2'), ch: notes('G3 C#4 F#4') }, { b: N('A2'), ch: notes('G3 C#4 F#4') }];
      const B = [{ b: N('C3'), ch: notes('E3 G3 B3 D4') }, { b: N('B2'), ch: notes('D3 F#3 A3 C#4') }, { b: N('A2'), ch: notes('C4 E4 G4') }, { b: N('B2'), ch: notes('D#3 A3 B3 F#4') }];
      for (let bar = 0; bar < this.bars; bar++) {
        const t = t0 + bar * 4 * spb, sec = bar >= 8 && bar < 16 ? B : A, ch = sec[bar % 4];
        steps('X...X...X...X...', t, spb, (i, k, tt) => D.kick(c, drums, tt, 0.95, true));
        steps('....X.......X...', t, spb, (i, k, tt) => D.clap(c, drums, tt, 0.85));
        steps('..X...X...X...X.', t, spb, (i, k, tt) => D.hat(c, drums, tt, 0.6, true));
        steps('xoxoxoxoxoxoxoxo', t, spb, (i, k, tt) => D.shaker(c, drums, tt, acc(k)));
        steps('x..x.xx.x..x.x.x', t, spb, (i, k, tt) => I.synthBass(c, bass, tt, ch.b + (i % 3 === 2 ? 12 : 0), spb * 0.22, vary(0.9)));
        steps('...x..x....x..x.', t, spb, (i, k, tt) => I.clav(c, clav, tt, ch.ch, vary(0.8)));
        if (sec === B) I.pad(c, pad, t, ch.ch, spb * 4, 0.8, 1800);
        if (bar % 4 === 3 || sec === B && bar % 2 === 1) steps('X.........X.....', t, spb, (i, k, tt) => I.brass(c, brass, tt, ch.ch.map((n) => n + 12), spb * (i ? 0.9 : 0.4), 0.9));
        if (bar === 7 || bar === 15) D.crash(c, drums, t + 4 * spb, 0.8);
      }
    },
  };

  /** 3. Tip-Off: trap. 808 glides, hat rolls, dark plucks. */
  TRACKS.tipoff = {
    title: 'Tip-Off', style: 'Trap · hard-hitting', bpm: 140, bars: 24,
    mix: { reverb: 0.2, delayBeats: 0.75 },
    play(c, m, t0, spb) {
      const drums = m.bus(0.85), b808 = m.bus(0.8), arp = m.bus(0.55, 0.25, 0.3, 0.35), pad = m.bus(0.6, 0, 0.5), lead = m.bus(0.7, -0.15, 0.35, 0.3);
      const prog = [{ r: N('A1'), ch: notes('A3 C4 E4') }, { r: N('F1'), ch: notes('F3 A3 C4') }, { r: N('C2'), ch: notes('G3 C4 E4') }, { r: N('E1'), ch: notes('G#3 B3 E4') }];
      const hook = [[0, 'E5', 2], [2, 'C5', 2], [4, 'B4', 4], [10, 'A4', 2], [12, 'C5', 2], [14, 'E5', 2]];
      for (let bar = 0; bar < this.bars; bar++) {
        const t = t0 + bar * 4 * spb, ch = prog[Math.floor(bar / 2) % 4];
        const full = bar >= 4;
        if (full) {
          steps('X......X..X.....', t, spb, (i, k, tt) => D.kick(c, drums, tt, 0.9));
          steps('........X.......', t, spb, (i, k, tt) => { D.clap(c, drums, tt, 0.9); D.snare(c, drums, tt, 0.5); });
          const roll = bar % 2 === 1;
          steps(roll ? 'x.x.x.x.x.x.xxxx' : 'x.x.x.xxx.x.x.x.', t, spb, (i, k, tt) => D.hat(c, drums, tt, i % 4 ? 0.45 : 0.7));
          if (roll) for (let r = 0; r < 6; r++) D.hat(c, drums, t + 3 * spb + r * spb / 6, 0.3 + r * 0.05);
          steps('X......X..X.....', t, spb, (i, k, tt) => I.bass808(c, b808, tt, ch.r, i === 10 ? spb * 1.3 : spb * 1.6, 0.95, i === 10 && bar % 2 ? ch.r + 7 : null));
        }
        const arpNotes = [...ch.ch, ...ch.ch.map((n) => n + 12)];
        for (let s = 0; s < 16; s++) I.pluck(c, arp, t + s * spb / 4, arpNotes[(s * 2) % arpNotes.length] + (s % 8 === 7 ? 12 : 0), vary(0.7), 0.2);
        if (bar % 2 === 0) I.pad(c, pad, t, ch.ch.map((n) => n - 12), spb * 8, 0.8, 900);
        if (bar >= 12) for (const [s, n, l] of hook) I.lead(c, lead, t + s * spb / 4, N(n), l * spb / 4, 0.8, 'sawtooth');
        if (bar === 3 || bar === 11) D.riser(c, drums, t, 4 * spb, 0.7);
        if (bar === 4 || bar === 12) D.crash(c, drums, t, 0.7);
      }
    },
  };

  /** 4. Courtside: chill synthwave. Pumping pads, arps, gated snare. */
  TRACKS.courtside = {
    title: 'Courtside', style: 'Synthwave · smooth', bpm: 100, bars: 24,
    mix: { reverb: 0.3, delayBeats: 0.75 },
    play(c, m, t0, spb) {
      const drums = m.bus(0.8), pad = m.bus(0.75, 0, 0.35), arp = m.bus(0.5, 0.3, 0.2, 0.4), bass = m.bus(0.75), lead = m.bus(0.65, -0.2, 0.4, 0.45);
      const prog = [{ b: N('F2'), ch: notes('F3 A3 C4 E4') }, { b: N('E2'), ch: notes('E3 G3 B3 D4') }, { b: N('D2'), ch: notes('D3 F3 A3 C4') }, { b: N('C2'), ch: notes('C3 E3 G3 B3') }];
      const melody = [[0, 'A4', 6], [6, 'G4', 2], [8, 'E4', 8], [16, 'F4', 4], [20, 'E4', 4], [24, 'D4', 4], [28, 'G4', 4]];
      m.pump(pad, t0, this.bars * 4, spb, 0.65);
      for (let bar = 0; bar < this.bars; bar++) {
        const t = t0 + bar * 4 * spb, ch = prog[bar % 4];
        I.pad(c, pad, t, ch.ch, spb * 4, 0.9, 1600);
        steps('X.......X.X.....', t, spb, (i, k, tt) => D.kick(c, drums, tt, 0.85));
        steps('....X.......X...', t, spb, (i, k, tt) => D.snare(c, drums, tt, 0.8, true));
        steps('x.x.x.x.x.x.x.x.', t, spb, (i, k, tt) => D.hat(c, drums, tt, i % 4 === 2 ? 0.6 : 0.35));
        steps('x.xxx.xxx.xxx.xx', t, spb, (i, k, tt) => I.synthBass(c, bass, tt, ch.b + (i % 4 === 2 ? 12 : 0), spb * 0.2, 0.7, 1300));
        const up = [...ch.ch, ...ch.ch.map((n) => n + 12)];
        for (let s = 0; s < 16; s++) I.pluck(c, arp, t + s * spb / 4, up[s % up.length], 0.6, 0.18, 'square');
        if (bar >= 8) for (const [s, n, l] of melody) {
          const local = s - ((bar - 8) % 2) * 16;
          if (local >= 0 && local < 16) I.lead(c, lead, t + local * spb / 4, N(n) + 12, l * spb / 4, 0.75, 'sawtooth');
        }
      }
    },
  };

  /** 5. Arena: big-room house. Piano stabs, claps, a singalong hook. */
  TRACKS.arena = {
    title: 'Arena', style: 'House · big & bright', bpm: 124, bars: 24,
    mix: { reverb: 0.22, delayBeats: 0.5 },
    play(c, m, t0, spb) {
      const drums = m.bus(0.85), piano = m.bus(0.85, -0.1, 0.25), bass = m.bus(0.75), pad = m.bus(0.55, 0, 0.4), lead = m.bus(0.7, 0.15, 0.35, 0.3);
      const prog = [{ b: N('A1'), ch: notes('E4 A4 C5') }, { b: N('F1'), ch: notes('F4 A4 C5') }, { b: N('C2'), ch: notes('E4 G4 C5') }, { b: N('G1'), ch: notes('D4 G4 B4') }];
      const hook = [[0, 'E5', 3], [3, 'E5', 3], [6, 'D5', 2], [8, 'C5', 3], [11, 'D5', 3], [14, 'E5', 2]];
      m.pump(pad, t0, this.bars * 4, spb, 0.7); m.pump(bass, t0, this.bars * 4, spb, 0.5);
      for (let bar = 0; bar < this.bars; bar++) {
        const t = t0 + bar * 4 * spb, ch = prog[bar % 4], drop = bar >= 8;
        steps('X...X...X...X...', t, spb, (i, k, tt) => D.kick(c, drums, tt, 1, true));
        steps('....X.......X...', t, spb, (i, k, tt) => D.clap(c, drums, tt, 0.9));
        steps('..X...X...X...X.', t, spb, (i, k, tt) => D.hat(c, drums, tt, 0.55, true));
        if (drop) steps('x.x.x.x.x.x.x.x.', t, spb, (i, k, tt) => D.hat(c, drums, tt, 0.3));
        steps('X..x..X...X..x..', t, spb, (i, k, tt) => I.piano(c, piano, tt, ch.ch, spb * 0.5, k === 'X' ? 0.95 : 0.7));
        steps('..X...X...X...X.', t, spb, (i, k, tt) => I.synthBass(c, bass, tt, ch.b + 12, spb * 0.4, 0.85, 1600));
        I.pad(c, pad, t, ch.ch.map((n) => n - 12), spb * 4, 0.8, 2000);
        if (drop) for (const [s, n, l] of hook) I.lead(c, lead, t + s * spb / 4, N(n), l * spb / 4, 0.8, 'square');
        if (bar === 7) D.riser(c, drums, t, 4 * spb, 0.9);
        if (bar === 8 || bar === 16) D.crash(c, drums, t, 0.9);
      }
    },
  };

  /** 6. Clutch Time: tense and driving, for the playoffs. */
  TRACKS.clutch = {
    title: 'Clutch Time', style: 'Tense · driving (playoffs)', bpm: 128, bars: 24,
    mix: { reverb: 0.24 },
    play(c, m, t0, spb) {
      const drums = m.bus(0.85), bass = m.bus(0.8), str = m.bus(0.7, -0.2, 0.3), stab = m.bus(0.6, 0.25, 0.25), clock = m.bus(0.6, 0.35), pad = m.bus(0.55, 0, 0.45);
      const prog = [{ b: N('D2'), ch: notes('D4 F4 A4') }, { b: N('Bb1'), ch: notes('D4 F4 Bb4') }, { b: N('G1'), ch: notes('D4 G4 Bb4') }, { b: N('A1'), ch: notes('C#4 E4 A4') }];
      for (let bar = 0; bar < this.bars; bar++) {
        const t = t0 + bar * 4 * spb, ch = prog[bar % 4], big = bar >= 8;
        steps('xoxoxoxoxoxoxoxo', t, spb, (i, k, tt) => D.rim(c, clock, tt, acc(k) * 0.8));
        steps('xxxxxxxxxxxxxxxx', t, spb, (i, k, tt) => I.synthBass(c, bass, tt, ch.b + (i % 8 === 6 ? 12 : 0), spb * 0.18, i % 4 ? 0.6 : 0.95, 900));
        steps(big ? 'X..X..X...X..X..' : 'X.......X.......', t, spb, (i, k, tt) => D.kick(c, drums, tt, 0.95));
        if (big) steps('....X.......X...', t, spb, (i, k, tt) => { D.snare(c, drums, tt, 0.9, true); D.clap(c, drums, tt, 0.5); });
        steps('x.x.x.x.x.x.x.x.', t, spb, (i, k, tt) => I.brass(c, stab, tt, ch.ch, spb * 0.18, 0.7));
        if (big) I.strings(c, str, t, ch.ch.map((n) => n + 12), spb * 4, 0.9);
        else I.pad(c, pad, t, ch.ch.map((n) => n - 12), spb * 4, 0.8, 800);
        if (bar % 4 === 3) steps('........X.X.XXXX', t, spb, (i, k, tt) => D.tom(c, drums, tt, 90 + i * 6, 0.6));
        if (bar === 8 || bar === 16) D.crash(c, drums, t, 0.9);
        if (bar === 7) D.riser(c, drums, t, 4 * spb, 0.8);
      }
    },
  };

  /** 7. Draft Night: cinematic hip-hop. Piano, strings, boom-bap. */
  TRACKS.draftnight = {
    title: 'Draft Night', style: 'Cinematic hip-hop · confident', bpm: 88, bars: 16,
    mix: { reverb: 0.3 },
    play(c, m, t0, spb) {
      const sw = 0.2;
      const drums = m.bus(0.85), piano = m.bus(0.85, -0.1, 0.35), str = m.bus(0.65, 0.15, 0.45), bass = m.bus(0.8);
      const prog = [{ b: N('Bb1'), ch: notes('Bb3 D4 F4') }, { b: N('F2'), ch: notes('A3 C4 F4') }, { b: N('G2'), ch: notes('Bb3 D4 G4') }, { b: N('Eb2'), ch: notes('Bb3 Eb4 G4') }];
      for (let bar = 0; bar < this.bars; bar++) {
        const t = t0 + bar * 4 * spb, ch = prog[bar % 4], full = bar >= 4;
        const arp = [ch.ch[0] - 12, ch.ch[0], ch.ch[1], ch.ch[2], ch.ch[1] + 12, ch.ch[2], ch.ch[1], ch.ch[0]];
        arp.forEach((n, i) => I.piano(c, piano, t + i * spb / 2, [n], spb * 0.9, i === 0 ? 0.9 : 0.6));
        I.strings(c, str, t, ch.ch.map((n) => n + 12), spb * 4, full ? 1 : 0.7);
        if (full) {
          steps('X.....x...X..x..', t, spb, (i, k, tt) => D.kick(c, drums, tt, acc(k)), sw);
          steps('....X.......X...', t, spb, (i, k, tt) => D.snare(c, drums, tt, 0.9, true), sw);
          steps('x.x.x.x.x.x.x.x.', t, spb, (i, k, tt) => D.hat(c, drums, tt, i % 4 ? 0.3 : 0.5), sw);
          steps('X.....x...X.....', t, spb, (i, k, tt) => I.sub(c, bass, tt, ch.b, spb * 1.4));
        }
        if (bar === 4 || bar === 12) D.crash(c, drums, t, 0.7);
        if (bar === 3) D.riser(c, drums, t + 2 * spb, 2 * spb, 0.6);
      }
    },
  };

  /** Render one track into an OfflineAudioContext; `tail` adds a fade-out (previews) or wraps it (loops). */
  async function render(key, { sampleRate = 44100, preview = true } = {}) {
    seed = 7; NB.clear();
    const tr = TRACKS[key];
    const spb = 60 / tr.bpm;
    const len = tr.bars * 4 * spb;
    const pre = preview ? 0 : 4 * spb; // loops: a pre-roll bar whose tails wrap into bar 0
    const tail = preview ? 2.5 : 0;
    const c = new OfflineAudioContext(2, Math.ceil((pre + len + tail) * sampleRate), sampleRate);
    const mx = tr.mix ?? {};
    const m = mixer(c, { ...mx, delay: mx.delayBeats ? mx.delayBeats * spb : 0 });
    if (!preview) {
      // Pre-roll: play the last bar's worth of music before t=pre so its tails are captured at the loop start.
      tr.play(c, m, pre - len, spb);
    }
    tr.play(c, m, pre, spb);
    if (preview) { m.out.gain.setValueAtTime(1, pre + len - 0.5); m.out.gain.linearRampToValueAtTime(0, pre + len + tail); }
    const buf = await c.startRendering();
    const start = Math.round(pre * sampleRate), end = start + Math.round((len + tail) * sampleRate);
    return { L: buf.getChannelData(0).slice(start, end), R: buf.getChannelData(1).slice(start, end), sampleRate, seconds: len };
  }

  window.Music = { TRACKS, render, list: () => Object.entries(TRACKS).map(([k, v]) => ({ key: k, title: v.title, style: v.style, bpm: v.bpm, seconds: (v.bars * 4 * 60) / v.bpm })) };
})();
