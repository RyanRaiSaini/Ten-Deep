import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Switch, View, useWindowDimensions, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { isRTL } from '../i18n';
import { Icon } from './icons';
import { Text } from './Text';
import { alpha, C, F, FONT, R, S } from './theme';

/** Soft sunburst behind the top of every screen. */
function Rays({ color }: { color: string }) {
  const n = 14;
  const d = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI - Math.PI;
    const b = a + Math.PI / n / 1.6;
    const R0 = 900;
    return `M300 0 L${300 + R0 * Math.cos(a)} ${-R0 * Math.sin(a) * -1} L${300 + R0 * Math.cos(b)} ${-R0 * Math.sin(b) * -1} Z`;
  }).join(' ');
  return (
    <Svg width="100%" height={360} viewBox="0 0 600 360" preserveAspectRatio="xMidYMin slice" style={styles.rays}>
      <Path d={d} fill={color} opacity={0.09} />
    </Svg>
  );
}

/**
 * A full screen. `tint` colors the sunburst and a wash at the top; `overlay` (e.g. confetti) sits above the
 * scrolling content; `footer` (the tab bar) is pinned to the bottom.
 */
export function Screen({
  children, scroll = true, tint, overlay, footer, wide = false, tabbed = false, backdrop,
}: {
  children: ReactNode; scroll?: boolean; tint?: string; overlay?: ReactNode; footer?: ReactNode; wide?: boolean;
  /** A full-screen background drawn behind everything (replaces the tint glow and rays). */
  backdrop?: ReactNode;
  /** Inside the tab navigator: leave room for the tab bar, which handles the bottom safe area. */
  tabbed?: boolean;
}) {
  const laptop = useWindowDimensions().width >= 1024;
  const body = <View style={[styles.inner, laptop && styles.innerLaptop, wide && styles.innerWide, (!!footer || tabbed) && { paddingBottom: 120 }]}>{children}</View>;
  return (
    <SafeAreaView style={styles.screen} edges={footer || tabbed ? ['top'] : ['top', 'bottom']}>
      {backdrop ? <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>{backdrop}</View> : (
        <>
          {tint && <LinearGradient colors={[alpha(tint, 0.28), alpha(tint, 0.06), alpha(C.bg, 0)]} locations={[0, 0.5, 1]} style={styles.tint} />}
          <Rays color={tint ?? C.ink} />
        </>
      )}
      {scroll ? <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>{body}</ScrollView> : body}
      {footer}
      {overlay}
    </SafeAreaView>
  );
}

/** Big outlined display type, like a sticker: white fill, ink outline, a little 3D drop. */
export function Display({
  children: raw, size = 34, color = '#FFFFFF', stroke = C.ink, align = 'center', style, testID, extrude,
}: {
  children: ReactNode; size?: number; color?: string; stroke?: string; align?: TextStyle['textAlign']; style?: StyleProp<ViewStyle>; testID?: string;
  /** Color of a chunky 3D extrusion under the letters (logo style). */
  extrude?: string;
}) {
  const w = size < 28 ? 1.5 : Math.max(2, Math.round(size / 11));
  // The outline copies fill thin spaces at small sizes; an en space keeps words apart.
  const children = typeof raw === 'string' ? raw.replace(/ /g, '\u2002') : raw;
  const base: TextStyle = { fontFamily: FONT.display, fontSize: size, lineHeight: Math.round(size * 1.18), textAlign: align, letterSpacing: 0.3 };
  const ghost = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const, 'aria-hidden': true, selectable: false };
  const offsets = [[-w, 0], [w, 0], [0, -w], [0, w], [-w, -w], [w, w], [-w, w], [w, -w]];
  return (
    <View style={[{ alignSelf: align === 'center' ? 'center' : 'flex-start', paddingHorizontal: w, paddingTop: w, paddingBottom: extrude ? w * 4.4 : 0 }, style]} testID={testID}>
      {extrude && <Text {...ghost} style={[base, styles.ghost, { color: stroke, left: w, right: w, top: w + w * 4.4 }]}>{children}</Text>}
      {extrude && [3.4, 2.8, 2.2, 1.6].map((k) => (
        <Text key={k} {...ghost} style={[base, styles.ghost, { color: extrude, left: w, right: w, top: w + w * k }]}>{children}</Text>
      ))}
      {!extrude && <Text {...ghost} style={[base, styles.ghost, { color: stroke, left: w, right: w, top: w + w + 2 }]}>{children}</Text>}
      {offsets.map(([x, y], i) => (
        <Text key={i} {...ghost} style={[base, styles.ghost, { color: stroke, left: w + x, right: w - x, top: w + y }]}>{children}</Text>
      ))}
      <Text style={[base, { color }]}>{children}</Text>
    </View>
  );
}

