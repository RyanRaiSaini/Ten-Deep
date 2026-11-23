import { Platform, Share } from 'react-native';

/** Share text with the system sheet; on the web without a share sheet, copy it instead. */
export async function shareText(message: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (Platform.OS === 'web') {
      const nav = globalThis.navigator as Navigator | undefined;
      if (nav?.share) { await nav.share({ text: message }); return 'shared'; }
      if (nav?.clipboard) { await nav.clipboard.writeText(message); return 'copied'; }
      return 'failed';
    }
    await Share.share({ message });
    return 'shared';
  } catch {
    return 'failed';
  }
}
