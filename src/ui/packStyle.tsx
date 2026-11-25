/**
 * Every pick type has its own pack: colours, a printed foil pattern, an emblem, rarity pips,
 * and for the top packs their own live effects (gold glints, rising embers, a holo sweep with lightning),
 * so a Legendary looks like a Legendary before it's opened.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import type { PickType } from '../engine/collect/picks';
import type { IconName } from './icons';

const native = Platform.OS !== 'web';

type Pattern = 'stripes' | 'planks' | 'bracket' | 'halftone' | 'rays' | 'flames' | 'stars';
type FX = 'none' | 'glints' | 'embers' | 'holo';

export const PACK_STYLE: Record<PickType, { colors: [string, string]; pattern: Pattern; emblem: IconName; pips: number; fx: FX }> = {
  daily: { colors: ['#4F8BFF', '#123A8A'], pattern: 'stripes', emblem: 'calendar', pips: 1, fx: 'none' },
  run: { colors: ['#C9D0DE', '#3A4256'], pattern: 'planks', emblem: 'ball', pips: 1, fx: 'none' },
  good: { colors: ['#2BC0E4', '#0E5A78'], pattern: 'stripes', emblem: 'hoop', pips: 2, fx: 'none' },
  playoffs: { colors: ['#3DDC84', '#0F6B3E'], pattern: 'bracket', emblem: 'medal', pips: 2, fx: 'none' },
  weekly: { colors: ['#B26BFF', '#4B1A7A'], pattern: 'halftone', emblem: 'star', pips: 3, fx: 'none' },
  confFinals: { colors: ['#FF7A45', '#7A2A0A'], pattern: 'bracket', emblem: 'medal', pips: 3, fx: 'none' },
  finals: { colors: ['#C0C8D8', '#3A4466'], pattern: 'rays', emblem: 'medal', pips: 4, fx: 'glints' },
  champion: { colors: ['#F5C451', '#8A5A00'], pattern: 'rays', emblem: 'trophy', pips: 4, fx: 'glints' },
  sweep: { colors: ['#FFD86B', '#B02A2A'], pattern: 'flames', emblem: 'trophy', pips: 5, fx: 'embers' },
  mythic: { colors: ['#FF5A36', '#7A1405'], pattern: 'flames', emblem: 'flame', pips: 5, fx: 'embers' },
  legendary: { colors: ['#FF5AC8', '#4F8BFF'], pattern: 'stars', emblem: 'crown', pips: 6, fx: 'holo' },
  ultimate: { colors: ['#FFFFFF', '#141414'], pattern: 'stars', emblem: 'crown', pips: 7, fx: 'holo' },
};

/** The printed pattern on the foil (white, low opacity, drawn in pack coordinates). */
export function PackPattern({ pattern, w, h }: { pattern: Pattern; w: number; h: number }) {
  const lines: React.ReactNode[] = [];
  switch (pattern) {
    case 'stripes':
      for (let x = -h; x < w; x += 14) lines.push(<Line key={x} x1={x} y1={h} x2={x + h} y2={0} stroke="#FFFFFF" strokeWidth={3} />);
      break;
    case 'planks':
      for (let x = 0; x < w; x += 21) {
        lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={h} stroke="#FFFFFF" strokeWidth={1.2} />);
        const off = (x * 37) % 90;
        for (let y = off; y < h; y += 90) lines.push(<Line key={`h${x}-${y}`} x1={x} y1={y} x2={x + 21} y2={y} stroke="#FFFFFF" strokeWidth={1.2} />);
      }
      break;
    case 'bracket': {
      // Two mirrored playoff brackets converging on the middle.
      const rows = [60, 100, 140, 180, 220, 260];
      for (const side of [0, 1]) {
        const x0 = side ? w - 8 : 8, dx = side ? -1 : 1;
        rows.forEach((y) => lines.push(<Line key={`${side}r${y}`} x1={x0} y1={y} x2={x0 + dx * 28} y2={y} stroke="#FFFFFF" strokeWidth={2} />));
        [[60, 100], [140, 180], [220, 260]].forEach(([a, b]) => {
          lines.push(<Path key={`${side}a${a}`} d={`M${x0 + dx * 28} ${a} V${b} M${x0 + dx * 28} ${(a + b) / 2} H${x0 + dx * 52}`} stroke="#FFFFFF" strokeWidth={2} fill="none" />);
        });
        lines.push(<Path key={`${side}f`} d={`M${x0 + dx * 52} 80 V240 M${x0 + dx * 52} 160 H${x0 + dx * 74}`} stroke="#FFFFFF" strokeWidth={2} fill="none" />);
      }
      break;
    }
    case 'halftone':
      for (let y = 8; y < h; y += 12) for (let x = 8 + ((y / 12) % 2) * 6; x < w; x += 12) {
        lines.push(<Circle key={`${x}-${y}`} cx={x} cy={y} r={0.8 + 2.6 * Math.abs(Math.sin((x + y) / 60))} fill="#FFFFFF" />);
      }
      break;
    case 'rays':
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        lines.push(<Line key={i} x1={w / 2} y1={h / 2} x2={w / 2 + Math.cos(a) * h} y2={h / 2 + Math.sin(a) * h} stroke="#FFFFFF" strokeWidth={i % 2 ? 2 : 6} />);
      }
      break;
    case 'flames':
      for (let i = 0; i < 7; i++) {
        const x = (i + 0.5) * (w / 7), top = h * (0.35 + ((i * 37) % 30) / 100);
        lines.push(<Path key={i} d={`M${x - 16} ${h} C${x - 20} ${h - 60} ${x + 12} ${top + 60} ${x} ${top} C${x + 22} ${top + 50} ${x + 24} ${h - 50} ${x + 16} ${h} Z`} fill="#FFFFFF" />);
      }
      break;
    case 'stars':
      for (let i = 0; i < 26; i++) {
        const x = (i * 53) % w, y = (i * 89) % h, s = 3 + (i % 4) * 2;
        lines.push(<Path key={i} d={`M${x} ${y - s} L${x + s * 0.25} ${y - s * 0.25} L${x + s} ${y} L${x + s * 0.25} ${y + s * 0.25} L${x} ${y + s} L${x - s * 0.25} ${y + s * 0.25} L${x - s} ${y} L${x - s * 0.25} ${y - s * 0.25} Z`} fill="#FFFFFF" />);
      }
      break;
  }
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <G opacity={pattern === 'flames' ? 0.13 : 0.16}>{lines}</G>
    </Svg>
  );
}

