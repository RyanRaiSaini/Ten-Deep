/** Sign in with Apple (iOS). Returns an identity token, or null if cancelled or unavailable. */
import { Platform } from 'react-native';

type Lib = typeof import('expo-apple-authentication');
// Loaded on demand: the native module only exists in builds that include it (not Expo Go, not Android).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const lib = (): Lib | null => { try { return require('expo-apple-authentication') as Lib; } catch { return null; } };

export async function appleAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try { return (await lib()?.isAvailableAsync()) ?? false; } catch { return false; }
}

export async function appleToken(): Promise<string | null> {
  const a = lib();
  if (!a) return null;
  try {
    // No name or email requested: the account is only used to find your progress.
    const c = await a.signInAsync({ requestedScopes: [] });
    return c.identityToken ?? null;
  } catch {
    return null; // cancelled (ERR_REQUEST_CANCELED) or failed
  }
}
