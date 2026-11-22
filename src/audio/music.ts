/**
 * Background music player (Web Audio). Schedules bars ~0.6s ahead with a lookahead timer so playback stays
 * tight even when the UI is busy. Web only for now; native audio arrives with the native build.
 */
import { TRACKS, barEvents, midiToHz, type NoteEvent, type Track } from './score';
import { audio } from './sfx';

export type TrackKey = keyof typeof TRACKS;

let current: TrackKey | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let master: GainNode | null = null;
let nextBarTime = 0;
let bar = 0;

function voice(c: AudioContext, out: AudioNode, e: NoteEvent, t: number, spb: number) {
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

function schedule(track: Track) {
  const c = audio();
  if (!c || !master) return;
  const spb = 60 / track.bpm;
  while (nextBarTime < c.currentTime + 0.6) {
    for (const e of barEvents(track, bar)) voice(c, master, e, nextBarTime + e.beat * spb, spb);
    nextBarTime += 4 * spb;
    bar++;
  }
}

export function startMusic(key: TrackKey) {
  if (current === key) return;
  stopMusic();
  const c = audio();
  if (!c) return;
  const lofi = c.createBiquadFilter();
  lofi.type = 'lowpass';
  lofi.frequency.value = key === 'menu' ? 3200 : 6000;
  master = c.createGain();
  master.gain.value = 0.28;
  master.connect(lofi).connect(c.destination);
  current = key;
  bar = 0;
  nextBarTime = c.currentTime + 0.1;
  const track = TRACKS[key];
  schedule(track);
  timer = setInterval(() => schedule(track), 150);
}

export function stopMusic() {
  if (timer) clearInterval(timer);
  timer = null;
  if (master) {
    const c = audio();
    if (c) master.gain.setTargetAtTime(0.0001, c.currentTime, 0.15);
    const old = master;
    setTimeout(() => old.disconnect(), 600);
  }
  master = null;
  current = null;
}
