import { useId, useMemo } from 'react';
import { SvgXml } from 'react-native-svg';
import { avatarById } from './avatars';
import { portraitSvg } from './portraits';

/**
 * An illustrated player portrait (original characters, no real likenesses).
 * Gradient and clip ids are unique per instance: screens left behind in the navigation stack stay mounted but
 * hidden, and a url(#id) that resolved to a gradient inside a hidden SVG would draw nothing on the web.
 */
export function Avatar({ id, size = 56 }: { id: string; size?: number }) {
  const a = avatarById(id);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const xml = useMemo(() => portraitSvg(a, a.id, `-${uid}`), [a, uid]);
  return <SvgXml xml={xml} width={size} height={size} accessibilityLabel="Avatar" />;
}
