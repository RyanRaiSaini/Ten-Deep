import { useMemo } from 'react';
import { SvgXml } from 'react-native-svg';
import { avatarById } from './avatars';
import { portraitSvg } from './portraits';

/** An illustrated player portrait (original characters, no real likenesses). */
export function Avatar({ id, size = 56 }: { id: string; size?: number }) {
  const a = avatarById(id);
  const xml = useMemo(() => portraitSvg(a, a.id), [a]);
  return <SvgXml xml={xml} width={size} height={size} accessibilityLabel="Avatar" />;
}
