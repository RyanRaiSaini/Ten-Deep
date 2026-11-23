/**
 * The pack-opening stage: a night-time arena with spotlights, crowd lights, slowly turning light rays,
 * a lit hardwood court, and twinkling sparkles. Plus the foil pack itself (crimped edges, moving shine).
 * Everything is vector + Animated, so it costs no image assets and runs the same on iOS, Android and web.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, Path, Polygon, RadialGradient, Rect, Stop, LinearGradient as SvgLinear } from 'react-native-svg';
import { Text } from './Text';
import { feelTear } from '../audio/feel';
import type { PickType } from '../engine/collect/picks';
import { Icon } from './icons';
import { PACK_STYLE, PackAura, PackFoilFX, PackPattern, Pips } from './packStyle';
import { C, F, S } from './theme';

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
  const [v] = useState(() => new Animated.Value(0));
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
  const [v] = useState(() => new Animated.Value(0));
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

/** Holographic spirograph: thin iridescent loops in a ring, slowly turning. Sits behind the pack and the cards. */
export function Halo({ size = 420, fire = 0 }: { size?: number; fire?: number }) {
  const [pop] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!fire) return;
    pop.setValue(0.6);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 40, useNativeDriver: native }).start();
  }, [fire, pop]);
  const loops = (n: number, ring: number, r: number, off: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + off;
      return { cx: 200 + Math.cos(a) * ring, cy: 200 + Math.sin(a) * ring, r };
    });
  const a = loops(24, 112, 66, 0), b = loops(18, 150, 44, 0.17);
  return (
    <Animated.View pointerEvents="none" style={{ width: size, height: size, transform: [{ scale: pop }] }}>
      <Spin duration={60000}>
        <Svg width={size} height={size} viewBox="0 0 400 400">
          <Defs>
            <SvgLinear id="iri" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#8FE9FF" />
              <Stop offset="0.35" stopColor="#F7A6E8" />
              <Stop offset="0.65" stopColor="#FFE58A" />
              <Stop offset="1" stopColor="#A98BFF" />
            </SvgLinear>
          </Defs>
          {a.map((c, i) => <Circle key={`a${i}`} cx={c.cx} cy={c.cy} r={c.r} fill="none" stroke="url(#iri)" strokeWidth={0.9} opacity={0.55} />)}
          {b.map((c, i) => <Circle key={`b${i}`} cx={c.cx} cy={c.cy} r={c.r} fill="none" stroke="#FFFFFF" strokeWidth={0.6} opacity={0.3} />)}
        </Svg>
      </Spin>
    </Animated.View>
  );
}

const DUST = Array.from({ length: 28 }, (_, i) => ({ x: (i * 41) % 100, y: 20 + ((i * 29) % 75), s: 2 + (i % 3), dur: 3200 + ((i * 397) % 3000), d: (i * 233) % 2500 }));

function Mote({ x, y, s, dur, d }: (typeof DUST)[number]) {
  const v = useLoop(dur, d, false);
  return (
    <Animated.View
      style={{
        position: 'absolute', left: `${x}%`, top: `${y}%`, width: s, height: s, borderRadius: s, backgroundColor: '#FFFFFF',
        shadowColor: '#FFFFFF', shadowOpacity: 1, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
        opacity: v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.9, 0.9, 0] }),
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -90] }) }],
      }}
    />
  );
}

/** Star dust drifting up through the arena. */
export function StarDust() {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>{DUST.map((m, i) => <Mote key={i} {...m} />)}</View>;
}

/** The arena as a full-screen backdrop. `color` tints the rays, the court paint and some sparkles. */
export function ArenaBackdrop({ color }: { color: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" testID="pack-arena">
      <LinearGradient colors={['#07051A', '#1A0F45', '#120C2E']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height={140} viewBox="0 0 400 110" preserveAspectRatio="none" style={styles.crowd}>
        {BOKEH.map((b, i) => <Circle key={i} cx={b.x} cy={b.y} r={b.r} fill={b.c} opacity={b.o} />)}
      </Svg>
      <View style={styles.court}><Court color={color} /></View>
      <Spotlights />
      <View style={styles.rays}><Spin duration={24000}><Rays color={color} /></Spin></View>
      {TWINKLES.map((tw, i) => <Twinkle key={i} {...tw} color={i % 3 ? '#FFFFFF' : color} />)}
      <StarDust />
    </View>
  );
}

/** A full-screen white flash; bump `fire` to trigger. */
export function Flash({ fire, color = '#FFFFFF' }: { fire: number; color?: string }) {
  const [f] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!fire) return;
    f.setValue(0.95);
    Animated.timing(f, { toValue: 0, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: native }).start();
  }, [fire, f]);
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: f }]} />;
}

