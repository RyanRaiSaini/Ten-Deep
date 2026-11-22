import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useMusic } from '../audio/useMusic';
import { dailyKey } from '../engine/daily';
import { applyLanguage, deviceLanguage } from '../i18n';
import { useNotificationSync } from '../notifications';
import { useCareer } from '../store/career';
import { useCollection } from '../store/collection';
import { useDaily } from '../store/daily';
import { useDuel } from '../store/duel';
import { useGame } from '../store/game';
import { useProfile } from '../store/profile';
import { useSettings } from '../store/settings';
import { C } from '../ui/theme';

const STORES = [useGame, useProfile, useSettings, useDaily, useDuel, useCareer, useCollection];
const allHydrated = () => STORES.every((s) => s.persist.hasHydrated());

/** Wait for saved runs/settings to load so a fast tap can't be overwritten by late-arriving saved state. */
function useHydrated() {
  const [ready, setReady] = useState(allHydrated);
  useEffect(() => {
    if (ready) return;
    const unsubs = STORES.map((s) => s.persist.onFinishHydration(() => allHydrated() && setReady(true)));
    if (allHydrated()) setReady(true);
    return () => unsubs.forEach((u) => u());
  }, [ready]);
  return ready;
}

export default function RootLayout() {
  const language = useSettings((s) => s.language);
  const ready = useHydrated();
  useMusic();
  useNotificationSync(ready);
  // Daily check-in (login streak + Daily/Weekly/Mythic picks) once saved progress has loaded.
  useEffect(() => { if (ready) useCollection.getState().checkIn(dailyKey()); }, [ready]);
  useEffect(() => applyLanguage(language ?? deviceLanguage()), [language]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'fade' }} />
    </SafeAreaProvider>
  );
}
