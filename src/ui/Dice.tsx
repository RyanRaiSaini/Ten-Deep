/**
 * Glossy isometric dice for rerolls: a real 3D cube (three shaded faces, pips laid on each face's plane, an ink
 * outline and a specular edge) drawn in a 100×100 box, plus composed piles for the shop bundles.
 */
import { memo } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

const INK = '#17121E';

/** Cube corners (top vertex, right, center, left, bottom-left, bottom, bottom-right). */
const T = [50, 6], R = [90, 27], Cn = [50, 48], L = [10, 27], BL = [10, 71], B = [50, 94], BR = [90, 71];
const pt = (p: number[]) => `${p[0]} ${p[1]}`;
const TOP = `M${pt(T)} L${pt(R)} L${pt(Cn)} L${pt(L)} Z`;
const LEFT = `M${pt(L)} L${pt(Cn)} L${pt(B)} L${pt(BL)} Z`;
const RIGHT = `M${pt(Cn)} L${pt(R)} L${pt(BR)} L${pt(B)} Z`;
const OUTLINE = `M${pt(T)} L${pt(R)} L${pt(BR)} L${pt(B)} L${pt(BL)} L${pt(L)} Z`;

/** Face planes as SVG matrices mapping the unit square onto the face. */
const plane = (o: number[], a: number[], b: number[]) => `matrix(${a[0] - o[0]} ${a[1] - o[1]} ${b[0] - o[0]} ${b[1] - o[1]} ${o[0]} ${o[1]})`;
const TOP_M = plane(L, T, Cn);
const LEFT_M = plane(L, Cn, BL);
const RIGHT_M = plane(Cn, R, B);

const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.27, 0.22], [0.27, 0.5], [0.27, 0.78], [0.73, 0.22], [0.73, 0.5], [0.73, 0.78]],
};

export interface DieStyle { face: string; side: string; shadow: string; pip: string }

export const DIE_STYLES = {
  white: { face: '#FFFFFF', side: '#E6E0EE', shadow: '#BDB3CC', pip: INK },
  purple: { face: '#B79BFF', side: '#7A4DFF', shadow: '#4C25C4', pip: '#FFFFFF' },
  red: { face: '#FF8A7A', side: '#E5484D', shadow: '#A61E2C', pip: '#FFFFFF' },
  gold: { face: '#FFE48A', side: '#F5B820', shadow: '#C27A00', pip: INK },
  blue: { face: '#8EC0FF', side: '#3B6CF0', shadow: '#1F3FA8', pip: '#FFFFFF' },
  green: { face: '#8EF0C4', side: '#18C08A', shadow: '#0B7D57', pip: '#FFFFFF' },
} satisfies Record<string, DieStyle>;
export type DieColor = keyof typeof DIE_STYLES;

function pips(n: number, m: string, color: string) {
  return (
    <G transform={m}>
      {PIPS[n].map(([u, v], i) => (
        <Ellipse key={i} cx={u} cy={v} rx={0.1} ry={0.1} fill={color} />
      ))}
    </G>
  );
}