/** Light beams shooting up out of the pack mouth (rarity-tinted). Bump `fire` to shoot them. */
export function Beams({ fire, color }: { fire: number; color: string }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!fire) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [fire, v]);
  const fan = [-42, -26, -12, 0, 12, 26, 42];
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.beams, {
        opacity: v.interpolate({ inputRange: [0, 0.12, 0.6, 1], outputRange: [0, 1, 0.8, 0] }),
        transform: [{ translateY: 200 }, { scaleY: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.05, 1, 1.15] }) }, { translateY: -200 }],
      }]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="none">
        <Defs>
          <SvgLinear id="bm" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="0.25" stopColor={color} stopOpacity="0.85" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </SvgLinear>
        </Defs>
        {fan.map((deg, i) => {
          const a = (deg * Math.PI) / 180, top = 200 + Math.sin(a) * 400, w = i % 2 ? 16 : 30;
          return <Polygon key={deg} points={`195,400 205,400 ${top + w},0 ${top - w},0`} fill="url(#bm)" opacity={i === 3 ? 1 : 0.7} />;
        })}
      </Svg>
    </Animated.View>
  );
}

const PW = 210, PH = 300, STRIP = 44;

/** The pack art (foil body, crimps, frame, logo). Drawn twice: once for the body, once for the tear-off strip. */
function PackArt({ c1, c2, label, type }: { c1: string; c2: string; label: string; type: PickType }) {
  const st = PACK_STYLE[type];
  const crimp = (y: number, flip: boolean) => {
    let d = `M0 ${y}`;
    for (let x = 0; x <= PW; x += 10) d += ` L${x} ${y + (flip ? -1 : 1) * (x % 20 ? 8 : 0)}`;
    return d + ` L${PW} ${y + (flip ? 14 : -14)} L0 ${y + (flip ? 14 : -14)} Z`;
  };
  return (
    <LinearGradient colors={[c2, c1, '#FFFFFF', c1, c2]} locations={[0, 0.3, 0.5, 0.7, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: PW, height: PH }}>
      <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { opacity: 0.82 }]} />
      <PackPattern pattern={st.pattern} w={PW} h={PH} />
      <PackFoilFX fx={st.fx} />
      <Svg width={PW} height={PH} style={StyleSheet.absoluteFill}>
        <Path d={crimp(14, false)} fill="#FFFFFF" opacity={0.35} />
        <Path d={crimp(PH - 14, true)} fill="#FFFFFF" opacity={0.35} />
        <Line x1="8" y1={STRIP} x2={PW - 8} y2={STRIP} stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="5 4" />
        <Rect x="12" y={STRIP + 10} width={PW - 24} height={PH - STRIP - 36} rx="10" fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2} />
        <Circle cx={PW / 2} cy={PH / 2 + 14} r="70" fill="#FFFFFF" opacity={0.08} />
      </Svg>
      <LinearGradient colors={['#8FE9FF', '#F7A6E8', '#FFE58A', '#A98BFF', '#8FE9FF']} style={styles.foilEdge} />
      <View style={styles.packFace}>
        <View style={styles.emblem}><Icon name={st.emblem} size={34} /></View>
        <Text style={styles.packLogo}>TEN{'\n'}DEEP</Text>
        <View style={styles.packType}><Text style={styles.packTypeText}>{label}</Text></View>
        <Pips n={st.pips} color={c2} />
      </View>
    </LinearGradient>
  );
}

