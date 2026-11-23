import { createContext, useContext, type ComponentProps } from 'react';
import { StyleSheet, Text as RNText } from 'react-native';

/**
 * Body text is League Spartan (The League of Moveable Type, SIL OFL): a bold, athletic geometric face.
 * It ships one family per weight, so a fontWeight picks the matching family (one step lighter reads best).
 */
const BY_WEIGHT: Record<string, string> = {
  '100': 'LeagueSpartan_500Medium', '200': 'LeagueSpartan_500Medium', '300': 'LeagueSpartan_500Medium', '400': 'LeagueSpartan_500Medium',
  normal: 'LeagueSpartan_500Medium', '500': 'LeagueSpartan_500Medium', '600': 'LeagueSpartan_600SemiBold',
  '700': 'LeagueSpartan_600SemiBold', bold: 'LeagueSpartan_700Bold', '800': 'LeagueSpartan_700Bold', '900': 'LeagueSpartan_800ExtraBold',
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
