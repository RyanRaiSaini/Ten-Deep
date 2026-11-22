import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { applyLanguage, deviceLanguage } from '../i18n';
import { useSettings } from '../store/settings';
import { C } from '../ui/theme';

export default function RootLayout() {
  const language = useSettings((s) => s.language);
  useEffect(() => applyLanguage(language ?? deviceLanguage()), [language]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'fade' }} />
    </SafeAreaProvider>
  );
}
