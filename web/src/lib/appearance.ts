/**
 * Görünüm tercihleri (Ayarlar > Görünüm ve erişilebilirlik; docs/tasarim-sistemi.md 2.4 ve 4.2).
 *
 * KURAL (hukuk, `cerez-politikasi.md`): tercih YALNIZCA kullanıcı bir ayarı değiştirdiğinde cihaza
 * (localStorage) yazılır. Varsayılanlar sistem ayarından okunur; hiçbir şey yazılmamışsa hiçbir şey
 * saklanmış değildir. Hiçbir zaman sunucuya gönderilmez (görünüm tercihi dolaylı sağlık ipucu olabilir).
 *
 * Bu dosya saf işlevlerden oluşur (depolama dışarıdan verilir); bu yüzden kolay test edilir.
 * Sayfa açılırken tercihi ilk boyamadan ÖNCE uygulayan satır içi betik `appearance-script.ts`'tedir.
 */

export const APPEARANCE_STORAGE_KEY = 'ek-gorunum';
export const COOKIE_NOTICE_STORAGE_KEY = 'ek-cerez-bilgi';

export type ThemeChoice = 'system' | 'light' | 'dark';
/** Kullanıcıya sunulan üç yazı boyutu kademesi (sistem/tarayıcı yazı boyutunun ÜSTÜNE çarpan). */
export type TextScale = 1 | 1.15 | 1.3;

export type Appearance = {
  theme: ThemeChoice;
  highContrast: boolean;
  textScale: TextScale;
  reduceMotion: boolean;
};

export const DEFAULT_APPEARANCE: Appearance = {
  theme: 'system',
  highContrast: false,
  textScale: 1,
  reduceMotion: false,
};

export const TEXT_SCALES: readonly TextScale[] = [1, 1.15, 1.3];

/** `<html>` üzerine yazılan öznitelikler. `undefined` = öznitelik yok (sistem/varsayılan). */
export type AppearanceAttributes = {
  'data-theme'?: 'light' | 'dark' | 'hc' | 'hc-light' | 'hc-dark';
  'data-text-scale'?: '1.15' | '1.3';
  'data-motion'?: 'reduce';
};

export function appearanceToAttributes(appearance: Appearance): AppearanceAttributes {
  const attributes: AppearanceAttributes = {};

  if (appearance.theme === 'system') {
    if (appearance.highContrast) attributes['data-theme'] = 'hc';
  } else {
    attributes['data-theme'] = appearance.highContrast ? `hc-${appearance.theme}` : appearance.theme;
  }

  if (appearance.textScale === 1.15) attributes['data-text-scale'] = '1.15';
  if (appearance.textScale === 1.3) attributes['data-text-scale'] = '1.3';
  if (appearance.reduceMotion) attributes['data-motion'] = 'reduce';

  return attributes;
}

/** Depodan okunan ham metni doğrular. Bozuk ya da yabancı değer varsa `null` (varsayılan geçerli). */
export function parseStoredAppearance(raw: string | null): Appearance | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const input = value as Record<string, unknown>;

  const theme: ThemeChoice = input.theme === 'light' || input.theme === 'dark' ? input.theme : 'system';
  const textScale: TextScale = input.textScale === 1.15 || input.textScale === 1.3 ? input.textScale : 1;
  return {
    theme,
    highContrast: input.highContrast === true,
    textScale,
    reduceMotion: input.reduceMotion === true,
  };
}

export function isDefaultAppearance(appearance: Appearance): boolean {
  return (
    appearance.theme === DEFAULT_APPEARANCE.theme &&
    appearance.highContrast === DEFAULT_APPEARANCE.highContrast &&
    appearance.textScale === DEFAULT_APPEARANCE.textScale &&
    appearance.reduceMotion === DEFAULT_APPEARANCE.reduceMotion
  );
}

/** Minimal depo arayüzü (`localStorage` bunu karşılar). */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readAppearance(storage: KeyValueStorage): Appearance {
  try {
    return parseStoredAppearance(storage.getItem(APPEARANCE_STORAGE_KEY)) ?? DEFAULT_APPEARANCE;
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

/**
 * Yalnızca kullanıcı bir ayarı DEĞİŞTİRİNCE çağrılır. Tüm değerler varsayılana dönerse anahtar silinir:
 * "hiçbir şey saklanmıyor" durumuna geri dönülür. Depo yazılamıyorsa (özel gezinti, kota) sessizce geçilir;
 * ayar o oturum için yine de uygulanır.
 */
export function saveAppearance(storage: KeyValueStorage, appearance: Appearance): void {
  try {
    if (isDefaultAppearance(appearance)) storage.removeItem(APPEARANCE_STORAGE_KEY);
    else storage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
  } catch {
    // Saklanamadı: ayar bu sayfa açıkken geçerli kalır.
  }
}

const ATTRIBUTE_NAMES = ['data-theme', 'data-text-scale', 'data-motion'] as const;

/** Öznitelikleri bir öğeye (genellikle `document.documentElement`) uygular; olmayanları kaldırır. */
export function applyAppearance(root: Element, appearance: Appearance): void {
  const attributes = appearanceToAttributes(appearance);
  for (const name of ATTRIBUTE_NAMES) {
    const value = attributes[name];
    if (value === undefined) root.removeAttribute(name);
    else root.setAttribute(name, value);
  }
}
