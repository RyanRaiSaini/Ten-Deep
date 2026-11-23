/**
 * Card finishes: foil frames, sheen overlays and a finish ribbon, layered on a CollectCard.
 * Static in grids (cheap); `animate` adds a moving shine sweep for reveals and the card detail page.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ONE_IN, type Finish } from '../engine/collect/finishes';
import { Text } from './Text';
import { C, FONT } from './theme';

export { FINISH_STYLE } from './finishStyle';
import { FINISH_STYLE } from './finishStyle';

const STARS = Array.from({ length: 26 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 61) % 140, r: 0.6 + ((i * 13) % 5) * 0.25 }));

/** The sheen over the card art (placed inside the card's inner area). */
export function FinishOverlay({ finish, animate = false }: { finish: Finish; animate?: boolean }) {
  const s = FINISH_STYLE[finish];
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animate || finish === 'base') return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(sweep, { toValue: 1, duration: finish === 'rainbow' || finish === 'cosmic' ? 1600 : 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      Animated.delay(700),
      Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [animate, finish, sweep]);
  if (!s.tint) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {finish === 'cosmic' && (
        <Svg width="100%" height="100%" viewBox="0 0 100 140" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
          {STARS.map((st, i) => <Circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#FFFFFF" opacity={0.5 + (i % 3) * 0.2} />)}
        </Svg>
      )}
      <LinearGradient colors={s.tint} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, finish === 'cosmic' && { opacity: 0.55 }]} />
      {(finish === 'violet' || finish === 'rainbow' || finish === 'cosmic') && <Sparkles color={finish === 'violet' ? '#F1E4FF' : '#FFFFFF'} />}
      {animate && (
        <Animated.View style={[styles.sweep, { transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-220, 260] }) }, { rotate: '20deg' }] }]}>
          <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}
    </View>
  );
}

function Sparkles({ color }: { color: string }) {
  const star = (x: number, y: number, s: number) => `M${x} ${y - s} L${x + s * 0.28} ${y - s * 0.28} L${x + s} ${y} L${x + s * 0.28} ${y + s * 0.28} L${x} ${y + s} L${x - s * 0.28} ${y + s * 0.28} L${x - s} ${y} L${x - s * 0.28} ${y - s * 0.28} Z`;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 140" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      {[[52, 20, 3.5], [86, 50, 4.5], [14, 62, 3.5], [84, 96, 5], [18, 100, 4]].map(([x, y, sz], i) => <Path key={i} d={star(x, y, sz)} fill={color} opacity={0.85} />)}
    </Svg>
  );
}

/** "RAINBOW · 1/1000" chip. */
export function FinishChip({ finish, scale = 1 }: { finish: Finish; scale?: number }) {
  const { t } = useTranslation();
  if (finish === 'base') return null;
  const s = FINISH_STYLE[finish];
  return (
    <LinearGradient colors={s.chip} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.chip, { paddingHorizontal: 6 * scale, paddingVertical: 1.5 * scale }]}>
      <Text style={[styles.chipText, { fontSize: 9 * scale }]}>{t(`finish.${finish}`).toUpperCase()} · 1/{ONE_IN[finish]}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  sweep: { position: 'absolute', top: -60, bottom: -60, width: 70 },
  chip: { borderRadius: 999, borderWidth: 1.5, borderColor: '#FFFFFF' },
  chipText: { color: '#FFFFFF', fontFamily: FONT.display, letterSpacing: 0.5, textShadowColor: C.ink, textShadowRadius: 1, textShadowOffset: { width: 0, height: 1 } },
});
