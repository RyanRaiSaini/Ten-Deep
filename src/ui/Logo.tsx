import { useMemo } from 'react';
import { SvgXml } from 'react-native-svg';
import { logoSvg } from './logoSvg';

/** The Ten Deep ball mark. */
export function Logo({ size = 48 }: { size?: number }) {
  const xml = useMemo(() => logoSvg({ scale: 0.98 }), []);
  return <SvgXml xml={xml} width={size} height={size} accessibilityLabel="Ten Deep" />;
}
