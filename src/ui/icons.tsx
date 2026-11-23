/** Sticker-style icons (48×48, ink outlines) that replace emoji across the game. */
import type { ReactElement } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { C, FONT } from './theme';

export type IconName =
  | 'flame' | 'trophy' | 'gear' | 'ball' | 'cards' | 'calendar' | 'crown' | 'clipboard' | 'gift' | 'chart'
  | 'vs' | 'siren' | 'briefcase' | 'back' | 'star' | 'lock' | 'check' | 'bolt' | 'hoop' | 'history' | 'clock'
  | 'medal' | 'brain' | 'swap' | 'play' | 'sound' | 'globe' | 'shield' | 'news' | 'sparkle' | 'freeze';

const K = C.ink;
const SW = 3;

const PATHS: Record<IconName, ReactElement> = {
  flame: (
    <G>
      <Path d="M24 4 C30 14 38 18 38 30 C38 39 32 45 24 45 C16 45 10 39 10 30 C10 22 16 18 17 10 C20 14 21 17 21 20 C23 16 24 10 24 4 Z" fill="#FF7A1A" stroke={K} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M24 24 C28 29 31 31 31 36 C31 40 28 43 24 43 C20 43 17 40 17 36 C17 32 21 30 24 24 Z" fill="#FFD23F" />
    </G>
  ),
  trophy: (
    <G>
      <Path d="M14 8 H34 V20 C34 27 30 31 24 31 C18 31 14 27 14 20 Z" fill="#FFC53D" stroke={K} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M14 12 H8 C8 20 11 23 15 23 M34 12 H40 C40 20 37 23 33 23" fill="none" stroke={K} strokeWidth={SW} strokeLinecap="round" />
      <Path d="M21 31 H27 L28 37 H20 Z" fill="#F0A500" stroke={K} strokeWidth={SW} strokeLinejoin="round" />
      <Rect x={14} y={37} width={20} height={6} rx={2} fill="#7A4DFF" stroke={K} strokeWidth={SW} />
      <Path d="M19 12 L19 20" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
    </G>
  ),
  gear: (
    <G>
      <Path d="M21 4 H27 L28 10 L33 12 L38 8 L42 12 L38 17 L40 22 L46 23 V29 L40 30 L38 35 L42 40 L38 44 L33 40 L28 42 L27 46 H21 L20 42 L15 40 L10 44 L6 40 L10 35 L8 30 L2 29 V23 L8 22 L10 17 L6 12 L10 8 L15 12 L20 10 Z" fill="#C9CED8" stroke={K} strokeWidth={SW} strokeLinejoin="round" transform="translate(0 -1)" />
      <Circle cx={24} cy={25} r={7} fill="#fff" stroke={K} strokeWidth={SW} />
    </G>
  ),
  ball: (
    <G>
      <Circle cx={24} cy={24} r={19} fill="#FF7A1A" stroke={K} strokeWidth={SW} />
      <Path d="M5 24 H43 M24 5 V43 M11 10 C18 18 18 30 11 38 M37 10 C30 18 30 30 37 38" fill="none" stroke={K} strokeWidth={2.4} />
      <Path d="M14 14 C17 11 20 10 23 10" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.5} fill="none" />
    </G>
  ),
  cards: (
    <G>
      <Rect x={6} y={12} width={22} height={30} rx={4} fill="#12B5C2" stroke={K} strokeWidth={SW} transform="rotate(-12 17 27)" />
      <Rect x={20} y={8} width={22} height={30} rx={4} fill="#7A4DFF" stroke={K} strokeWidth={SW} transform="rotate(10 31 23)" />
      <Path d="M31 17 L33 22 L38 22 L34 25 L36 30 L31 27 L26 30 L28 25 L24 22 L29 22 Z" fill="#FFD23F" stroke={K} strokeWidth={1.5} strokeLinejoin="round" transform="rotate(10 31 23)" />
    </G>
  ),
  calendar: (
    <G>
      <Rect x={6} y={9} width={36} height={33} rx={6} fill="#fff" stroke={K} strokeWidth={SW} />
      <Path d="M6 15 C6 11 9 9 12 9 H36 C39 9 42 11 42 15 V19 H6 Z" fill="#2F6BFF" stroke={K} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M15 5 V12 M33 5 V12" stroke={K} strokeWidth={SW} strokeLinecap="round" />
      <Path d="M16 30 L22 35 L32 25" fill="none" stroke="#0FA876" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
  crown: (
    <G>
      <Path d="M6 16 L15 24 L24 9 L33 24 L42 16 L38 38 H10 Z" fill="#FFC53D" stroke={K} strokeWidth={SW} strokeLinejoin="round" />
      <Circle cx={24} cy={30} r={3.5} fill="#EE3B4F" stroke={K} strokeWidth={2} />
    </G>
  ),
  clipboard: (
    <G>
      <Rect x={9} y={8} width={30} height={36} rx={5} fill="#fff" stroke={K} strokeWidth={SW} />
      <Rect x={17} y={4} width={14} height={8} rx={3} fill="#2F6BFF" stroke={K} strokeWidth={SW} />
      <Path d="M15 22 L20 27 L30 17" fill="none" stroke="#2F6BFF" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M15 35 H33" stroke={C.line} strokeWidth={3} strokeLinecap="round" />
    </G>
  ),
  gift: (
    <G>
      <Rect x={7} y={18} width={34} height={25} rx={4} fill="#FF4F9E" stroke={K} strokeWidth={SW} />
      <Rect x={5} y={13} width={38} height={9} rx={3} fill="#FF7AB6" stroke={K} strokeWidth={SW} />
      <Path d="M24 13 V43" stroke="#FFD23F" strokeWidth={5} />
      <Path d="M24 13 C18 3 10 7 14 12 C16 14 21 13 24 13 C27 13 32 14 34 12 C38 7 30 3 24 13 Z" fill="#FFD23F" stroke={K} strokeWidth={2.5} strokeLinejoin="round" />
    </G>
  ),
  chart: (
    <G>
      <Rect x={7} y={26} width={9} height={16} rx={2} fill="#12B5C2" stroke={K} strokeWidth={SW} />
      <Rect x={20} y={16} width={9} height={26} rx={2} fill="#FF7A1A" stroke={K} strokeWidth={SW} />
      <Rect x={33} y={7} width={9} height={35} rx={2} fill="#7A4DFF" stroke={K} strokeWidth={SW} />
    </G>
  ),
  vs: (
    <G>
      <Path d="M24 4 L41 10 V24 C41 34 33 41 24 45 C15 41 7 34 7 24 V10 Z" fill="#FFC53D" stroke={K} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M24 8 L37 13 V24 C37 32 31 37 24 40 Z" fill="#F0A500" />
      <SvgText x={24} y={31} fontSize={17} fontFamily={FONT.display} fill="#fff" stroke={K} strokeWidth={1.4} textAnchor="middle">VS</SvgText>
    </G>
  ),
  siren: (
    <G>
      <Path d="M12 38 V26 C12 18 17 13 24 13 C31 13 36 18 36 26 V38 Z" fill="#EE3B4F" stroke={K} strokeWidth={SW} strokeLinejoin="round" />
      <Rect x={8} y={37} width={32} height={7} rx={2} fill="#45404F" stroke={K} strokeWidth={SW} />
      <Path d="M19 24 C19 21 21 19 24 19" stroke="#fff" strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.7} />
      <Path d="M24 3 V8 M8 10 L11 13 M40 10 L37 13 M3 24 H7 M45 24 H41" stroke="#FFC53D" strokeWidth={3} strokeLinecap="round" />
    </G>
  ),
  briefcase: (
    <G>
      <Rect x={5} y={14} width={38} height={27} rx={5} fill="#8B5A2B" stroke={K} strokeWidth={SW} />
      <Path d="M17 14 V10 C17 8 18 7 20 7 H28 C30 7 31 8 31 10 V14" fill="none" stroke={K} strokeWidth={SW} />
      <Path d="M5 24 H43" stroke={K} strokeWidth={SW} />
      <Rect x={20} y={21} width={8} height={7} rx={2} fill="#FFC53D" stroke={K} strokeWidth={2.5} />
    </G>
  ),
  back: <Path d="M30 10 L16 24 L30 38" fill="none" stroke={K} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />,
  star: <Path d="M24 4 L30 17 L44 18 L33 27 L37 41 L24 33 L11 41 L15 27 L4 18 L18 17 Z" fill="#FFC53D" stroke={K} strokeWidth={SW} strokeLinejoin="round" />,
  lock: (
    <G>
      <Path d="M15 21 V15 C15 10 19 6 24 6 C29 6 33 10 33 15 V21" fill="none" stroke={K} strokeWidth={4} />
      <Rect x={10} y={20} width={28} height={23} rx={5} fill="#C9CED8" stroke={K} strokeWidth={SW} />
      <Circle cx={24} cy={31} r={3.5} fill={K} />
    </G>
  ),
  check: (
    <G>
      <Circle cx={24} cy={24} r={19} fill="#0FA876" stroke={K} strokeWidth={SW} />
      <Path d="M15 24 L21 30 L33 18" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
  bolt: <Path d="M28 3 L10 27 H22 L19 45 L38 19 H26 Z" fill="#2F9BFF" stroke={K} strokeWidth={SW} strokeLinejoin="round" />,
  hoop: (
    <G>
      <Rect x={6} y={3} width={36} height={24} rx={4} fill="#fff" stroke={K} strokeWidth={SW} />
      <Rect x={16} y={11} width={16} height={12} rx={1} fill="none" stroke="#EE3B4F" strokeWidth={2.5} />
      <Path d="M12 27 H36 L33 44 H15 Z M18 27 L21 44 M24 27 V44 M30 27 L27 44 M13 33 H35 M14 39 H34" fill="#fff" stroke={K} strokeWidth={2} strokeLinejoin="round" />
      <Rect x={10} y={25} width={28} height={4} rx={2} fill="#FF7A1A" stroke={K} strokeWidth={2.5} />
    </G>
  ),
  history: (
    <G>
      <Path d="M8 10 H40 V40 C40 42 38 44 36 44 H12 C10 44 8 42 8 40 Z" fill="#F5E6C8" stroke={K} strokeWidth={SW} strokeLinejoin="round" />
      <Rect x={5} y={5} width={38} height={8} rx={4} fill="#C58B47" stroke={K} strokeWidth={SW} />
      <Path d="M15 22 H33 M15 29 H33 M15 36 H27" stroke="#8B5A2B" strokeWidth={3} strokeLinecap="round" />
    </G>
  ),
  clock: (
    <G>
      <Circle cx={24} cy={24} r={19} fill="#FFC53D" stroke={K} strokeWidth={SW} />
      <Circle cx={24} cy={24} r={14} fill="#fff" />
      <Path d="M24 14 V24 L31 28" fill="none" stroke={K} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
  medal: (
    <G>
      <Path d="M14 4 L24 20 L34 4" fill="none" stroke="#2F6BFF" strokeWidth={6} strokeLinejoin="round" />
      <Circle cx={24} cy={30} r={13} fill="#FFC53D" stroke={K} strokeWidth={SW} />
      <Path d="M24 22 L26 27 L31 27 L27 31 L29 36 L24 33 L19 36 L21 31 L17 27 L22 27 Z" fill="#fff" />
    </G>
  ),
  brain: (
    <G>
      <Path d="M24 8 C18 3 9 7 10 14 C4 16 4 26 10 28 C9 36 17 41 24 37 C31 41 39 36 38 28 C44 26 44 16 38 14 C39 7 30 3 24 8 Z" fill="#FF8FC2" stroke={K} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M24 9 V37 M16 18 C19 18 20 21 20 23 M32 18 C29 18 28 21 28 23 M15 29 C18 28 20 30 20 32 M33 29 C30 28 28 30 28 32" fill="none" stroke={K} strokeWidth={2.4} strokeLinecap="round" />
    </G>
  ),
  swap: (
    <G>
      <Path d="M8 17 H36 L29 10 M40 31 H12 L19 38" fill="none" stroke={K} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 17 H36 L29 10 M40 31 H12 L19 38" fill="none" stroke="#12B5C2" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
  play: <Path d="M14 7 L40 24 L14 41 Z" fill="#fff" stroke={K} strokeWidth={SW} strokeLinejoin="round" />,
  sound: (
    <G>
      <Path d="M6 18 H14 L25 8 V40 L14 30 H6 Z" fill="#fff" stroke={K} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M31 17 C34 20 34 28 31 31 M36 12 C42 18 42 30 36 36" fill="none" stroke={K} strokeWidth={SW} strokeLinecap="round" />
    </G>
  ),
  globe: (
    <G>
      <Circle cx={24} cy={24} r={19} fill="#4FB6FF" stroke={K} strokeWidth={SW} />
      <Path d="M14 12 C20 14 18 20 13 22 C10 24 11 30 15 31 M30 8 C27 13 33 16 36 15 M28 40 C27 34 33 31 38 33" fill="#3FBF6A" stroke={K} strokeWidth={2} strokeLinejoin="round" />
    </G>
  ),
  shield: <Path d="M24 4 L41 10 V24 C41 34 33 41 24 45 C15 41 7 34 7 24 V10 Z" fill="#7A4DFF" stroke={K} strokeWidth={SW} strokeLinejoin="round" />,
  news: (
    <G>
      <Rect x={5} y={8} width={34} height={33} rx={4} fill="#fff" stroke={K} strokeWidth={SW} />
      <Path d="M39 16 H43 V37 C43 39 41 41 39 41" fill="#E8DECF" stroke={K} strokeWidth={SW} strokeLinejoin="round" />
      <Rect x={10} y={14} width={24} height={8} rx={1} fill="#EE3B4F" />
      <Path d="M10 28 H34 M10 34 H26" stroke={K} strokeWidth={2.6} strokeLinecap="round" />
    </G>
  ),
  freeze: (
    <G>
      <Circle cx={24} cy={24} r={20} fill="#BFE6FF" stroke={K} strokeWidth={SW} />
      <Path d="M24 9 V39 M11 16.5 L37 31.5 M11 31.5 L37 16.5 M20 11 L24 15 L28 11 M20 37 L24 33 L28 37" fill="none" stroke="#2F6BFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
  sparkle: <Path d="M24 4 C26 16 32 22 44 24 C32 26 26 32 24 44 C22 32 16 26 4 24 C16 22 22 16 24 4 Z" fill="#FFD23F" stroke={K} strokeWidth={SW} strokeLinejoin="round" />,
};

export function Icon({ name, size = 28 }: { name: IconName; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {PATHS[name]}
    </Svg>
  );
}

/** A hardwood court band (planks + court lines) for headers, tinted with a team or mode color. */
export function CourtArt({ width, height, color = C.hardwood, color2 }: { width: number; height: number; color?: string; color2?: string }) {
  const planks = Math.ceil(width / 34);
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <Rect width={width} height={height} fill="#E9A15C" />
      {Array.from({ length: planks }, (_, i) => (
        <Rect key={i} x={i * 34} y={0} width={34} height={height} fill={i % 2 ? '#E39652' : '#EDAA66'} />
      ))}
      <Rect width={width} height={height} fill={color} opacity={0.82} />
      {color2 && <Path d={`M0 ${height} L${width} 0 L${width} ${height} Z`} fill={color2} opacity={0.35} />}
      <G stroke="#fff" strokeOpacity={0.4} strokeWidth={3} fill="none">
        <Circle cx={width / 2} cy={height} r={Math.min(110, height * 0.9)} />
        <Circle cx={width / 2} cy={height} r={Math.min(36, height * 0.3)} />
        <Path d={`M${width / 2} 0 V${height}`} />
        <Path d={`M-40 ${height * 0.1} A ${height * 0.9} ${height * 0.9} 0 0 1 -40 ${height * 1.9}`} />
        <Rect x={-4} y={height * 0.35} width={width * 0.14} height={height * 0.5} />
        <Rect x={width - width * 0.14 + 4} y={height * 0.35} width={width * 0.14} height={height * 0.5} />
        <Ellipse cx={width * 0.14} cy={height * 0.6} rx={height * 0.18} ry={height * 0.18} />
        <Ellipse cx={width * 0.86} cy={height * 0.6} rx={height * 0.18} ry={height * 0.18} />
      </G>
    </Svg>
  );
}
