/**
 * The pack-opening stage: a night-time arena with spotlights, crowd lights, slowly turning light rays,
 * a lit hardwood court, and twinkling sparkles. Plus the foil pack itself (crimped edges, moving shine).
 * Everything is vector + Animated, so it costs no image assets and runs the same on iOS, Android and web.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, Path, Polygon, RadialGradient, Rect, Stop, LinearGradient as SvgLinear } from 'react-native-svg';
import { Text } from './Text';
import { C, F, R, S } from './theme';

const native = Platform.OS !== 'web';

/** Deterministic "crowd" camera-flash bokeh along the top of the arena. */
const BOKEH = Array.from({ length: 30 }, (_, i) => ({
  x: (i * 53) % 400, y: 14 + ((i * 37) % 80), r: 2 + ((i * 7) % 5), o: 0.12 + ((i * 11) % 7) * 0.05,
  c: ['#FFFFFF', '#FFD27A', '#7FC8FF', '#FF9AD5'][i % 4],
}));
/** Where the twinkles sit around the pack (percent of the stage). */
const TWINKLES = [
  { x: 14, y: 22, s: 18, d: 0 }, { x: 84, y: 18, s: 22, d: 500 }, { x: 8, y: 52, s: 14, d: 900 }, { x: 90, y: 48, s: 16, d: 300 },
  { x: 20, y: 76, s: 20, d: 1200 }, { x: 80, y: 74, s: 18, d: 700 }, { x: 30, y: 10, s: 12, d: 1500 }, { x: 68, y: 8, s: 14, d: 1100 },
  { x: 50, y: 4, s: 10, d: 400 }, { x: 94, y: 30, s: 11, d: 1700 },
];

function useLoop(duration: number, delay = 0, reverse = true) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const steps = [Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: native })];
    if (reverse) steps.push(Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: native }));
    else steps.push(Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: native }));
    const loop = Animated.loop(Animated.sequence([Animated.delay(delay), ...steps]));
    loop.start();
    return () => loop.stop();
  }, [v, duration, delay, reverse]);
  return v;
}

function Spin({ children, duration }: { children: ReactNode; duration: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: native }));
    loop.start();
    return () => loop.stop();
  }, [v, duration]);
  return <Animated.View style={{ transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>{children}</Animated.View>;
}

const star = (s: number) => {
  const h = s / 2, k = s * 0.13;
  return `M${h} 0 L${h + k} ${h - k} L${s} ${h} L${h + k} ${h + k} L${h} ${s} L${h - k} ${h + k} L0 ${h} L${h - k} ${h - k} Z`;
};

function Twinkle({ x, y, s, d, color }: { x: number; y: number; s: number; d: number; color: string }) {
  const v = useLoop(900, d);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: `${x}%`, top: `${y}%`, width: s, height: s,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.15] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }],
      }}
    >
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><Path d={star(s)} fill={color} /></Svg>
    </Animated.View>
  );
}

/** A hardwood court in perspective, lit from above, with the centre circle painted in the pack colour. */
function Court({ color }: { color: string }) {
  const planks = Array.from({ length: 33 }, (_, i) => -200 + i * 25);
  return (
    <Svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgLinear id="wood" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#6B3F1D" />
          <Stop offset="0.5" stopColor="#B87638" />
          <Stop offset="1" stopColor="#D99A55" />
        </SvgLinear>
        <SvgLinear id="fade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#120C2E" stopOpacity="1" />
          <Stop offset="0.35" stopColor="#120C2E" stopOpacity="0.35" />
          <Stop offset="1" stopColor="#120C2E" stopOpacity="0" />
        </SvgLinear>
        <RadialGradient id="pool" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#FFF6DD" stopOpacity="0.75" />
          <Stop offset="0.6" stopColor="#FFF6DD" stopOpacity="0.15" />
          <Stop offset="1" stopColor="#FFF6DD" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="400" height="200" fill="url(#wood)" />
      <G opacity={0.22}>
        {planks.map((x) => <Line key={x} x1={200 + (x - 200) * 0.35} y1="0" x2={x} y2="200" stroke="#3E220C" strokeWidth={1} />)}
      </G>
      <Line x1="0" y1="96" x2="400" y2="96" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={2.5} />
      <Ellipse cx="200" cy="96" rx="118" ry="38" fill={color} fillOpacity={0.35} stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={2.5} />
      <Ellipse cx="200" cy="96" rx="38" ry="12" fill="none" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={2} />
      <Ellipse cx="200" cy="92" rx="190" ry="70" fill="url(#pool)" />
      <Rect x="0" y="0" width="400" height="200" fill="url(#fade)" />
    </Svg>
  );
}

/** Two spotlight beams from the rafters, gently breathing. */
function Spotlights() {
  const v = useLoop(1800);
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }]}>
      <Svg width="100%" height="100%" viewBox="0 0 400 500" preserveAspectRatio="none">
        <Defs>
          <SvgLinear id="beam" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.5" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </SvgLinear>
        </Defs>
        <Polygon points="30,0 80,0 250,440 120,440" fill="url(#beam)" />
        <Polygon points="320,0 370,0 280,440 150,440" fill="url(#beam)" />
        <Polygon points="185,0 215,0 260,420 140,420" fill="url(#beam)" opacity={0.6} />
      </Svg>
    </Animated.View>
  );
}