/** Big centered tab title with its icon. */
export function TabTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <View style={styles.tabTitle}>
      <View style={{ flexShrink: 0 }}>{icon}</View>
      <Display size={title.length > 14 ? 28 : title.length > 10 ? 34 : 40} style={{ flexShrink: 1 }}>{title}</Display>
    </View>
  );
}

export function Header({ title, left, right, light }: { title: string; left?: ReactNode; right?: ReactNode; light?: boolean }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>{left}</View>
      <Text style={[styles.headerTitle, light && { color: '#FFFFFF' }]} numberOfLines={2}>{title}</Text>
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'gold' | 'dark' | 'blue' | 'green';
const VARIANTS: Record<Variant, { bg: string; fg: string; edge: string; border?: string }> = {
  primary: { bg: C.hardwood, fg: '#FFFFFF', edge: '#C2500A' },
  gold: { bg: '#FFC53D', fg: C.ink, edge: '#D69500' },
  dark: { bg: C.ink, fg: '#FFFFFF', edge: '#000000' },
  blue: { bg: C.blue, fg: '#FFFFFF', edge: '#1C46B8' },
  green: { bg: '#18C08A', fg: '#FFFFFF', edge: '#0B8A61' },
  secondary: { bg: '#FFFFFF', fg: C.ink, edge: C.edge, border: C.line },
  ghost: { bg: 'transparent', fg: C.ink, edge: 'transparent', border: C.line },
};

/** Chunky 3D button: a thick bottom edge that squashes when pressed. */
export function Button({
  label, onPress, variant = 'primary', disabled, style, testID, accessibilityLabel, icon,
}: {
  label: string; onPress: () => void; variant?: Variant; disabled?: boolean; style?: StyleProp<ViewStyle>; testID?: string;
  accessibilityLabel?: string; icon?: ReactNode;
}) {
  const v = VARIANTS[variant];
  const raised = variant !== 'ghost';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border ?? v.edge, opacity: disabled ? 0.45 : 1 },
        raised && { borderBottomWidth: pressed ? 2 : 5, borderBottomColor: v.edge, transform: [{ translateY: pressed ? 3 : 0 }] },
        style,
      ]}
    >
      {icon}
      <Text style={[styles.buttonText, { color: v.fg }]}>{label}</Text>
    </Pressable>
  );
}

/** Square back button that points the right way in right-to-left languages. */
export function BackButton({ onPress }: { onPress: () => void }) {
  const { t, i18n } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      testID="back"
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      style={({ pressed }) => [styles.square, pressed && styles.squarePressed]}
    >
      <View style={isRTL(i18n.language) ? { transform: [{ scaleX: -1 }] } : undefined}><Icon name="back" size={22} /></View>
    </Pressable>
  );
}

/** Small square icon button (settings, etc.). */
export function IconButton({ children, onPress, label, testID }: { children: ReactNode; onPress: () => void; label: string; testID?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} testID={testID} style={({ pressed }) => [styles.square, pressed && styles.squarePressed]}>
      {children}
    </Pressable>
  );
}

