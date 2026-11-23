# Sign-in setup

Signing in links a player's progress (their PIN + device key, see `api/account.ts`) to an Apple or Google
account, so signing in on a new device restores the cloud save. The server only accepts ID tokens issued for
the IDs in `src/config.ts` → `CONFIG.auth`.

## Sign in with Apple (iOS): ready

- `app.json` has `ios.usesAppleSignIn: true` and the `expo-apple-authentication` plugin.
- `CONFIG.auth.appleAudiences` is the bundle ID, `app.tendeep`.
- EAS Build turns on the "Sign in with Apple" capability for the App ID when it creates the build credentials.
  If you manage credentials yourself, enable it on the App ID in the Apple Developer portal.
- It needs a development or production build (not Expo Go): `eas build --profile development --platform ios`.

## Google (Android, iOS, web): needs your client IDs

1. In Google Cloud Console → APIs & Services → Credentials, create OAuth client IDs:
   - **Web application**: used by the web app *and* as the token audience on phones.
     Add `https://ten-deep.vercel.app` to *Authorized JavaScript origins*.
   - **iOS**: bundle ID `app.tendeep`.
   - **Android**: package `app.tendeep` with the SHA-1 of your signing key (`eas credentials` shows it; add the
     Play App Signing SHA-1 too once the app is on Play).
2. Put them in `src/config.ts` → `CONFIG.auth.google` (`web`, `ios`, `android`). They are public, not secrets.
3. Add the library's config plugin to `app.json` → `plugins`, with the iOS client ID reversed:
   `["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.<ios-client-id-prefix>" }]`
4. Rebuild the app. The Google button appears automatically once the IDs are set.

## Server

Nothing to configure: `api/account.ts` verifies tokens against Apple's and Google's public keys and stores
links in the existing private Blob store (`accounts/…`, `accounts-by-pin/…`). Delete account erases them.
