/**
 * A soft full-screen background: a pastel gradient, a glow, and twinkling sparkles. Used behind the Collection
 * and behind a card up close (colored to match the card's tier). Light enough that dark text stays readable.
 * Sparkles sit still with reduced motion.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { Tier } from '../engine/collect/tiers';
import { createRng } from '../engine/rng';
import { useReducedMotion } from './fx';
import { CourtArt } from './icons';

const native = Platform.OS !== 'web';

export interface BackdropTheme {
  /** Gradient stops, top to bottom. */
  colors: [string, string, ...string[]];
  /** Sparkle colors (picked in turn). */
  sparkles: string[];
  /** The glow behind the focal point. */
  glow: string;
}

/** One palette per card tier: each tier's color as a soft, sparkly room. */
export const TIER_BACKDROP: Record<Tier, BackdropTheme> = {
  common: { colors: ['#E9EDF4', '#F4F6FA', '#FFF7EC'], sparkles: ['#AEB6C8', '#FFFFFF'], glow: 'rgba(174,182,200,0.45)' },
  uncommon: { colors: ['#CFF3E0', '#E9FBF1', '#FFF7EC'], sparkles: ['#3DDC84', '#FFFFFF', '#9BEFC4'], glow: 'rgba(61,220,132,0.4)' },
  rare: { colors: ['#CFDDFF', '#E7EEFF', '#FFF7EC'], sparkles: ['#4F8BFF', '#FFFFFF', '#A9C4FF'], glow: 'rgba(79,139,255,0.42)' },
  epic: { colors: ['#CDB3FF', '#E6D6FF', '#F7F1FF'], sparkles: ['#9B5CFF', '#FFFFFF', '#D9C2FF', '#7A4DFF'], glow: 'rgba(155,92,255,0.5)' },
  mythic: { colors: ['#FFD2C2', '#FFE7D6', '#FFF7EC'], sparkles: ['#FF7A45', '#FFB13B', '#FFFFFF'], glow: 'rgba(255,90,54,0.42)' },
  ultra: { colors: ['#FFE39A', '#FFF3CC', '#D2FBEF', '#D6E2FF'], sparkles: ['#F5C451', '#3DF2C2', '#4F8BFF', '#B26BFF', '#FFFFFF'], glow: 'rgba(245,196,81,0.55)' },
};

/** The Collection tab: a violet-to-blue card room with gold sparkles. */
export const COLLECTION_BACKDROP: BackdropTheme = {
  colors: ['#C9B8FF', '#DCD4FF', '#E6ECFF', '#FFF7EC'],
  sparkles: ['#7A4DFF', '#4F8BFF', '#F5C451', '#FFFFFF'],
  glow: 'rgba(122,77,255,0.32)',
};

function Sparkle({ x, y, size, color, delay, still }: { x: number; y: number; size: number; color: string; delay: number; still: boolean }) {
  const [v] = useState(() => new Animated.Value(still ? 0.75 : 0));
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      Animated.timing(v, { toValue: 0.15, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v, delay, still]);
  const fs = size * 3.2;
  return (
    <Animated.Text
      style={{
        position: 'absolute', left: x - fs / 2, top: y - fs / 2, fontSize: fs, lineHeight: fs * 1.1, color,
        textShadowColor: color, textShadowRadius: size * 1.5, textShadowOffset: { width: 0, height: 0 },
        opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.05] }) }],
      }}
    >
      ✦
    </Animated.Text>
  );
}

export function SparkleBackdrop({ theme, seed = 'room', count = 26, glowAt = 0.28 }: { theme: BackdropTheme; seed?: string; count?: number; glowAt?: number }) {
  const { width, height } = useWindowDimensions();
  const still = useReducedMotion();
  const [dots] = useState(() => {
    const rng = createRng(`sparkle:${seed}`);
    return Array.from({ length: count }, (_, i) => ({ fx: rng.next(), fy: rng.next() * 0.85, size: 3 + rng.next() * 6, color: theme.sparkles[i % theme.sparkles.length], delay: Math.floor(rng.next() * 2400) }));
  });
  const glow = Math.min(width, 700) * 0.9;
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={theme.colors} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', left: width / 2 - glow / 2, top: height * glowAt - glow / 2, width: glow, height: glow, borderRadius: glow / 2, backgroundColor: theme.glow, opacity: 0.55, shadowColor: theme.glow, shadowOpacity: 1, shadowRadius: 80, shadowOffset: { width: 0, height: 0 } }} />
      {dots.map((d, i) => <Sparkle key={i} x={d.fx * width} y={d.fy * height} size={d.size} color={d.color} delay={d.delay} still={still} />)}
    </View>
  );
}

/**
 * A basketball room: a navy arena ceiling with two spotlights, fading into a lit hardwood floor with faint court
 * lines. Covers the whole screen (including the notch area on iOS).
 */
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

const styles = StyleSheet.create({
  beam: { position: 'absolute', top: -60, width: 150 },
  line: { position: 'absolute', borderWidth: 3, borderColor: 'rgba(255,255,255,0.55)' },
});
