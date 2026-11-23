import { createContext, useContext, type ComponentProps } from 'react';
import { StyleSheet, Text as RNText } from 'react-native';

/** Nunito ships one family per weight, so a fontWeight picks the matching family. */
const BY_WEIGHT: Record<string, string> = {
  '100': 'Nunito_600SemiBold', '200': 'Nunito_600SemiBold', '300': 'Nunito_600SemiBold', '400': 'Nunito_600SemiBold',
  normal: 'Nunito_600SemiBold', '500': 'Nunito_600SemiBold', '600': 'Nunito_600SemiBold',
  '700': 'Nunito_700Bold', bold: 'Nunito_700Bold', '800': 'Nunito_800ExtraBold', '900': 'Nunito_900Black',
};

/** Drop-in for React Native's Text with the game's fonts applied. */
/** Set inside a Text, so a nested span without its own weight keeps its parent's font. */
const InText = createContext(false);

export function Text({ style, ...rest }: ComponentProps<typeof RNText>) {
  const nested = useContext(InText);
  const flat = StyleSheet.flatten(style) ?? {};
  const own = flat.fontFamily ?? (flat.fontWeight !== undefined ? BY_WEIGHT[String(flat.fontWeight)] : undefined);
  const fontFamily = own ?? (nested ? undefined : BY_WEIGHT['600']);
  const text = <RNText {...rest} style={[flat, fontFamily ? { fontFamily } : null, { fontWeight: undefined }]} />;
  return nested ? text : <InText.Provider value>{text}</InText.Provider>;
}