/** A jagged tear seam, glowing, revealed left to right as the rip progresses. */
function Seam({ color }: { color: string }) {
  let d = 'M0 6';
  for (let x = 0; x <= PW; x += 7) d += ` L${x} ${x % 14 ? 0 : 12}`;
  return (
    <Svg width={PW} height={12} viewBox={`0 0 ${PW} 12`}>
      <Path d={d} fill="none" stroke={color} strokeWidth={6} strokeOpacity={0.6} />
      <Path d={d} fill="none" stroke="#FFFFFF" strokeWidth={2.5} />
    </Svg>
  );
}

/**
 * The pack you rip open. Drag across it (either way) to tear the top strip off; let go early and it springs back.
 * A plain tap rips it automatically. Calls `onRip` the moment it tears (fire the big effects there) and
 * `onGone` once the empty wrapper has dropped away.
 */
export function RipPack({ c1, c2, label, type, hint, glow, onRip, onGone, testID, dropDelay = 450 }: {
  c1: string; c2: string; label: string; type: PickType; hint: string; glow: string; onRip: () => void; onGone: () => void; testID?: string;
  /** How long the open wrapper stays put after the rip (so cards can rise out of it) before it falls away. */
  dropDelay?: number;
}) {
  const [tear] = useState(() => new Animated.Value(0)); // 0..1 how far the strip is torn
  const [fly] = useState(() => new Animated.Value(0)); // strip flying off
  const [drop] = useState(() => new Animated.Value(0)); // wrapper falling away
  const float = useLoop(1400);
  const shine = useLoop(1600, 900, false);
  const finger = useLoop(1100, 300, false);
  const sway = useLoop(2400);
  const [ripped, setRipped] = useState(false);
  const done = useRef(false);
  const bucket = useRef(0);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    setRipped(true);
    onRip();
    Animated.timing(tear, { toValue: 1, duration: 90, useNativeDriver: false }).start();
    Animated.sequence([
      Animated.timing(fly, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: false }),
    ]).start();
    Animated.sequence([
      Animated.delay(dropDelay),
      Animated.timing(drop, { toValue: 1, duration: 520, easing: Easing.in(Easing.quad), useNativeDriver: false }),
    ]).start(() => onGone());
  };
  const autoRip = () => {
    if (done.current) return;
    [0.2, 0.5, 0.8].forEach((lv, i) => setTimeout(() => feelTear(lv), i * 80));
    Animated.timing(tear, { toValue: 0.85, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: false }).start(() => finish());
  };

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !done.current,
    onMoveShouldSetPanResponder: () => !done.current,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => {
      if (done.current) return;
      const p = Math.min(1, Math.abs(g.dx) / (PW * 0.8));
      tear.setValue(p);
      // Crinkle + a tap every 10% of the tear, heavier as it goes.
      const b = Math.floor(p * 10);
      if (b > bucket.current) { bucket.current = b; feelTear(p); }
      if (p >= 0.92) finish();
    },
    onPanResponderRelease: (_, g) => {
      if (done.current) return;
      const p = Math.abs(g.dx) / (PW * 0.8);
      if (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) return autoRip();
      if (p > 0.5) return finish();
      bucket.current = 0;
      Animated.spring(tear, { toValue: 0, friction: 5, useNativeDriver: false }).start();
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const seamW = tear.interpolate({ inputRange: [0, 1], outputRange: [0, PW] });
  return (
    <Animated.View
      style={{ alignItems: 'center', gap: S.lg, opacity: drop.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [0, 300] }) }, { rotate: drop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-14deg'] }) }, { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [4, -8] }) }] }}
    >
      <Animated.View
        {...pan.panHandlers} testID={testID} accessibilityRole="button" accessibilityLabel={hint}
        style={{ transform: [
          { perspective: 900 },
          { rotateY: sway.interpolate({ inputRange: [0, 1], outputRange: ['-11deg', '11deg'] }) },
          { rotateZ: sway.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] }) },
        ] }}
      >
        <View style={[styles.packShadow, { shadowColor: ripped ? glow : c1 }]}>
          {/* Body: everything below the tear line. */}
          <View style={{ width: PW, height: PH }}>
            {/* Body: clipped at the tear line, so once the strip is gone the wrapper is open. */}
            <View style={{ position: 'absolute', top: STRIP, left: 0, width: PW, height: PH - STRIP, overflow: 'hidden', borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }}>
              <View style={{ position: 'absolute', top: -STRIP, left: 0, width: PW, height: PH }}><PackArt c1={c1} c2={c2} label={label} type={type} /></View>
            </View>
            {/* Light leaking out of the opening. */}
            <Animated.View style={[styles.leak, { opacity: tear }]}>
              <LinearGradient colors={[glow, 'rgba(255,255,255,0)']} style={StyleSheet.absoluteFill} />
            </Animated.View>
            <View style={styles.bodyShine} pointerEvents="none">
              <Animated.View style={[styles.packShine, { transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-200, 300] }) }, { rotate: '22deg' }] }]}>
                <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
              </Animated.View>
            </View>
          </View>
          {/* The strip: same art, clipped to the top, lifting and peeling as you tear, then flying off. */}
          <Animated.View
            style={[styles.strip, {
              opacity: fly.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateX: fly.interpolate({ inputRange: [0, 1], outputRange: [0, 300] }) },
                { translateY: Animated.add(tear.interpolate({ inputRange: [0, 1], outputRange: [0, -26] }), fly.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, -110, 40] })) },
                { rotate: Animated.add(tear.interpolate({ inputRange: [0, 1], outputRange: [0, -0.32] }), fly.interpolate({ inputRange: [0, 1], outputRange: [0, 1.5] })).interpolate({ inputRange: [-2, 2], outputRange: ['-114.6deg', '114.6deg'] }) },
              ],
            }]}
          >
            <View style={{ width: PW, height: STRIP, overflow: 'hidden', borderTopLeftRadius: 6, borderTopRightRadius: 6 }}><PackArt c1={c1} c2={c2} label={label} type={type} /></View>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.seam, { width: seamW, opacity: fly.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
            <Seam color={glow} />
          </Animated.View>
          {!ripped && <PackAura fx={PACK_STYLE[type].fx} w={PW} h={PH} />}
        </View>
        {!ripped && (
          <Animated.Text
            pointerEvents="none"
            style={[styles.finger, {
              opacity: Animated.multiply(finger.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }), tear.interpolate({ inputRange: [0, 0.1], outputRange: [1, 0], extrapolate: 'clamp' })),
              transform: [{ translateX: finger.interpolate({ inputRange: [0, 1], outputRange: [-10, PW - 40] }) }],
            }]}
          >
            👆
          </Animated.Text>
        )}
      </Animated.View>
      <Animated.Text style={[styles.cta, { opacity: ripped ? 0 : float.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }]}>{hint}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  crowd: { position: 'absolute', top: 0, left: 0, right: 0 },
  court: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%' },
  rays: { position: 'absolute', top: '46%', left: '50%', marginLeft: -210, marginTop: -210 },
  beams: { position: 'absolute', left: -60, right: -60, top: -40, height: 400 },
  packShadow: { shadowOpacity: 0.95, shadowRadius: 34, shadowOffset: { width: 0, height: 0 }, elevation: 16, borderRadius: 6 },
  packFace: { position: 'absolute', top: STRIP - 10, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: S.sm },
  emblem: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  packLogo: { ...F.display, color: '#FFFFFF', fontSize: 44, textAlign: 'center', letterSpacing: 4, textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 },
  packType: { backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, borderWidth: 2, borderColor: C.ink },
  packTypeText: { color: C.ink, fontWeight: '900', fontSize: 15 },
  packShine: { position: 'absolute', top: -80, bottom: -80, width: 60 },
  foilEdge: { position: 'absolute', left: 10, top: 20, bottom: 20, width: 7, opacity: 0.75, borderRadius: 3 },
  leak: { position: 'absolute', top: STRIP, left: 0, right: 0, height: 90 },
  bodyShine: { position: 'absolute', top: STRIP, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  strip: { position: 'absolute', top: 0, left: 0 },
  seam: { position: 'absolute', top: STRIP - 6, left: 0, height: 12, overflow: 'hidden' },
  finger: { position: 'absolute', top: STRIP - 4, left: 0, fontSize: 34 },
  cta: { ...F.display, color: '#FFFFFF', fontSize: 22, letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
});
