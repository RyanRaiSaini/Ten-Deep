/**
 * Google sign-in on iOS/Android (@react-native-google-signin). Off until CONFIG.auth.google has client IDs and
 * app.json has the library's config plugin (see docs/setup/sign-in.md).
 */
import { Platform } from 'react-native';
import { CONFIG } from '../config';

type Lib = typeof import('@react-native-google-signin/google-signin');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const lib = (): Lib | null => { try { return require('@react-native-google-signin/google-signin') as Lib; } catch { return null; } };

const ids = CONFIG.auth.google;
export const googleConfigured = () => !!ids.web && (Platform.OS === 'android' || (Platform.OS === 'ios' && !!ids.ios));

export async function googleAvailable(): Promise<boolean> {
  return googleConfigured() && !!lib();
}

export async function googleToken(): Promise<string | null> {
  const g = lib()?.GoogleSignin;
  if (!g || !googleConfigured()) return null;
  try {
    // The web client ID makes the token's audience one the server accepts on both platforms.
    g.configure({ webClientId: ids.web ?? undefined, iosClientId: ids.ios ?? undefined });
    if (Platform.OS === 'android') await g.hasPlayServices();
    const r = await g.signIn();
    return r.type === 'success' ? r.data.idToken : null;
  } catch {
    return null;
  }
}

export async function googleSignOut() {
  try { await lib()?.GoogleSignin.signOut(); } catch { /* not signed in */ }
}
