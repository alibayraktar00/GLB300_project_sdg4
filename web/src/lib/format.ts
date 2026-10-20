/** Yüzdeyi Türkçe yazımla verir: 0.3 -> "%30" (yüzde işareti önde). */
export function formatPercent(fraction: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'percent', maximumFractionDigits: 0 }).format(fraction);
}
