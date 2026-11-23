import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { feel } from '../audio/feel';
import { ACHIEVEMENTS } from '../engine/progress/achievements';
import { useProgress } from '../store/progress';
import { C, R, S } from './theme';

const MEDAL = { bronze: '#D08A4E', silver: '#C9D3E8', gold: C.gold } as const;

/** Slides in from the top when an achievement unlocks; tap to see it, or it leaves after a few seconds. */
export function AchievementToast() {
  const { t } = useTranslation();
  const id = useProgress((s) => s.toasts[0]);
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(-140)).current;
  const a = ACHIEVEMENTS.find((x) => x.id === id);

  useEffect(() => {
    if (!a) return;
    feel('swish');
    const native = Platform.OS !== 'web';
    Animated.spring(y, { toValue: 0, friction: 8, useNativeDriver: native }).start();
    const timer = setTimeout(() => {
      Animated.timing(y, { toValue: -140, duration: 220, useNativeDriver: native }).start(() => useProgress.getState().dismissToast());
    }, 3200);
    return () => clearTimeout(timer);
  }, [a, y]);

  if (!a) return null;
  return (
    <Animated.View style={[styles.wrap, { top: insets.top + S.sm, transform: [{ translateY: y }] }]}>
      <Pressable
        style={[styles.toast, { borderColor: MEDAL[a.tier] }]}
        onPress={() => { useProgress.getState().dismissToast(); router.push('/missions'); }}
        accessibilityRole="button"
        testID="achievement-toast"
      >
        <Text style={styles.icon}>{a.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: MEDAL[a.tier] }]}>{t('missions.unlocked')}</Text>
          <Text style={styles.name}>{t(`ach.${a.id}`)}</Text>
        </View>
        {a.reward && <Text style={styles.reward}>🎁</Text>}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: S.lg, zIndex: 50, pointerEvents: 'box-none' },
  toast: {
    width: '100%', maxWidth: 480, flexDirection: 'row', alignItems: 'center', gap: S.md,
    backgroundColor: C.surface2, borderWidth: 2, borderRadius: R.lg, padding: S.md,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  icon: { fontSize: 34 },
  kicker: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  name: { color: C.text, fontSize: 17, fontWeight: '900' },
  reward: { fontSize: 22 },
});
