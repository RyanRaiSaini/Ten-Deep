/**
 * Background music. The web schedules bars ~0.6s ahead with a lookahead timer so playback stays tight even when
 * the UI is busy; iOS/Android loop the same tracks pre-rendered to files (audio/native.ts).
 */
import * as native from './native';
import { TRACKS, barEvents, type Track } from './score';
import { audio } from './sfx';
import { musicBus, voice } from './synth';

export type TrackKey = keyof typeof TRACKS;

let current: TrackKey | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let master: GainNode | null = null;
let nextBarTime = 0;
let bar = 0;

function schedule(track: Track) {
  const c = audio();
  if (!c || !master) return;
  const spb = 60 / track.bpm;
  // If the timer was throttled (background tab, busy thread), skip missed bars instead of cramming them in.
  if (nextBarTime < c.currentTime) nextBarTime = c.currentTime + 0.05;
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
  if (!c) {
    native.startMusic(key);
    current = key;
    return;
  }
  master = musicBus(c, key);
  current = key;
  bar = 0;
  nextBarTime = c.currentTime + 0.1;
  const track = TRACKS[key];
  schedule(track);
  timer = setInterval(() => schedule(track), 150);
}

export function stopMusic() {
  native.stopMusic();
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
