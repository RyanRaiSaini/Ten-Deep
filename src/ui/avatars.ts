/**
 * 40 original avatars: 8 basketball poses × 5 color palettes.
 * Drawn from joint coordinates (100×100 canvas) as bold rounded strokes — stylized figures, no real likenesses.
 */
type Pt = [number, number];
export type Joint = 'head' | 'neck' | 'hip' | 'lElbow' | 'lHand' | 'rElbow' | 'rHand' | 'lKnee' | 'lFoot' | 'rKnee' | 'rFoot';

export interface Pose {
  label: string;
  joints: Record<Joint, Pt>;
  ball?: Pt;
  /** Legend crown / rookie headband. */
  extra?: 'crown' | 'headband';
}

export const POSES: Record<string, Pose> = {
  'floor-general': {
    label: 'Floor General',
    joints: { head: [50, 20], neck: [50, 31], hip: [50, 58], lElbow: [36, 44], lHand: [30, 34], rElbow: [62, 46], rHand: [66, 62], lKnee: [41, 74], lFoot: [36, 92], rKnee: [59, 74], rFoot: [64, 92] },
    ball: [68, 80],
  },
  sharpshooter: {
    label: 'Sharpshooter',
    joints: { head: [50, 26], neck: [50, 36], hip: [50, 62], lElbow: [40, 26], lHand: [46, 12], rElbow: [62, 24], rHand: [56, 11], lKnee: [44, 77], lFoot: [42, 94], rKnee: [56, 77], rFoot: [58, 94] },
    ball: [51, 7],
  },
  slasher: {
    label: 'Slasher',
    joints: { head: [60, 22], neck: [56, 32], hip: [46, 56], lElbow: [44, 42], lHand: [30, 46], rElbow: [70, 40], rHand: [80, 50], lKnee: [32, 68], lFoot: [20, 82], rKnee: [58, 72], rFoot: [62, 92] },
    ball: [84, 56],
  },
  'big-man': {
    label: 'Big Man',
    joints: { head: [50, 18], neck: [50, 28], hip: [50, 60], lElbow: [34, 20], lHand: [30, 6], rElbow: [66, 20], rHand: [70, 6], lKnee: [42, 76], lFoot: [38, 95], rKnee: [58, 76], rFoot: [62, 95] },
  },
  lockdown: {
    label: 'Lockdown',
    joints: { head: [50, 30], neck: [50, 40], hip: [50, 62], lElbow: [30, 48], lHand: [16, 44], rElbow: [70, 48], rHand: [84, 44], lKnee: [34, 76], lFoot: [26, 94], rKnee: [66, 76], rFoot: [74, 94] },
  },
  dunker: {
    label: 'High Flyer',
    joints: { head: [46, 30], neck: [48, 40], hip: [52, 64], lElbow: [40, 50], lHand: [36, 60], rElbow: [62, 26], rHand: [72, 12], lKnee: [40, 76], lFoot: [46, 92], rKnee: [64, 72], rFoot: [60, 88] },
    ball: [76, 8],
  },
  legend: {
    label: 'Legend',
    joints: { head: [50, 26], neck: [50, 37], hip: [50, 63], lElbow: [36, 50], lHand: [32, 64], rElbow: [64, 50], rHand: [68, 64], lKnee: [44, 79], lFoot: [42, 95], rKnee: [56, 79], rFoot: [58, 95] },
    extra: 'crown',
  },
  rookie: {
    label: 'Rookie',
    joints: { head: [50, 24], neck: [50, 35], hip: [50, 61], lElbow: [38, 48], lHand: [44, 58], rElbow: [62, 48], rHand: [56, 58], lKnee: [44, 78], lFoot: [42, 95], rKnee: [56, 78], rFoot: [58, 95] },
    ball: [50, 60],
    extra: 'headband',
  },
};

export interface Palette {
  id: string;
  bg: string;
  body: string;
  jersey: string;
  number: string;
}

export const PALETTES: Palette[] = [
  { id: 'hardwood', bg: '#E8833A', body: '#0B1020', jersey: '#F4F6FB', number: '#E8833A' },
  { id: 'neon', bg: '#3DF2C2', body: '#0B1020', jersey: '#141B2E', number: '#3DF2C2' },
  { id: 'royal', bg: '#3B5BFF', body: '#0B1020', jersey: '#F5C451', number: '#0B1020' },
  { id: 'crimson', bg: '#FF5C6C', body: '#141B2E', jersey: '#F4F6FB', number: '#FF5C6C' },
  { id: 'gold', bg: '#F5C451', body: '#0B1020', jersey: '#0B1020', number: '#F5C451' },
];

export interface AvatarDef {
  id: string;
  pose: string;
  palette: Palette;
  number: number;
}

const NUMBERS = [0, 1, 2, 3, 6, 7, 8, 11, 13, 23, 24, 30, 32, 33, 34, 35];

export const AVATARS: AvatarDef[] = Object.keys(POSES).flatMap((pose, pi) =>
  PALETTES.map((palette, ci) => ({ id: `${pose}-${palette.id}`, pose, palette, number: NUMBERS[(pi * 5 + ci) % NUMBERS.length] })),
);

export function avatarById(id: string): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
