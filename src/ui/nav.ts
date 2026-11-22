import { router } from 'expo-router';

/** Return to the existing home screen instead of stacking a new one on top. */
export function goHome() {
  if (router.canDismiss()) router.dismissTo('/');
  else router.replace('/');
}
