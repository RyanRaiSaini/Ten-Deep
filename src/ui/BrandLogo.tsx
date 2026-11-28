import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { Display } from './components';
import { Bounce } from './fx';
import { C } from './theme';

/** A basketball mid-flight: speed lines streaming behind it. */
export function FlyingBall({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size * 1.6} height={size} viewBox="0 0 160 100">
      <G stroke={C.ink} strokeLinecap="round" strokeWidth={10}>
        <Path d="M8 34 H52 M20 52 H48 M4 70 H44" />
      </G>
      <G stroke="#FFFFFF" strokeLinecap="round" strokeWidth={5}>
        <Path d="M8 34 H52 M20 52 H48 M4 70 H44" />
      </G>
      <G transform="rotate(-20 106 52)">
        <Circle cx={106} cy={52} r={40} fill="#FF7417" stroke={C.ink} strokeWidth={6} />
        <Path d="M66 52 H146 M106 12 V92 M78 24 C94 40 94 64 78 80 M134 24 C118 40 118 64 134 80" fill="none" stroke={C.ink} strokeWidth={4.5} />
        <Path d="M84 30 C90 24 98 21 106 21" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.55} />
      </G>
    </Svg>
  );
}

/**
 * The Ten Deep wordmark: stacked, tilted, white letters with an ink outline and an orange 3D extrusion,
 * a basketball flying in from the corner.
 */
export function BrandLogo({ scale = 1, testID, inline = false }: { scale?: number; testID?: string; inline?: boolean }) {
  // One-line wordmark for a header row: the ball, then the letters, no tilt.
  if (inline) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} testID={testID} accessibilityRole="header" accessibilityLabel="Ten Deep">
        <FlyingBall size={26 * scale} />
        <Display size={26 * scale} extrude={C.hardwood}>TEN DEEP</Display>
      </View>
    );
  }
  return (
    <View style={{ alignItems: 'center', alignSelf: 'center' }} testID={testID} accessibilityRole="header" accessibilityLabel="Ten Deep">
      <View style={{ transform: [{ rotate: '-6deg' }], alignItems: 'center' }}>
        <Display size={44 * scale} extrude={C.hardwood}>TEN</Display>
        <Display size={62 * scale} extrude={C.hardwood} style={{ marginTop: -26 * scale }}>DEEP</Display>
      </View>
      <View style={{ position: 'absolute', top: -14 * scale, right: -54 * scale }}>
        <Bounce height={8}><FlyingBall size={44 * scale} /></Bounce>
      </View>
    </View>
  );
}
