/**
 * Full-screen backgrounds drawn behind a Screen (see Screen's `backdrop`):
 *  - CourtBackdrop: a basketball room (navy arena ceiling, spotlights, hardwood floor). Career, Collection.
 *  - NebulaBackdrop: deep space in a card's own colors, with a fine starfield. A card up close, pack reveals.
 * Both cover the whole screen, including the notch area on phones.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { createRng } from '../engine/rng';
import { useReducedMotion } from './fx';
import { CourtArt } from './icons';

const native = Platform.OS !== 'web';

/** Relative luminance (0 dark .. 1 light) of a #RRGGBB color. */
function luma(hex: string): number {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  if (Number.isNaN(n)) return 0;
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** The color to glow with: the card's main color, unless it's too dark or too pale to show (then its trim, then `fallback`). */
export function glowColor(colors: readonly string[], fallback: string): string {
  return colors.find((c) => luma(c) > 0.12 && luma(c) < 0.92) ?? fallback;
}

/** A basketball room: a navy arena ceiling with two spotlights, fading into a lit hardwood floor with faint court lines. */
export function CourtBackdrop({ split = 0.3 }: { split?: number }) {
  const { width, height } = useWindowDimensions();
  const floorTop = Math.round(height * split);
  const ring = Math.min(width, 900) * 0.62;
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#101734', '#1C2A57', '#2B3E78']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: floorTop + 40 }} />
      <LinearGradient colors={['rgba(255,236,190,0.30)', 'rgba(255,236,190,0)']} style={[styles.beam, { left: '12%', height: floorTop + 120, transform: [{ rotate: '-16deg' }] }]} />
      <LinearGradient colors={['rgba(255,236,190,0.30)', 'rgba(255,236,190,0)']} style={[styles.beam, { right: '12%', height: floorTop + 120, transform: [{ rotate: '16deg' }] }]} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: floorTop, bottom: 0, overflow: 'hidden' }}>
        <View style={{ opacity: 0.85 }}><CourtArt width={width} height={height - floorTop} /></View>
        {/* Wash the planks toward cream so content stays easy to read. */}
        <LinearGradient colors={['rgba(255,244,230,0)', 'rgba(255,244,230,0.25)', 'rgba(255,244,230,0.55)']} style={StyleSheet.absoluteFill} />
        <View style={[styles.line, { top: 0, left: width / 2 - ring / 2, width: ring, height: ring, borderRadius: ring / 2, marginTop: -ring / 2 }]} />
        <View style={[styles.line, { top: 0, left: width / 2 - ring / 6, width: ring / 3, height: ring / 3, borderRadius: ring / 6, marginTop: -ring / 6 }]} />
      </View>
      {/* The floor's edge catches the light. */}
      <LinearGradient colors={['rgba(255,154,61,0)', 'rgba(255,154,61,0.55)', 'rgba(255,154,61,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', left: 0, right: 0, top: floorTop - 2, height: 4 }} />
    </View>
  );
}

/** A slow twinkle for a group of the brighter stars. */
function Twinkle({ children, delay, still }: { children: ReactNode; delay: number; still: boolean }) {
  const [v] = useState(() => new Animated.Value(still ? 1 : 0.35));
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      Animated.timing(v, { toValue: 0.35, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v, delay, still]);
  return <Animated.View style={[StyleSheet.absoluteFill, { opacity: v }]}>{children}</Animated.View>;
}

/**
 * Deep space in a card's colors: a soft nebula of the card's main color with its accent drifting beside it, a dark
 * base, and a fine starfield whose brighter stars twinkle. Clean: no shapes, no badges.
 */
export function NebulaBackdrop({ color, accent, seed = 'nebula', focusY = 0.32 }: { color: string; accent: string; seed?: string; focusY?: number }) {
  const { width, height } = useWindowDimensions();
  const still = useReducedMotion();
  const [stars] = useState(() => {
    const rng = createRng(`stars:${seed}`);
    return Array.from({ length: 150 }, () => ({
      x: rng.next(), y: rng.next(), r: rng.next() < 0.85 ? 0.5 + rng.next() * 0.8 : 1.3 + rng.next() * 0.9, o: 0.35 + rng.next() * 0.6, g: Math.floor(rng.next() * 3),
    }));
  });
  const cy = height * focusY;
  const field = (group: number) => (
    <Svg width={width} height={height}>
      {stars.filter((s) => s.g === group).map((s, i) => <Circle key={i} cx={s.x * width} cy={s.y * height} r={s.r} fill="#FFFFFF" opacity={s.o} />)}
    </Svg>
  );
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#04030F', '#0A0A24', '#05040F']} style={StyleSheet.absoluteFill} />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="core" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.8} />
            <Stop offset="0.45" stopColor={color} stopOpacity={0.32} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="drift" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={accent} stopOpacity={0.4} />
            <Stop offset="1" stopColor={accent} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="low" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.3} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={width * 0.5} cy={cy} rx={Math.max(width * 0.75, 320)} ry={height * 0.36} fill="url(#core)" />
        <Ellipse cx={width * 0.15} cy={cy + height * 0.24} rx={width * 0.6} ry={height * 0.2} fill="url(#drift)" />
        <Ellipse cx={width * 0.88} cy={cy - height * 0.14} rx={width * 0.45} ry={height * 0.16} fill="url(#drift)" />
        <Ellipse cx={width * 0.55} cy={height * 0.95} rx={width * 0.9} ry={height * 0.22} fill="url(#low)" />
      </Svg>
      <View style={StyleSheet.absoluteFill}>{field(0)}</View>
      <Twinkle delay={0} still={still}>{field(1)}</Twinkle>
      <Twinkle delay={900} still={still}>{field(2)}</Twinkle>
    </View>
  );
}

const styles = StyleSheet.create({
  beam: { position: 'absolute', top: -60, width: 150 },
  line: { position: 'absolute', borderWidth: 3, borderColor: 'rgba(255,255,255,0.55)' },
});