function Rays({ color }: { color: string }) {
  const wedges = Array.from({ length: 16 }, (_, i) => {
    const a0 = (i / 16) * Math.PI * 2, a1 = a0 + Math.PI / 22;
    return `M200 200 L${200 + Math.cos(a0) * 200} ${200 + Math.sin(a0) * 200} L${200 + Math.cos(a1) * 200} ${200 + Math.sin(a1) * 200} Z`;
  });
  return (
    <Svg width={420} height={420} viewBox="0 0 400 400">
      <Defs>
        <RadialGradient id="rayfade" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={color} stopOpacity="0.9" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {wedges.map((d, i) => <Path key={i} d={d} fill="url(#rayfade)" opacity={i % 2 ? 0.35 : 0.6} />)}
      <Circle cx="200" cy="200" r="90" fill="url(#rayfade)" opacity={0.5} />
    </Svg>
  );
}

/** The arena. `color` tints rays, court paint and sparkles; bump `flash` to fire a white flash. */
export function PackArena({ color, flash, children, title, subtitle }: {
  color: string; flash: number; children: ReactNode; title: ReactNode; subtitle?: ReactNode;
}) {
  const f = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!flash) return;
    f.setValue(1);
    Animated.timing(f, { toValue: 0, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: native }).start();
  }, [flash, f]);
  return (
    <View style={styles.arena} testID="pack-arena">
      <LinearGradient colors={['#08061A', '#1A0F45', '#120C2E']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height={110} viewBox="0 0 400 110" preserveAspectRatio="none" style={styles.crowd}>
        {BOKEH.map((b, i) => <Circle key={i} cx={b.x} cy={b.y} r={b.r} fill={b.c} opacity={b.o} />)}
      </Svg>
      <View style={styles.court}><Court color={color} /></View>
      <Spotlights />
      <View style={styles.rays} pointerEvents="none"><Spin duration={24000}><Rays color={color} /></Spin></View>
      {TWINKLES.map((tw, i) => <Twinkle key={i} {...tw} color={i % 3 ? '#FFFFFF' : color} />)}
      <View style={styles.head}>
        {title}
        {subtitle}
      </View>
      <View style={styles.body}>{children}</View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', opacity: f }]} />
    </View>
  );
}

/** The foil pack: crimped top and bottom, pack-colour foil with a sweeping shine and an idle float. */
export function FoilPack({ c1, c2, label, cta }: { c1: string; c2: string; label: string; cta: string }) {
  const shine = useLoop(1600, 900, false);
  const float = useLoop(1400);
  const W = 210, H = 300;
  const crimp = (y: number, flip: boolean) => {
    let d = `M0 ${y}`;
    for (let x = 0; x <= W; x += 10) d += ` L${x} ${y + (flip ? -1 : 1) * (x % 20 ? 8 : 0)}`;
    return d + ` L${W} ${y + (flip ? 14 : -14)} L0 ${y + (flip ? 14 : -14)} Z`;
  };
  return (
    <Animated.View style={{ alignItems: 'center', gap: S.md, transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [4, -8] }) }] }}>
      <View style={[styles.packShadow, { shadowColor: c1 }]}>
        <LinearGradient colors={[c2, c1, '#FFFFFF', c1, c2]} locations={[0, 0.3, 0.5, 0.7, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: W, height: H, borderRadius: 6, overflow: 'hidden' }}>
          <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { opacity: 0.82 }]} />
          <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
            <Path d={crimp(14, false)} fill="#FFFFFF" opacity={0.35} />
            <Path d={crimp(H - 14, true)} fill="#FFFFFF" opacity={0.35} />
            <Rect x="12" y="26" width={W - 24} height={H - 52} rx="10" fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2} />
            <Circle cx={W / 2} cy={H / 2 + 6} r="74" fill="#FFFFFF" opacity={0.08} />
          </Svg>
          <View style={styles.packFace}>
            <Text style={styles.ball}>🏀</Text>
            <Text style={styles.packLogo}>TEN{'\n'}DEEP</Text>
            <View style={styles.packType}><Text style={styles.packTypeText}>{label}</Text></View>
          </View>
          <Animated.View
            pointerEvents="none"
            style={[styles.packShine, { transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-200, 300] }) }, { rotate: '22deg' }] }]}
          >
            <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </LinearGradient>
      </View>
      <Animated.Text style={[styles.cta, { opacity: float.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }]}>{cta}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  arena: { borderRadius: R.lg + 6, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, minHeight: 500, paddingVertical: S.lg, paddingHorizontal: S.sm },
  crowd: { position: 'absolute', top: 0, left: 0, right: 0 },
  court: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '42%' },
  rays: { position: 'absolute', top: '50%', left: '50%', marginLeft: -210, marginTop: -230 },
  head: { alignItems: 'center', gap: 2, marginBottom: S.md },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  packShadow: { shadowOpacity: 0.95, shadowRadius: 34, shadowOffset: { width: 0, height: 0 }, elevation: 16, borderRadius: 6 },
  packFace: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: S.sm },
  ball: { fontSize: 34 },
  packLogo: { ...F.display, color: '#FFFFFF', fontSize: 44, textAlign: 'center', letterSpacing: 4, textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 },
  packType: { backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: R.pill, borderWidth: 2, borderColor: C.ink },
  packTypeText: { color: C.ink, fontWeight: '900', fontSize: 15 },
  packShine: { position: 'absolute', top: -80, bottom: -80, width: 60 },
  cta: { ...F.display, color: '#FFFFFF', fontSize: 22, letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
});
