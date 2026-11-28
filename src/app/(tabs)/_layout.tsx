import { Redirect, Tabs, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { syncDuels } from '../../net/duels';
import { useSettings } from '../../store/settings';
import { C } from '../../ui/theme';
import { TabBar } from '../../ui/TabBar';

export const unstable_settings = { initialRouteName: 'index' };

/** The five hubs share one persistent, animated tab bar. Back from any tab returns to Play. */
export default function TabsLayout() {
  // First launch goes straight to the welcome slides (no flash of the home screen and tab bar), then back to
  // where the link pointed (a friend's link to the Duels tab lands there, not on Play).
  const onboarded = useSettings((s) => s.onboarded);
  const path = usePathname();
  // Friend challenges and results: check in when the app opens and whenever it comes back to the front, so the
  // Duels tab can show what's waiting.
  useEffect(() => {
    if (!onboarded) return;
    void syncDuels();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void syncDuels(); });
    return () => sub.remove();
  }, [onboarded]);
  if (!onboarded) return <Redirect href={path && path !== '/' ? { pathname: '/welcome', params: { next: path } } : '/welcome'} />;
  return (
    <Tabs
      backBehavior="initialRoute"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, animation: 'shift', sceneStyle: { backgroundColor: C.bg } }}
    >
      <Tabs.Screen name="daily" />
      <Tabs.Screen name="collection" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="career" />
      <Tabs.Screen name="duel" />
    </Tabs>
  );
}
