/** Motion: count-up numbers, confetti, and a reduced-motion switch that turns both off. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type TextStyle } from 'react-native';
import { C } from './theme';

const native = Platform.OS !== 'web';

export function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduce);
    return () => sub?.remove();
  }, []);
  return reduce;
}

/** A number that ticks up from 0 with an ease-out. Screen readers get the final value. */
export function CountUp({
  to, duration = 900, format = String, style, testID,
}: { to: number; duration?: number; format?: (n: number) => string; style?: StyleProp<TextStyle>; testID?: string }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduce || to === 0) return setN(to);
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setN(Math.round(to * (1 - (1 - t) ** 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, reduce]);
  return <Text style={style} testID={testID} accessibilityLabel={format(to)}>{format(n)}</Text>;
}

/** A one-shot burst of falling confetti over the whole screen. Never blocks taps. */
export function Confetti({ colors = [C.gold, C.hardwood, C.neon, '#FFFFFF'], count = 56 }: { colors?: string[]; count?: number }) {
  const reduce = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      x: Math.random(),
      drift: (Math.random() - 0.5) * 160,
      delay: Math.random() * 700,
      dur: 2200 + Math.random() * 1600,
      spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 900),
      color: colors[i % colors.length],
      w: 6 + Math.random() * 6,
      h: 10 + Math.random() * 10,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count],
  );
  const vals = useRef(pieces.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (reduce) return;
    const anim = Animated.parallel(vals.map((v, i) => Animated.timing(v, {
      toValue: 1, duration: pieces[i].dur, delay: pieces[i].delay, easing: Easing.in(Easing.quad), useNativeDriver: native,
    })));
    anim.start();
    return () => anim.stop();
  }, [reduce, vals, pieces]);
  if (reduce) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none', overflow: 'hidden' }]} testID="confetti">
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', left: p.x * width, top: -30, width: p.w, height: p.h, borderRadius: 2, backgroundColor: p.color,
            transform: [
              { translateY: vals[i].interpolate({ inputRange: [0, 1], outputRange: [0, height + 60] }) },
              { translateX: vals[i].interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: vals[i].interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}
