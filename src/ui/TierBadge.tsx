import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { LADDER, type Group } from '../engine/league/ladder';
import { Text } from './Text';
import { C, FONT } from './theme';

export const GROUP_COLORS: Record<Group, [string, string]> = {
  bronze: ['#E59A5B', '#A65A26'],
  silver: ['#E3E8EE', '#98A3AF'],
  gold: ['#FFD66B', '#E09A00'],
  platinum: ['#B8F3F0', '#3FB7B0'],
  legend: ['#B98CFF', '#5B2BD9'],
};
const ROMAN = ['', 'I', 'II', 'III'];

/** League tier shield with its level numeral (Legend gets a crown notch instead). */
export function TierBadge({ tier, size = 48 }: { tier: number; size?: number }) {
  const t = LADDER[tier];
  const [a, b] = GROUP_COLORS[t.group];
  const id = `tb-${tier}`;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 48 48" style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={a} /><Stop offset="1" stopColor={b} /></LinearGradient>
        </Defs>
        <Path d="M24 3 L42 9 V24 C42 35 33 42 24 46 C15 42 6 35 6 24 V9 Z" fill={`url(#${id})`} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
        <Path d="M24 8 L37 12.5 V24" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={3} fill="none" strokeLinecap="round" />
        {t.group === 'legend' && <Path d="M14 18 L19 23 L24 15 L29 23 L34 18 L32 30 H16 Z" fill="#FFD23F" stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />}
      </Svg>
      {t.level > 0 && <Text style={{ fontFamily: FONT.display, fontSize: size * 0.34, color: '#FFFFFF', marginTop: size * 0.04, textShadowColor: C.ink, textShadowRadius: 2, textShadowOffset: { width: 0, height: 1.5 } }}>{ROMAN[t.level]}</Text>}
    </View>
  );
}

export const tierName = (tier: number, groupLabel: (g: Group) => string) => {
  const t = LADDER[tier];
  return t.level ? `${groupLabel(t.group)} ${ROMAN[t.level]}` : groupLabel(t.group);
};
