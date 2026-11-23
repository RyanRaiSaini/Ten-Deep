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

/** Copy to the clipboard (true on success). */
export async function copyText(text: string): Promise<boolean> {
  try {
    const Clipboard = await import('expo-clipboard');
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}

/** Read the clipboard ('' if empty or not allowed). */
export async function pasteText(): Promise<string> {
  try {
    const Clipboard = await import('expo-clipboard');
    return (await Clipboard.getStringAsync()) ?? '';
  } catch {
    return '';
  }
}
