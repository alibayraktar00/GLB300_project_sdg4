/**
 * WCAG 2.x kontrast oranı: (açık + 0.05) / (koyu + 0.05), 1 ile 21 arası.
 * Galeri (gösterim) ve token testi (doğrulama) aynı işlevi kullanır.
 *
 * Eşikler: normal metin >= 4.5, büyük metin ve arayüz bileşenleri >= 3; yüksek kontrastta metin >= 7.
 */

/** `#rrggbb` (ya da `#rgb`) rengini 0-255 aralığında [r, g, b] olarak okur. */
export function parseHex(hex: string): [number, number, number] {
  const clean = hex.trim().replace(/^#/, '');
  const full = clean.length === 3 ? [...clean].map((c) => c + c).join('') : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Geçersiz renk: "${hex}"`);
  const value = Number.parseInt(full, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Göreli parlaklık (0 siyah, 1 beyaz). */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}
