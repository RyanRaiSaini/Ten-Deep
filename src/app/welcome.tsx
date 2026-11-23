import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { useSettings } from '../store/settings';
import { Button, Screen } from '../ui/components';
import { useReducedMotion } from '../ui/fx';
import { Logo } from '../ui/Logo';
import { C, F, R, S } from '../ui/theme';
import { Icon } from '../ui/icons';

const SLIDES = [
  { n: 1, icon: null, tint: C.hardwood },
  { n: 2, icon: 'ball', tint: C.blue },
  { n: 3, icon: 'cards', tint: '#B26BFF' },
] as const;

/** First-launch welcome: three slides, then home. */
export default function Welcome() {
  const { t } = useTranslation();
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  const fade = useRef(new Animated.Value(1)).current;
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  useEffect(() => {
    if (reduce) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [i, reduce, fade]);

  const done = () => {
    useSettings.getState().set({ onboarded: true });
    router.replace('/');
  };

  return (
    <Screen tint={slide.tint}>
      <View style={styles.skipRow}>
        {!last && <Text style={styles.skip} onPress={done} testID="welcome-skip" accessibilityRole="button">{t('welcome.skip')}</Text>}
      </View>
      <Animated.View style={[styles.body, { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
        {slide.icon ? <Icon name={slide.icon} size={150} /> : <Logo size={180} />}
        {i === 0 && <Text style={styles.brand}>TEN DEEP</Text>}
        <Text style={styles.title}>{t(`welcome.t${slide.n}`)}</Text>
        <Text style={styles.text}>{t(`welcome.b${slide.n}`)}</Text>
      </Animated.View>
      <View style={styles.dots}>
        {SLIDES.map((s, k) => <View key={s.n} style={[styles.dot, k === i && { backgroundColor: slide.tint, width: 22 }]} />)}
      </View>
      <Button
        label={last ? t('welcome.start') : t('welcome.next')}
        variant={last ? 'gold' : 'primary'}
        onPress={last ? done : () => setI(i + 1)}
        testID={last ? 'welcome-start' : 'welcome-next'}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  skipRow: { height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  skip: { color: C.muted, fontWeight: '800', padding: S.sm },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: S.lg, paddingVertical: S.xxl },
  icon: { fontSize: 120 },
  brand: { ...F.display, color: C.text, fontSize: 34, letterSpacing: 4 },
  title: { color: C.text, fontSize: 28, textAlign: 'center', ...F.display },
  text: { color: C.muted, fontSize: 16, textAlign: 'center', lineHeight: 23, maxWidth: 360 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: S.lg },
  dot: { width: 8, height: 8, borderRadius: R.pill, backgroundColor: C.line },
});
