/** Sound + haptics together, gated by the player's settings. */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useSettings } from '../store/settings';
import type { Finish } from '../engine/collect/finishes';
import { SFX, setVolume, sting, tear, type SfxName } from './sfx';

// Keep the sound-effects volume in step with Settings.
setVolume(useSettings.getState().sfxVolume ?? 1);
useSettings.subscribe((s) => setVolume(s.sfxVolume ?? 1));

const HAPTIC: Partial<Record<SfxName, () => Promise<void>>> = {
  tick: () => Haptics.selectionAsync(),
  thunk: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  pickChime: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  buzzer: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  fanfare: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  rip: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  flip: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
};

const canBuzz = () => useSettings.getState().haptics && Platform.OS !== 'web';
const buzz = (style: Haptics.ImpactFeedbackStyle) => { if (canBuzz()) void Haptics.impactAsync(style).catch(() => {}); };

export function feel(name: SfxName) {
  const { sfx } = useSettings.getState();
  if (sfx) SFX[name]();
  if (canBuzz()) void HAPTIC[name]?.().catch(() => {});
}

/** One step of tearing the pack (`level` 0..1): crinkle plus a tap that gets heavier as the tear runs. */
export function feelTear(level: number) {
  if (useSettings.getState().sfx) tear(level);
  buzz(level < 0.4 ? Haptics.ImpactFeedbackStyle.Light : level < 0.75 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Heavy);
}

/** A finish reveal: its sting, and for the rarest a drum-roll of heavy taps. */
export function feelFinish(f: Finish) {
  if (f === 'base') return;
  if (useSettings.getState().sfx) sting(f);
  const pulses = { holo: 1, chrome: 1, gold: 2, violet: 3, rainbow: 5, cosmic: 7 }[f];
  for (let i = 0; i < pulses; i++) setTimeout(() => buzz(i < 2 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium), i * 110);
}

/**
 * The wait before flipping a glowing card: a heartbeat of taps on the phone when something big is inside.
 * No music: the pack only plays sound effects (tear, rip, flip, the finish sparkle). Returns a stop function.
 */
export function feelSuspense(strong: boolean): () => void {
  const beat = strong ? setInterval(() => { buzz(Haptics.ImpactFeedbackStyle.Medium); setTimeout(() => buzz(Haptics.ImpactFeedbackStyle.Light), 140); }, 900) : null;
  return () => { if (beat) clearInterval(beat); };
}
