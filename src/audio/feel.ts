/** Sound + haptics together, gated by the player's settings. */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useSettings } from '../store/settings';
import { SFX, type SfxName } from './sfx';

const HAPTIC: Partial<Record<SfxName, () => Promise<void>>> = {
  tick: () => Haptics.selectionAsync(),
  thunk: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  pickChime: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  buzzer: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  fanfare: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};

export function feel(name: SfxName) {
  const { sfx, haptics } = useSettings.getState();
  if (sfx) SFX[name]();
  if (haptics && Platform.OS !== 'web') void HAPTIC[name]?.().catch(() => {});
}
