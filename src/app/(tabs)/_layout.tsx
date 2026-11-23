import { Tabs } from 'expo-router';
import { C } from '../../ui/theme';
import { TabBar } from '../../ui/TabBar';

export const unstable_settings = { initialRouteName: 'index' };

/** The five hubs share one persistent, animated tab bar. Back from any tab returns to Play. */
export default function TabsLayout() {
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
