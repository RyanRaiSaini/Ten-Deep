import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import type { Card, Tier } from '../engine/collect/tiers';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { teamGradient } from './teamColors';
import { FINISH_STYLE, FinishChip, FinishOverlay } from './CardFinish';
import type { Finish } from '../engine/collect/finishes';
import { C, F, FONT, R } from './theme';

/** Tier look: frame gradient, accent and glow. */
export { TIER_STYLE } from './tierStyle';
import { TIER_STYLE } from './tierStyle';

const initials = (name: string) => name.split(' ').filter((w) => !/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(w)).map((w) => w[0]).slice(0, 2).join('');

/** A collectible card: tier frame, rating, monogram (no faces), name and season. */
export function CollectCard({ card, width = 150, tierLabel, level = 0, finish = 'base', animate = false }: {
  card: Card; width?: number; tierLabel?: string; level?: number;
  /** Foil finish (see CardFinish): its frame replaces the tier frame, with a thin tier-coloured ring inside. */
  finish?: Finish; animate?: boolean;
}) {
  const s = TIER_STYLE[card.tier];
  const fs = FINISH_STYLE[finish];
  const h = width * 1.4;
  const big = width / 150;
  return (
    <View style={[styles.glow, { width, height: h, shadowColor: s.accent, borderRadius: R.md }]}>
      <LinearGradient colors={fs.frame ?? s.frame} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.frame, { borderRadius: R.md }, fs.frame && { padding: 4 }]}>
        <LinearGradient
          colors={teamGradient(card.colors)}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
          style={[styles.inner, { borderRadius: R.md - 3 }, fs.frame && { borderWidth: 1.5, borderColor: s.accent }]}
        >
          <FinishOverlay finish={finish} animate={animate} />
          <View style={styles.top}>
            <Text style={[styles.ovr, { fontSize: 32 * big }]}>{Math.min(99, card.ovr + level)}</Text>
            <Text style={[styles.pos, { fontSize: 11 * big }]}>{card.pos}{card.pos2 ? `/${card.pos2}` : ''}</Text>
          </View>
          <Jersey size={78 * big} main={card.colors[0]} trim={card.colors[1]} text={initials(card.name)} />
          {card.tier === 'ultra' && <Text style={[styles.sparkle, { fontSize: 14 * big }]}>✦ ✧ ✦</Text>}
          <View style={{ alignSelf: 'stretch', alignItems: 'center', gap: 1 }}>
            <Text style={[styles.name, { fontSize: 13 * big }]} numberOfLines={1} ellipsizeMode="tail">{card.name}</Text>
            <Text style={[styles.team, { fontSize: 10 * big }]} numberOfLines={1} ellipsizeMode="tail">{card.team}</Text>
          </View>
          {level > 0 && (
            <View style={[styles.level, { borderColor: s.accent }]}>
              <Text style={[styles.levelText, { fontSize: 9 * big, color: s.accent }]}>{'★'.repeat(level)}</Text>
            </View>
          )}
          {tierLabel && (
            <View style={[styles.ribbon, { backgroundColor: s.accent }]}>
              <Text style={[styles.ribbonText, { fontSize: 9 * big }]}>{tierLabel}</Text>
            </View>
          )}
        </LinearGradient>
      </LinearGradient>
      {finish !== 'base' && <View style={[styles.finishChip, { bottom: -8 * big }]} pointerEvents="none"><FinishChip finish={finish} scale={big} /></View>}
    </View>
  );
}

/** A tank-top jersey in the team's colors with the player's initials (no faces, no logos). */
function Jersey({ size, main, trim, text }: { size: number; main: string; trim: string; text: string }) {
  const light = (hex: string) => { const n = parseInt(hex.slice(1, 7), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.7; };
  const ink = light(main) ? '#17121E' : '#FFFFFF';
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Path d="M18 4 C20 10 24 13 30 13 C36 13 40 10 42 4 L50 8 C48 16 48 20 52 24 L52 56 L8 56 L8 24 C12 20 12 16 10 8 Z" fill={main} stroke="#17121E" strokeWidth={2.4} strokeLinejoin="round" />
      <Path d="M18 4 C20 10 24 13 30 13 C36 13 40 10 42 4 M10 8 C12 16 12 20 8 24 M50 8 C48 16 48 20 52 24" fill="none" stroke={trim} strokeWidth={2.6} />
      <SvgText x={30} y={44} fontSize={18} fontFamily={FONT.display} fill={ink} stroke={light(main) ? 'none' : '#17121E'} strokeWidth={0.8} textAnchor="middle">{text}</SvgText>
    </Svg>
  );
}

/** The back of a card (face down in a pack): ink base, a frame in the pack color, the ball and the wordmark. */
export function CardBack({ width = 150, color = C.hardwood }: { width?: number; color?: string }) {
  const k = width / 150;
  return (
    <View style={[styles.back, { width, height: width * 1.4, borderRadius: R.md, borderColor: C.ink }]}>
      <LinearGradient colors={['#2A2140', '#17121E']} style={[StyleSheet.absoluteFill, { borderRadius: R.md - 2 }]} />
      <View style={[styles.backInner, { borderColor: color }]}>
        <View style={[styles.backDiamond, { borderColor: color, width: 70 * k, height: 70 * k }]} />
        <Svg width={56 * k} height={56 * k} viewBox="0 0 48 48">
          <Circle cx={24} cy={24} r={19} fill="#FF7417" stroke="#FFFFFF" strokeWidth={2.5} />
          <Path d="M5 24 H43 M24 5 V43 M11 10 C18 18 18 30 11 38 M37 10 C30 18 30 30 37 38" fill="none" stroke="#17121E" strokeWidth={2.4} />
        </Svg>
        <Text style={[styles.backLogo, { fontSize: 17 * k, color }]}>TEN DEEP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { shadowOpacity: 0.9, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  frame: { flex: 1, padding: 3 },
  inner: { flex: 1, padding: 10, justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden' },
  top: { alignSelf: 'stretch', alignItems: 'flex-start' },
  ovr: { ...F.display, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  pos: { color: '#FFFFFF', fontWeight: '900', marginTop: -2, textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  mono: { borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11,16,32,0.55)' },
  monoText: { color: C.text, fontWeight: '900', letterSpacing: 1 },
  sparkle: { color: '#FFF6D5', letterSpacing: 4 },
  name: { color: '#FFFFFF', fontWeight: '900', width: '100%', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  team: { color: 'rgba(255,255,255,0.8)', fontWeight: '800', width: '100%', textAlign: 'center' },
  level: { position: 'absolute', bottom: 6, left: 6, borderWidth: 1, borderRadius: 6, paddingHorizontal: 4, backgroundColor: 'rgba(11,16,32,0.7)' },
  levelText: { fontWeight: '900' },
  // Sits on the bottom edge of the frame, clear of the name and season lines.
  finishChip: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  ribbon: { position: 'absolute', top: 8, right: -26, transform: [{ rotate: '35deg' }], paddingHorizontal: 26, paddingVertical: 2 },
  ribbonText: { color: C.ink, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  back: { padding: 6, alignItems: 'stretch', justifyContent: 'center', borderWidth: 2.5, overflow: 'hidden' },
  backInner: { flex: 1, borderWidth: 2.5, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center', gap: 6 },
  backDiamond: { position: 'absolute', borderWidth: 2, opacity: 0.35, transform: [{ rotate: '45deg' }] },
  backLogo: { color: '#FFFFFF', textAlign: 'center', ...F.display, letterSpacing: 3 },
});
