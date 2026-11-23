// Import only the weights the game uses, so the other 14 Nunito styles stay out of the app.
import { LilitaOne_400Regular } from '@expo-google-fonts/lilita-one/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { Nunito_900Black } from '@expo-google-fonts/nunito/900Black';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Loading } from '../ui/Loading';
import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useMusic } from '../audio/useMusic';
import { applyLanguage, deviceLanguage } from '../i18n';
import { useNotificationSync } from '../notifications';
import { STORES, startDay } from '../store/all';
import { useCollection } from '../store/collection';
import { useSettings } from '../store/settings';
import { C } from '../ui/theme';
import { useProgress } from '../store/progress';
import { AchievementToast } from '../ui/AchievementToast';

// Keep the splash up until saved progress has loaded.
SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const hydrated = useHydrated();
  const [fontsLoaded, fontError] = useFonts({ LilitaOne_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  // Fonts that fail to load fall back to system fonts rather than blocking the game.
  const ready = hydrated && (fontsLoaded || !!fontError);
  useMusic();
  useNotificationSync(ready);
  // Daily check-in (login streak + Daily/Weekly/Mythic picks) once saved progress has loaded.
  useEffect(() => {
    if (!ready) return;
    startDay();
    // Phones keep the app alive in the background for days: start the new day when it comes back.
    const app = AppState.addEventListener('change', (st) => { if (st === 'active') startDay(); });
    // Collection milestones (cards, sets, Gauntlet, streak) unlock achievements as they happen.
    const unsub = useCollection.subscribe((s, prev) => { if (s.owned !== prev.owned || s.gauntlet !== prev.gauntlet || s.streak !== prev.streak) useProgress.getState().check(); });
    return () => { app.remove(); unsub(); };
  }, [ready]);
  useEffect(() => applyLanguage(language ?? deviceLanguage()), [language]);
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);

  if (!ready) return <Loading />;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'fade' }} />
      <AchievementToast />
    </SafeAreaProvider>
  );
}
