import { createContext, useContext, type ComponentProps } from 'react';
import { StyleSheet, Text as RNText } from 'react-native';

/**
 * Body text is Barlow (SIL OFL): a slightly narrow grotesque with a sports-broadcast feel that pairs with
 * Barlow Condensed for titles. It ships one family per weight, so a fontWeight picks the matching family.
 */
const BY_WEIGHT: Record<string, string> = {
  '100': 'Barlow_500Medium', '200': 'Barlow_500Medium', '300': 'Barlow_500Medium', '400': 'Barlow_500Medium',
  normal: 'Barlow_500Medium', '500': 'Barlow_500Medium', '600': 'Barlow_600SemiBold',
  '700': 'Barlow_700Bold', bold: 'Barlow_700Bold', '800': 'Barlow_800ExtraBold', '900': 'Barlow_800ExtraBold',
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
