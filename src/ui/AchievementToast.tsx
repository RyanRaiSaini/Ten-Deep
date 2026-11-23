import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { feel } from '../audio/feel';
import { ACHIEVEMENTS } from '../engine/progress/achievements';
import { useProgress } from '../store/progress';
import { C, R, S } from './theme';
import { Icon } from './icons';
import { achievementIcon } from './gameIcons';

const MEDAL = { bronze: '#D08A4E', silver: '#C9D3E8', gold: C.gold } as const;

/** Slides in from the top when an achievement unlocks; tap to see it, or it leaves after a few seconds. */
export function AchievementToast() {
  const { t } = useTranslation();
  const id = useProgress((s) => s.toasts[0]);
  const insets = useSafeAreaInsets();
  const [y] = useState(() => new Animated.Value(200));
  const a = ACHIEVEMENTS.find((x) => x.id === id);

  useEffect(() => {
    if (!a) return;
    feel('swish');
    const native = Platform.OS !== 'web';
    Animated.spring(y, { toValue: 0, friction: 8, useNativeDriver: native }).start();
    const timer = setTimeout(() => {
      Animated.timing(y, { toValue: 200, duration: 220, useNativeDriver: native }).start(({ finished }) => { if (finished) useProgress.getState().dismissToast(); });
    }, 2200);
    return () => clearTimeout(timer);
  }, [a, y]);

  if (!a) return null;
  return (
    <Animated.View style={[styles.wrap, { bottom: insets.bottom + 96, transform: [{ translateY: y }] }]}>
      <Pressable
        style={[styles.toast, { borderColor: MEDAL[a.tier] }]}
        onPress={() => { useProgress.getState().dismissToast(); router.push('/missions'); }}
        accessibilityRole="button"
        testID="achievement-toast"
      >
        <Icon name={achievementIcon(a)} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: MEDAL[a.tier] }]}>{t('missions.unlocked')}</Text>
          <Text style={styles.name}>{t(`ach.${a.id}`)}</Text>
        </View>
        {a.reward && <Icon name="gift" size={30} />}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: S.lg, zIndex: 50, pointerEvents: 'box-none' },
  toast: {
    width: '100%', maxWidth: 340, flexDirection: 'row', alignItems: 'center', gap: S.sm,
    backgroundColor: '#FFFFFF', borderWidth: 2.5, borderRadius: R.pill, paddingVertical: 8, paddingHorizontal: 14,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  icon: { fontSize: 34 },
  kicker: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  name: { color: C.text, fontSize: 17, fontWeight: '900' },
  reward: { fontSize: 22 },
});
