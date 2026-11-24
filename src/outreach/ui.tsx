/** Small building blocks for the private admin screens (English only; never shown to players). */
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../ui/Text';
import { C, R, S } from '../ui/theme';
import type { Check } from './checks';
import type { Status } from './types';

export function Field({ label, value, onChange, multiline, placeholder, hint, testID, lines = 4 }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string; hint?: string; testID?: string; lines?: number;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={a.label}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.muted} multiline={multiline}
        style={[a.input, multiline && { minHeight: lines * 22, textAlignVertical: 'top' }]} testID={testID} autoCapitalize="none"
      />
      {hint ? <Text style={a.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chips<T extends string>({ options, value, onChange, testID }: { options: readonly T[]; value: T | T[]; onChange: (v: T) => void; testID?: string }) {
  const on = (o: T) => (Array.isArray(value) ? value.includes(o) : value === o);
  return (
    <View style={a.chips} testID={testID}>
      {options.map((o) => (
        <Pressable key={o} onPress={() => onChange(o)} style={[a.chip, on(o) && a.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on(o) }}>
          <Text style={[a.chipText, on(o) && { color: '#FFFFFF' }]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const STATUS_COLOR: Partial<Record<Status, string>> = {
  'Draft ready': C.blue, Contacted: C.purple, Replied: C.teal, Interested: C.neon, 'Tried the game': C.neon, 'Shared content': C.gold,
  'Follow up later': C.hardwood, Declined: C.muted, 'Do not contact': C.danger,
};

export function Pill({ text, color }: { text: string; color?: string }) {
  const c = color ?? STATUS_COLOR[text as Status] ?? C.muted;
  return <View style={[a.pill, { borderColor: c }]}><Text style={[a.pillText, { color: c }]}>{text}</Text></View>;
}

export function Small({ label, onPress, tone = 'plain', disabled, testID }: { label: string; onPress: () => void; tone?: 'plain' | 'primary' | 'danger'; disabled?: boolean; testID?: string }) {
  const bg = tone === 'primary' ? C.ink : tone === 'danger' ? C.danger : C.surface;
  return (
    <Pressable onPress={onPress} disabled={disabled} testID={testID} accessibilityRole="button"
      style={[a.small, { backgroundColor: bg, opacity: disabled ? 0.45 : 1 }, tone === 'plain' && { borderWidth: 2, borderColor: C.line }]}>
      <Text style={[a.smallText, tone !== 'plain' && { color: '#FFFFFF' }]}>{label}</Text>
    </Pressable>
  );
}

export function Box({ title, right, children, style }: { title?: string; right?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[a.box, style]}>
      {title || right ? <View style={a.boxHead}>{title ? <Text style={a.boxTitle}>{title}</Text> : <View />}{right}</View> : null}
      {children}
    </View>
  );
}

export function Checks({ checks }: { checks: Check[] }) {
  return (
    <View style={{ gap: 4 }} testID="draft-checks">
      {checks.map((c, i) => (
        <Text key={i} style={[a.check, { color: c.level === 'error' ? C.danger : c.level === 'warn' ? C.gold : C.neon }]}>
          {c.level === 'error' ? 'Fix: ' : c.level === 'warn' ? 'Check: ' : 'OK: '}{c.message}
        </Text>
      ))}
    </View>
  );
}

/** Two columns on wide screens, stacked on phones. */
export function Columns({ left, right }: { left: ReactNode; right: ReactNode }) {
  const wide = useWindowDimensions().width >= 1000;
  return (
    <View style={{ flexDirection: wide ? 'row' : 'column', gap: S.lg, alignItems: 'flex-start' }}>
      <View style={{ flex: wide ? 5 : undefined, width: wide ? undefined : '100%', gap: S.md }}>{left}</View>
      <View style={{ flex: wide ? 6 : undefined, width: wide ? undefined : '100%', gap: S.md }}>{right}</View>
    </View>
  );
}

export const Muted = ({ children }: { children: ReactNode }) => <Text style={a.hint}>{children}</Text>;
export const Strong = ({ children }: { children: ReactNode }) => <Text style={a.strong}>{children}</Text>;
export const Body = ({ children, testID }: { children: ReactNode; testID?: string }) => <Text style={a.body} testID={testID}>{children}</Text>;
export const Row = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[a.row, style]}>{children}</View>;

/** Web: download a text file. Elsewhere: no-op (callers fall back to copying). */
export function download(name: string, text: string, type = 'text/csv'): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  const url = URL.createObjectURL(new Blob([text], { type }));
  const el = document.createElement('a');
  el.href = url; el.download = name; el.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** Web: pick a text file and read it. */
export function pickTextFile(accept = '.csv,text/csv'): Promise<string | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const el = document.createElement('input');
    el.type = 'file'; el.accept = accept;
    el.onchange = () => { const f = el.files?.[0]; if (!f) return resolve(null); f.text().then(resolve, () => resolve(null)); };
    el.click();
  });
}

export const a = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '800', color: C.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  hint: { fontSize: 12, color: C.muted, lineHeight: 17 },
  strong: { fontSize: 15, fontWeight: '800', color: C.text },
  body: { fontSize: 14, color: C.text, lineHeight: 20 },
  input: { borderWidth: 2, borderColor: C.line, borderRadius: R.sm, backgroundColor: C.surface, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: C.text, fontFamily: 'Montserrat_600SemiBold' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.pill, borderWidth: 2, borderColor: C.line, backgroundColor: C.surface },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontSize: 12, fontWeight: '700', color: C.text },
  pill: { borderWidth: 2, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '800' },
  small: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.sm },
  smallText: { fontSize: 13, fontWeight: '800', color: C.text },
  box: { backgroundColor: C.surface, borderRadius: R.md, borderWidth: 2, borderColor: C.line, padding: S.md, gap: S.sm },
  boxHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.sm },
  boxTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  check: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, alignItems: 'center' },
});
