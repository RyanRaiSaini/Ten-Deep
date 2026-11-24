// Import only the weights the game uses, so the other font styles stay out of the app.
import { startCampaignTracking } from '../net/campaign';
import { Montserrat_500Medium } from '@expo-google-fonts/montserrat/500Medium';
import { Montserrat_600SemiBold } from '@expo-google-fonts/montserrat/600SemiBold';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat/700Bold';
import { Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat/800ExtraBold';
import { LilitaOne_400Regular } from '@expo-google-fonts/lilita-one/400Regular';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Loading } from '../ui/Loading';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

/** True once every store has loaded its saved state; latched, so a later rehydrate (cloud restore) never blanks the app. */
let hydratedOnce = false;
const allHydrated = () => (hydratedOnce ||= STORES.every((s) => s.persist.hasHydrated()));
const onHydration = (cb: () => void) => {
  const unsubs = STORES.map((s) => s.persist.onFinishHydration(cb));
  return () => unsubs.forEach((u) => u());
};

/** Wait for saved runs/settings to load so a fast tap can't be overwritten by late-arriving saved state. */
const useHydrated = () => useSyncExternalStore(onHydration, allHydrated, allHydrated);

export default function RootLayout() {
  const language = useSettings((s) => s.language);
  const hydrated = useHydrated();
  const [fontsLoaded, fontError] = useFonts({ LilitaOne_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold });
  // Fonts that fail to load fall back to system fonts rather than blocking the game.
  const ready = hydrated && (fontsLoaded || !!fontError);
  useNotificationSync(ready);
  // Daily check-in (login streak + Daily/Weekly/Mythic picks) once saved progress has loaded.
  useEffect(() => {
    if (!ready) return;
    startDay();
    startCampaignTracking();
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