/** One die in its own 100×100 space (place it with a transform). `faces` = [top, left, right] pip counts. */
export function DieShape({ color = 'white', faces = [5, 3, 2], id }: { color?: DieColor; faces?: [number, number, number]; id: string }) {
  const s = DIE_STYLES[color];
  return (
    <G>
      <Defs>
        <LinearGradient id={`${id}-t`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
          <Stop offset="0.45" stopColor={s.face} />
          <Stop offset="1" stopColor={s.face} />
        </LinearGradient>
        <LinearGradient id={`${id}-l`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={s.side} />
          <Stop offset="1" stopColor={s.shadow} stopOpacity={0.85} />
        </LinearGradient>
        <LinearGradient id={`${id}-r`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={s.shadow} />
          <Stop offset="1" stopColor={s.shadow} />
        </LinearGradient>
      </Defs>
      <Path d={TOP} fill={`url(#${id}-t)`} />
      <Path d={LEFT} fill={`url(#${id}-l)`} />
      <Path d={RIGHT} fill={`url(#${id}-r)`} />
      {pips(faces[0], TOP_M, s.pip)}
      <G opacity={0.92}>{pips(faces[1], LEFT_M, s.pip)}</G>
      <G opacity={0.85}>{pips(faces[2], RIGHT_M, s.pip)}</G>
      {/* Inner edges, a specular rim along the top-left edge, and the ink outline. */}
      <Path d={`M${pt(L)} L${pt(Cn)} L${pt(R)} M${pt(Cn)} L${pt(B)}`} stroke={INK} strokeOpacity={0.35} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <Path d={`M${L[0] + 6} ${L[1] - 1} L${T[0] - 2} ${T[1] + 5}`} stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={3.5} strokeLinecap="round" />
      <Path d={OUTLINE} stroke={INK} strokeWidth={5} strokeLinejoin="round" fill="none" />
    </G>
  );
}

/** A single die as an icon-sized element. */
export const Die = memo(function Die({ size = 48, color = 'white', faces }: { size?: number; color?: DieColor; faces?: [number, number, number] }) {
  return (
    <Svg width={size} height={size} viewBox="-4 -2 108 104">
      <DieShape color={color} faces={faces} id={`die-${color}`} />
    </Svg>
  );
});

type Placed = { x: number; y: number; s: number; color: DieColor; faces: [number, number, number]; tilt?: number };

/** Composed, depth-sorted piles (back to front) in a 200×150 box: nothing collides, everything reads. */
const PILES: Record<string, Placed[]> = {
  one: [{ x: 58, y: 22, s: 0.9, color: 'white', faces: [5, 3, 2] }],
  three: [
    { x: 28, y: 30, s: 0.72, color: 'blue', faces: [4, 2, 6], tilt: -8 },
    { x: 100, y: 30, s: 0.72, color: 'white', faces: [6, 1, 3], tilt: 8 },
    { x: 60, y: 54, s: 0.8, color: 'purple', faces: [5, 3, 2] },
  ],
  five: [
    { x: 36, y: 6, s: 0.6, color: 'white', faces: [3, 6, 2], tilt: -10 },
    { x: 102, y: 6, s: 0.6, color: 'blue', faces: [2, 4, 1], tilt: 10 },
    { x: 6, y: 58, s: 0.7, color: 'purple', faces: [4, 2, 6] },
    { x: 124, y: 58, s: 0.7, color: 'white', faces: [6, 1, 3] },
    { x: 60, y: 50, s: 0.82, color: 'red', faces: [5, 3, 2] },
  ],
  vault: [
    { x: 62, y: 0, s: 0.56, color: 'gold', faces: [1, 2, 3] },
    { x: 22, y: 30, s: 0.6, color: 'white', faces: [3, 6, 2], tilt: -8 },
    { x: 104, y: 30, s: 0.6, color: 'purple', faces: [2, 4, 1], tilt: 8 },
    { x: 0, y: 70, s: 0.64, color: 'blue', faces: [4, 2, 6] },
    { x: 130, y: 70, s: 0.64, color: 'red', faces: [6, 1, 3] },
    { x: 58, y: 62, s: 0.8, color: 'gold', faces: [5, 3, 2] },
  ],
};
export type PileKind = keyof typeof PILES;

export const DicePile = memo(function DicePile({ kind, width = 160, glow = '#FFFFFF' }: { kind: PileKind; width?: number; glow?: string }) {
  const dice = PILES[kind];
  return (
    <Svg width={width} height={(width * 150) / 200} viewBox="0 0 200 150">
      <Defs>
        <RadialGradient id={`glow-${kind}`} cx="0.5" cy="0.55" r="0.5">
          <Stop offset="0" stopColor={glow} stopOpacity={0.75} />
          <Stop offset="1" stopColor={glow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={100} cy={78} rx={98} ry={72} fill={`url(#glow-${kind})`} />
      <Ellipse cx={100} cy={142} rx={70} ry={7} fill={INK} opacity={0.18} />
      {dice.map((d, i) => (
        <G key={i} transform={`translate(${d.x} ${d.y}) rotate(${d.tilt ?? 0} ${50 * d.s} ${50 * d.s}) scale(${d.s})`}>
          <DieShape color={d.color} faces={d.faces} id={`p-${kind}-${i}`} />
        </G>
      ))}
      {kind === 'vault' && (
        <G fill="#FFFFFF">
          <Path d="M178 18 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" />
          <Path d="M20 22 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" />
          <Circle cx={160} cy={58} r={3} />
        </G>
      )}
    </Svg>
  );
});