export function Card({ children, style, onPress, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; testID?: string }) {
  if (onPress)
    return (
      <Pressable onPress={onPress} testID={testID} accessibilityRole="button" style={({ pressed }) => [styles.card, style, pressed && styles.cardPressed]}>
        {children}
      </Pressable>
    );
  return <View style={[styles.card, style]} testID={testID}>{children}</View>;
}

/** Section label with a hairline running to the edge ("GAME MODES ———"). */
export function Label({ children, color = C.muted }: { children: ReactNode; color?: string }) {
  return (
    <View style={styles.labelRow}>
      <Text style={[F.label, { color }]}>{children}</Text>
      <View style={styles.labelLine} />
    </View>
  );
}

/** Pill chip for the top bar (streak, picks, profile). */
export function Chip({ children, onPress, testID, label }: { children: ReactNode; onPress?: () => void; testID?: string; label?: string }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} testID={testID} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={label}
      style={({ pressed }) => [styles.chip, pressed && styles.squarePressed]}>
      {children}
    </Pressable>
  );
}

export function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: '#18C08A', false: C.line }} thumbColor="#FFFFFF" />
    </View>
  );
}

export function Row({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : <Text style={styles.rowValue}>›</Text>}
    </Pressable>
  );
}

export function Segmented<T extends string | number>({
  options, value, onChange, format = String,
}: { options: readonly T[]; value: T; onChange: (v: T) => void; format?: (v: T) => string }) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => (
        <Pressable key={String(o)} onPress={() => onChange(o)} style={[styles.segment, o === value && styles.segmentOn]} accessibilityRole="button" accessibilityState={{ selected: o === value }}>
          <Text style={[styles.segmentText, o === value && { color: '#FFFFFF' }]}>{format(o)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1 },
  rays: { position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none' },
  tint: { position: 'absolute', top: 0, left: 0, right: 0, height: 420, pointerEvents: 'none' },
  inner: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: S.lg, paddingBottom: S.xl, gap: S.md },
  innerWide: { maxWidth: 1120 },
  innerLaptop: { maxWidth: 760 },
  ghost: { position: 'absolute' },
  tabTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.sm, paddingTop: S.lg, paddingBottom: S.sm },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: S.md, gap: S.sm },
  headerSide: { width: 56 },
  headerTitle: { flex: 1, textAlign: 'center', color: C.ink, fontSize: 21, lineHeight: 25, fontFamily: FONT.display, fontWeight: '900' },
  button: {
    flexDirection: 'row', gap: S.sm, paddingVertical: 14, paddingHorizontal: S.lg, borderRadius: R.pill, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', minHeight: 54,
  },
  buttonText: { fontSize: 17, fontWeight: '900', letterSpacing: 0.2, textAlign: 'center', flexShrink: 1 },
  square: {
    width: 50, height: 50, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.line, borderBottomWidth: 5, borderBottomColor: C.edge,
  },
  squarePressed: { transform: [{ translateY: 2 }], borderBottomWidth: 3 },
  card: {
    backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, borderWidth: 2, borderColor: C.line,
    borderBottomWidth: 6, borderBottomColor: C.edge,
  },
  cardPressed: { transform: [{ translateY: 3 }], borderBottomWidth: 3 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.sm },
  labelLine: { flex: 1, height: 2, backgroundColor: C.line, borderRadius: 1 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', paddingHorizontal: 14, height: 50, borderRadius: 16,
    borderWidth: 2, borderColor: C.line, borderBottomWidth: 5, borderBottomColor: C.edge,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: S.md, gap: S.md },
  rowLabel: { color: C.text, fontSize: 16, fontWeight: '700', flex: 1 },
  rowValue: { color: C.muted, fontSize: 15, fontWeight: '700' },
  segmented: { flexDirection: 'row', backgroundColor: C.surface2, borderRadius: R.pill, padding: 4, gap: 4, borderWidth: 2, borderColor: C.line },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: R.pill },
  segmentOn: { backgroundColor: C.ink },
  segmentText: { color: C.ink, fontWeight: '900' },
});
