import type { ComponentProps } from 'react';
import { StyleSheet, Text as RNText } from 'react-native';
import { FONT } from './theme';

/** Nunito ships one family per weight, so a fontWeight picks the matching family. */
const BY_WEIGHT: Record<string, string> = {
  '100': 'Nunito_600SemiBold', '200': 'Nunito_600SemiBold', '300': 'Nunito_600SemiBold', '400': 'Nunito_600SemiBold',
  normal: 'Nunito_600SemiBold', '500': 'Nunito_600SemiBold', '600': 'Nunito_600SemiBold',
  '700': 'Nunito_700Bold', bold: 'Nunito_700Bold', '800': 'Nunito_800ExtraBold', '900': 'Nunito_900Black',
};

/** Drop-in for React Native's Text with the game's fonts applied. */
export function Text({ style, ...rest }: ComponentProps<typeof RNText>) {
  const flat = StyleSheet.flatten(style) ?? {};
  const fontFamily = flat.fontFamily ?? BY_WEIGHT[String(flat.fontWeight ?? '600')] ?? FONT.body;
  return <RNText {...rest} style={[flat, { fontFamily, fontWeight: undefined }]} />;
}