/** Rarity pips under the label: one to six diamonds. */
export function Pips({ n, color }: { n: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={{ width: 8, height: 8, transform: [{ rotate: '45deg' }], backgroundColor: i < n ? '#FFFFFF' : 'transparent', borderWidth: 1.5, borderColor: i < n ? color : 'rgba(255,255,255,0.45)' }} />
      ))}
    </View>
  );
}

function useLoop(duration: number, delay = 0) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: native }),
      Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: native }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v, duration, delay]);
  return v;
}

/** Gold glints popping on the foil (Champion). */
function Glint({ x, y, d }: { x: number; y: number; d: number }) {
  const v = useLoop(1600, d);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: x - 9, top: y - 9, width: 18, height: 18,
        opacity: v.interpolate({ inputRange: [0, 0.15, 0.35, 1], outputRange: [0, 1, 0, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 0.15, 0.35, 1], outputRange: [0.2, 1.2, 0.2, 0.2] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }],
      }}
    >
      <Svg width={18} height={18} viewBox="0 0 18 18"><Path d="M9 0 L10.6 7.4 L18 9 L10.6 10.6 L9 18 L7.4 10.6 L0 9 L7.4 7.4 Z" fill="#FFFBE0" /></Svg>
    </Animated.View>
  );
}

/** An ember rising off the pack (Mythic). */
function Ember({ x, d, dur }: { x: number; d: number; dur: number }) {
  const v = useLoop(dur, d);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: x, bottom: 20, width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFB13B',
        shadowColor: '#FF5A36', shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
        opacity: v.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 0.8, 0] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -340] }) },
          { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, (x % 2 ? 1 : -1) * 14, 0] }) },
        ],
      }}
    />
  );
}

/** A lightning crackle beside the pack (Legendary). */
function Bolt({ side, d }: { side: 1 | -1; d: number }) {
  const v = useLoop(2600, d);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', top: 40, [side > 0 ? 'right' : 'left']: -34, width: 40, height: 120,
        opacity: v.interpolate({ inputRange: [0, 0.04, 0.08, 0.12, 0.16, 1], outputRange: [0, 1, 0.2, 1, 0, 0] }),
        transform: [{ scaleX: side }],
      }}
    >
      <Svg width={40} height={120} viewBox="0 0 40 120">
        <Path d="M30 0 L14 46 L26 50 L8 120 L34 40 L22 36 L36 0 Z" fill="#E8F6FF" stroke="#8FE9FF" strokeWidth={2} />
      </Svg>
    </Animated.View>
  );
}

/** Effects that sit around the pack (outside the foil). */
export function PackAura({ fx, w, h }: { fx: FX; w: number; h: number }) {
  if (fx === 'embers') {
    return <View pointerEvents="none" style={StyleSheet.absoluteFill}>{[14, 40, 66, 92, 118, 150, 176, 196].map((x, i) => <Ember key={x} x={(x / 210) * w} d={i * 330} dur={2200 + (i % 3) * 500} />)}</View>;
  }
  if (fx === 'holo') return <View pointerEvents="none" style={StyleSheet.absoluteFill}><Bolt side={1} d={0} /><Bolt side={-1} d={1300} /></View>;
  if (fx === 'glints') {
    return <View pointerEvents="none" style={{ position: 'absolute', width: w, height: h }}>{[[30, 70, 0], [180, 90, 500], [40, 250, 900], [170, 240, 1300], [105, 150, 700]].map(([x, y, d]) => <Glint key={`${x}${y}`} x={x} y={y} d={d} />)}</View>;
  }
  return null;
}

/** Effects on the foil itself (inside the pack): the Legendary's sweeping holo colours. */
export function PackFoilFX({ fx }: { fx: FX }) {
  const v = useLoop(2600);
  if (fx !== 'holo') return null;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0.45, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-300, 300] }) }] }]}>
      <LinearGradient colors={['rgba(143,233,255,0)', 'rgba(143,233,255,0.9)', 'rgba(247,166,232,0.9)', 'rgba(255,229,138,0.9)', 'rgba(169,139,255,0)']} style={{ height: 300 }} />
    </Animated.View>
  );
}
