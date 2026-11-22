import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useSettings } from '../store/settings';
import { startMusic, stopMusic } from './music';

/**
 * Plays the menu track everywhere except the playoffs (playoffs track). Respects the Music setting.
 * Browsers block audio until the first tap, so music starts on the first pointer-down.
 */
export function useMusic() {
  const enabled = useSettings((s) => s.music);
  const path = usePathname();
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || unlocked) return;
    const unlock = () => setUnlocked(true);
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => document.removeEventListener('pointerdown', unlock);
  }, [unlocked]);

  useEffect(() => {
    if (!enabled || !unlocked) {
      stopMusic();
      return;
    }
    startMusic(path.startsWith('/playoffs') ? 'playoffs' : 'menu');
  }, [enabled, unlocked, path]);
}
