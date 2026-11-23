/** App-wide configuration the owner fills in. */
export const CONFIG = {
  appName: 'Ten Deep',
  /** Publisher shown in legal pages. TODO(owner): your name or company. */
  publisher: 'Ten Deep',
  /** TODO(owner): support email. Contact page shows "coming soon" while null. */
  supportEmail: null as string | null,
  legalUpdated: '2026-11-23',
  /** Public web address (challenge links open here). */
  webUrl: 'https://ten-deep.vercel.app',
  /**
   * Sign-in. These IDs are public (they ship inside the app); the server checks tokens were issued for them.
   * Apple works on iOS with just the bundle ID. Google stays hidden until its client IDs are filled in
   * (see docs/setup/sign-in.md).
   */
  auth: {
    /** Apple: the iOS bundle ID (app.json → ios.bundleIdentifier). */
    appleAudiences: ['app.tendeep'] as string[],
    /** TODO(owner): Google Cloud OAuth client IDs (…apps.googleusercontent.com). */
    google: {
      web: null as string | null,
      ios: null as string | null,
      android: null as string | null,
    },
  },
};
