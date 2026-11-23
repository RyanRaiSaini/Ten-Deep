import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isRTL } from '../i18n';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { alpha, C, F, R, S } from './theme';

/**
 * A full screen. `tint` washes a team color down from the top; `overlay` (e.g. confetti)
 * sits above the scrolling content across the whole screen.
 */
export function Screen({ children, scroll = true, tint, overlay }: { children: ReactNode; scroll?: boolean; tint?: string; overlay?: ReactNode }) {
  const body = <View style={styles.inner}>{children}</View>;
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {tint && (
        <LinearGradient colors={[alpha(tint, 0.42), alpha(tint, 0.12), alpha(C.bg, 0)]} locations={[0, 0.45, 1]} style={styles.tint} />
      )}
      {scroll ? <ScrollView contentContainerStyle={styles.scroll}>{body}</ScrollView> : body}
      {overlay}
    </SafeAreaView>
  );
}

export function Header({ title, left, right }: { title: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>{left}</View>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'gold';
export function Button({
  label, onPress, variant = 'primary', disabled, style, testID,
}: { label: string; onPress: () => void; variant?: Variant; disabled?: boolean; style?: StyleProp<ViewStyle>; testID?: string }) {
  const bg = { primary: C.hardwood, secondary: C.surface2, ghost: 'transparent', gold: C.gold }[variant];
  const fg = variant === 'primary' || variant === 'gold' ? C.bg : C.text;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: C.line },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/** Back arrow that points the right way in right-to-left languages. */
export function BackButton({ onPress }: { onPress: () => void }) {
  const { i18n } = useTranslation();
  return <Button label={isRTL(i18n.language) ? '›' : '‹'} variant="ghost" onPress={onPress} style={{ paddingVertical: 6 }} testID="back" />;
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children, color = C.muted }: { children: ReactNode; color?: string }) {
  return <Text style={[F.label, { color }]}>{children}</Text>;
}

export function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: C.neon, false: C.line }} thumbColor={C.text} />
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
        <Pressable key={String(o)} onPress={() => onChange(o)} style={[styles.segment, o === value && styles.segmentOn]}>
          <Text style={[styles.segmentText, o === value && { color: C.bg }]}>{format(o)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1 },
  tint: { position: 'absolute', top: 0, left: 0, right: 0, height: 380, pointerEvents: 'none' },
  inner: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: S.lg, paddingBottom: S.xl, gap: S.md },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: S.md, gap: S.sm },
  headerSide: { width: 72 },
  headerTitle: { flex: 1, textAlign: 'center', color: C.text, fontSize: 18, ...F.display },
  button: { paddingVertical: 15, paddingHorizontal: S.lg, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '800' },
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: C.line },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: S.md, gap: S.md },
  rowLabel: { color: C.text, fontSize: 15, flex: 1 },
  rowValue: { color: C.muted, fontSize: 15 },
  segmented: { flexDirection: 'row', backgroundColor: C.surface2, borderRadius: R.md, padding: 3, gap: 3 },
  segment: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: R.sm },
  segmentOn: { backgroundColor: C.neon },
  segmentText: { color: C.text, fontWeight: '800' },
});
