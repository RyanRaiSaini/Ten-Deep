import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { feel } from '../audio/feel';
import { Display } from './components';
import { Icon, type IconName } from './icons';
import { Text } from './Text';
import { C, FONT } from './theme';

export type Tab = 'daily' | 'cards' | 'play' | 'career' | 'duels';

const TABS: { key: Tab; icon: IconName; route: '/daily' | '/collection' | '/' | '/career' | '/duel' }[] = [
  { key: 'daily', icon: 'calendar', route: '/daily' },
  { key: 'cards', icon: 'cards', route: '/collection' },
  { key: 'play', icon: 'ball', route: '/' },
  { key: 'career', icon: 'briefcase', route: '/career' },
  { key: 'duels', icon: 'vs', route: '/duel' },
];

/** Golazo-style bottom bar: the active tab rises out of the bar with a big outlined label. */
export function TabBar({ active }: { active: Tab }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // Android back on a tab goes to Play first (tabs replace each other, so there is no stack to pop).
  useEffect(() => {
    if (active === 'play') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { router.replace('/'); return true; });
    return () => sub.remove();
  }, [active]);
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]} testID="tab-bar">
      <View style={styles.items}>
      {TABS.map((tab) => {
        const on = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            testID={`tab-${tab.key}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t(`tabs.${tab.key}`)}
            onPress={() => { if (!on) { feel('tick'); router.replace(tab.route); } }}
            style={[styles.item, on && styles.itemOn]}
          >
            <View style={on ? styles.iconOn : undefined}>
              <Icon name={tab.icon} size={on ? 46 : 32} />
            </View>
            {on
              ? <Display size={tab.key === 'play' ? 24 : 18}>{t(`tabs.${tab.key}`)}</Display>
              : <Text style={styles.label} numberOfLines={1}>{t(`tabs.${tab.key}`)}</Text>}
          </Pressable>
        );
      })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#FFFFFF', borderTopWidth: 2, borderTopColor: C.line, paddingTop: 6,
  },
  items: { flexDirection: 'row', alignItems: 'flex-end', width: '100%', maxWidth: 640, alignSelf: 'center' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingVertical: 6 },
  itemOn: {
    flex: 1.5, marginTop: -30, backgroundColor: '#F7F2EA', borderWidth: 2.5, borderColor: C.ink, borderBottomWidth: 0,
    borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 0, paddingBottom: 10,
  },
  iconOn: { marginTop: -24 },
  label: { fontSize: 11, color: C.muted, fontFamily: FONT.display, letterSpacing: 0.6, textTransform: 'uppercase' },
});
