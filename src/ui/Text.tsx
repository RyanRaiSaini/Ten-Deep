import { createContext, useContext, type ComponentProps } from 'react';
import { StyleSheet, Text as RNText } from 'react-native';

/**
 * Body text is Montserrat (SIL OFL): a clean, wide geometric sans, the look of mobile sports games.
 * It ships one family per weight, so a fontWeight picks the matching family (one step lighter reads best).
 */
const BY_WEIGHT: Record<string, string> = {
  '100': 'Montserrat_500Medium', '200': 'Montserrat_500Medium', '300': 'Montserrat_500Medium', '400': 'Montserrat_500Medium',
  normal: 'Montserrat_500Medium', '500': 'Montserrat_500Medium', '600': 'Montserrat_600SemiBold',
  '700': 'Montserrat_600SemiBold', bold: 'Montserrat_700Bold', '800': 'Montserrat_700Bold', '900': 'Montserrat_800ExtraBold',
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
