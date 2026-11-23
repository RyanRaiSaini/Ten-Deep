import { router } from 'expo-router';

/** Return to the existing home screen instead of stacking a new one on top. */
export function goHome() {
  if (router.canDismiss()) router.dismissTo('/');
  else router.replace('/');
}

/** Back, or home when there's nowhere to go back to (a page opened directly, or reached from a tab). */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
