/** Squad Rating tier colors, like the card stats: purple elite, blue great, green good, amber average, dark red weak. */
export function squadColor(sr: number): string {
  return sr >= 91 ? '#7C3AED' : sr >= 88 ? '#2563EB' : sr >= 84 ? '#0B8F64' : sr >= 80 ? '#D97706' : '#9F1D2B';
}
