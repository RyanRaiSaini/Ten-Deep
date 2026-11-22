/**
 * Original background music as data: chord progressions + drum patterns. Pure (no audio APIs) so it's testable;
 * src/audio/music.ts turns bars into Web Audio notes.
 */
export type EventKind = 'kick' | 'snare' | 'hat' | 'bass' | 'chord';

export interface NoteEvent {
  kind: EventKind;
  /** Position within the bar, in beats (0–4). */
  beat: number;
  /** Length in beats. */
  len: number;
  /** MIDI notes (bass: one, chord: several, drums: none). */
  notes: number[];
}

export interface Track {
  name: string;
  bpm: number;
  /** One chord per bar: root MIDI note + chord tones as intervals. */
  progression: { root: number; tones: number[] }[];
  kicks: number[];
  snares: number[];
  hats: number[];
  /** Bass rhythm (beats) — plays the chord root an octave down. */
  bass: number[];
  /** Chord stabs (beats) and their length. */
  stabs: number[];
  stabLen: number;
}

const MIN7 = [0, 3, 7, 10];
const MAJ7 = [0, 4, 7, 11];
const DOM9 = [0, 4, 10, 14];

export const TRACKS: Record<'menu' | 'playoffs', Track> = {
  /** Laid-back lo-fi groove: Dm9 – G13 – Cmaj7 – Am7. */
  menu: {
    name: 'Shootaround',
    bpm: 88,
    progression: [
      { root: 62, tones: [0, 3, 7, 10, 14] },
      { root: 55, tones: DOM9 },
      { root: 60, tones: MAJ7 },
      { root: 57, tones: MIN7 },
    ],
    kicks: [0, 1.75, 2.5],
    snares: [1, 3],
    hats: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
    bass: [0, 1.75, 2.5],
    stabs: [0, 2.75],
    stabLen: 1.25,
  },
  /** Tense, driving minor loop for the playoffs: Em – C – D – Bm. */
  playoffs: {
    name: 'Win or Go Home',
    bpm: 116,
    progression: [
      { root: 64, tones: MIN7 },
      { root: 60, tones: MAJ7 },
      { root: 62, tones: [0, 4, 7] },
      { root: 59, tones: MIN7 },
    ],
    kicks: [0, 1, 2, 2.75, 3],
    snares: [1, 3],
    hats: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75],
    bass: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
    stabs: [0, 1.5, 3],
    stabLen: 0.5,
  },
};

export function barEvents(track: Track, bar: number): NoteEvent[] {
  const chord = track.progression[bar % track.progression.length];
  const ev: NoteEvent[] = [];
  for (const b of track.kicks) ev.push({ kind: 'kick', beat: b, len: 0.25, notes: [] });
  for (const b of track.snares) ev.push({ kind: 'snare', beat: b, len: 0.25, notes: [] });
  for (const b of track.hats) ev.push({ kind: 'hat', beat: b, len: 0.1, notes: [] });
  for (const b of track.bass) ev.push({ kind: 'bass', beat: b, len: 0.45, notes: [chord.root - 24] });
  for (const b of track.stabs) ev.push({ kind: 'chord', beat: b, len: track.stabLen, notes: chord.tones.map((i) => chord.root + i) });
  return ev;
}

export const midiToHz = (m: number) => 440 * 2 ** ((m - 69) / 12);
