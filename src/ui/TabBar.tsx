import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { feel } from '../audio/feel';
import { Display } from './components';
import { useReducedMotion } from './fx';
import { Icon, type IconName } from './icons';
import { Text } from './Text';
import { C, FONT } from './theme';

const native = Platform.OS !== 'web';

/** Route name → test id key, icon and label key. */
const TABS: Record<string, { key: string; icon: IconName }> = {
  daily: { key: 'daily', icon: 'calendar' },
  collection: { key: 'cards', icon: 'cards' },
  index: { key: 'play', icon: 'ball' },
  career: { key: 'career', icon: 'briefcase' },
  duel: { key: 'duels', icon: 'vs' },
};

/** One tab: its icon springs up and grows when it becomes active, and the big outlined label fades in. */
function TabItem({ name, focused, onPress }: { name: string; focused: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const tab = TABS[name];
  const reduce = useReducedMotion();
  const v = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) { v.setValue(focused ? 1 : 0); return; }
    Animated.spring(v, { toValue: focused ? 1 : 0, friction: 6, tension: 120, useNativeDriver: native }).start();
  }, [focused, reduce, v]);
  if (!tab) return null;
  return (
    <Pressable
      testID={`tab-${tab.key}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={t(`tabs.${tab.key}`)}
      onPress={onPress}
      style={styles.item}
    >
      <Animated.View style={{ transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.42] }) }] }}>
        <Icon name={tab.icon} size={32} />
      </Animated.View>
      <View style={styles.labels}>
        <Animated.View style={{ opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), position: 'absolute' }}>
          <Text style={styles.label} numberOfLines={1}>{t(`tabs.${tab.key}`)}</Text>
        </Animated.View>
        <Animated.View style={{ opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }}>
          <Display size={tab.key === 'play' ? 22 : 17}>{t(`tabs.${tab.key}`)}</Display>
        </Animated.View>
      </View>
    </Pressable>
  );
}

/**
 * Bottom bar for the tab navigator: a raised panel springs to the active tab while its icon pops
 * up and its outlined label fades in.
 */
export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(state.index)).current;
  const n = state.routes.length;
  useEffect(() => {
    if (reduce) { x.setValue(state.index); return; }
    Animated.spring(x, { toValue: state.index, friction: 8, tension: 90, useNativeDriver: native }).start();
  }, [state.index, reduce, x]);
  const itemW = w / Math.max(1, n);
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]} testID="tab-bar">
      <View style={styles.items} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && (
          <Animated.View style={[styles.raised, { width: itemW + 10, transform: [{ translateX: x.interpolate({ inputRange: [0, Math.max(1, n - 1)], outputRange: [-5, itemW * Math.max(1, n - 1) - 5] }) }] }]} />
        )}
        {state.routes.map((r, i) => (
          <TabItem
            key={r.key}
            name={r.name}
            focused={state.index === i}
            onPress={() => { if (state.index !== i) { feel('tick'); navigateToTab(r.key); } }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: '#FFFFFF', borderTopWidth: 2, borderTopColor: C.line, paddingTop: 6 },
  items: { flexDirection: 'row', alignItems: 'flex-end', width: '100%', maxWidth: 640, alignSelf: 'center' },
  raised: {
    position: 'absolute', left: 0, top: -30, bottom: -6, backgroundColor: '#F7F2EA', borderWidth: 2.5, borderColor: C.ink, borderBottomWidth: 0,
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingVertical: 6, height: 64 },
  labels: { height: 26, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, color: C.muted, fontFamily: FONT.display, letterSpacing: 0.6, textTransform: 'uppercase' },
});
