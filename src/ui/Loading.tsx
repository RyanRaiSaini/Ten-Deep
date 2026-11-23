import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { Logo } from './Logo';
import { C } from './theme';

/** Shown while saved progress and fonts load: the ball and an indeterminate bar (no text, fonts aren't ready). */
export function Loading() {
  const [x] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(x, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }));
    loop.start();
    return () => loop.stop();
  }, [x]);
  return (
    <View style={styles.wrap} testID="loading">
      <Logo size={150} />
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-80, 200] }) }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 28 },
  track: { width: 200, height: 8, borderRadius: 4, backgroundColor: C.line, overflow: 'hidden' },
  fill: { width: 80, height: 8, borderRadius: 4, backgroundColor: C.ink },
});
