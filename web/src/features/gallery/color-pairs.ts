import { contrastRatio } from '@/lib/contrast';
import palette from '@/styles/palette.json';

export type ThemeVariant = 'light' | 'dark' | 'hcLight' | 'hcDark';

export const THEME_VARIANTS: readonly ThemeVariant[] = ['light', 'dark', 'hcLight', 'hcDark'];

/** `<div data-theme="...">` karşılıkları (tokens.css). */
export const VARIANT_ATTRIBUTE: Record<ThemeVariant, 'light' | 'dark' | 'hc-light' | 'hc-dark'> = {
  light: 'light',
  dark: 'dark',
  hcLight: 'hc-light',
  hcDark: 'hc-dark',
};

type ColorRole = keyof typeof palette.renkler;

/**
 * Galeride gösterilen metin çiftleri: [yazı rengi, zemin rengi]. Tamamı METİN çiftidir: normal temalarda
 * >= 4.5:1, yüksek kontrastta >= 7:1 olmalıdır (tests/token-kontrast.test.ts doğrular).
 */
export const GALLERY_PAIRS: ReadonlyArray<readonly [ColorRole, ColorRole]> = [
  ['on-surface', 'surface'],
  ['on-surface-variant', 'surface'],
  ['primary', 'surface'],
  ['on-primary', 'primary'],
  ['on-primary-container', 'primary-container'],
  ['on-secondary-container', 'secondary-container'],
  ['on-tertiary-container', 'tertiary-container'],
  ['on-success-container', 'success-container'],
  ['on-warning-container', 'warning-container'],
  ['on-error-container', 'error-container'],
  ['error', 'surface'],
  ['on-inverse-surface', 'inverse-surface'],
];

/** Bir çiftin seçilen varyanttaki gerçek kontrast oranı (paletten hesaplanır). */
export function pairRatio(variant: ThemeVariant, foreground: ColorRole, background: ColorRole): number {
  return contrastRatio(palette.renkler[foreground][variant], palette.renkler[background][variant]);
}
