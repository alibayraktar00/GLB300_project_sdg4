import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

import palette from '../src/styles/palette.json' with { type: 'json' };

/** Galeri açık sunucunun adresi (playwright.config.ts: GALLERY=on ile başlayan ikinci sunucu). */
export const GALLERY_URL = 'http://127.0.0.1:3101';

// WCAG 2.0 / 2.1 / 2.2, A ve AA düzeyleri (plan 11.4).
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export type VariantId = 'light' | 'dark' | 'hcLight' | 'hcDark';

/** Dört temanın cihazda KAYITLI (kullanıcı değiştirmiş) görünümü: tests ile aynı biçim (src/lib/appearance.ts). */
export const STORED_THEMES: ReadonlyArray<{ id: VariantId; name: string; stored: Record<string, unknown> }> = [
  { id: 'light', name: 'açık', stored: { theme: 'light', highContrast: false, textScale: 1, reduceMotion: false } },
  { id: 'dark', name: 'koyu', stored: { theme: 'dark', highContrast: false, textScale: 1, reduceMotion: false } },
  {
    id: 'hcLight',
    name: 'açık yüksek kontrast',
    stored: { theme: 'light', highContrast: true, textScale: 1, reduceMotion: false },
  },
  {
    id: 'hcDark',
    name: 'koyu yüksek kontrast',
    stored: { theme: 'dark', highContrast: true, textScale: 1, reduceMotion: false },
  },
];

/** Sayfa açılmadan ÖNCE kullanıcının kayıtlı görünüm tercihini cihaza yazar (satır içi betik bunu okur). */
export async function storeAppearance(page: Page, stored: Record<string, unknown>) {
  await page.addInitScript((value) => {
    window.localStorage.setItem('ek-gorunum', JSON.stringify(value));
  }, stored);
}

/** Çerez bilgilendirme notunu "kapatılmış" yapar (axe gibi testlerde not yer kaplamasın). */
export async function dismissCookieNotice(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('ek-cerez-bilgi', '1');
  });
}

/** Tarayıcı özel özellik değerlerini kısaltır (#ffffff -> #fff); karşılaştırma için 6 haneye açar. */
export function normalizeHex(value: string): string {
  const hex = value.trim();
  // Büyük/küçük harf duyarsız eşleşme (i bayrağı); renk değerleri ASCII olduğundan Türkçe harf sorunu yoktur.
  return /^#[0-9a-f]{3}$/i.test(hex) ? `#${[...hex.slice(1)].map((c) => c + c).join('')}` : hex;
}

/** `--color-surface` değeri: hangi paletin geçerli olduğunu gösterir. */
export async function currentSurface(page: Page): Promise<string> {
  const value = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-surface'));
  return normalizeHex(value);
}

/** `--duration-*` gibi süre değişkenini milisaniye olarak okur (tarayıcı '0ms' yerine '0s', '.4s' döndürebilir). */
export async function durationMs(page: Page, name: string): Promise<number> {
  const value = await page.evaluate(
    (variable) => getComputedStyle(document.documentElement).getPropertyValue(variable).trim(),
    name,
  );
  return value.endsWith('ms') ? Number.parseFloat(value) : Number.parseFloat(value) * 1000;
}

export function expectedSurface(id: VariantId): string {
  return palette.renkler.surface[id];
}

export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = results.violations.map((violation) => ({
    id: violation.id,
    etki: violation.impact,
    ornek: violation.nodes.slice(0, 2).map((node) => node.target.join(' ')),
  }));
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
}

/** Yatay taşma (px): belge genişliği - görünür genişlik. 0 ya da altı olmalı. */
export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

/**
 * Tarayıcının yazı boyutu ayarını (kök yazı boyutu) öykünür: tüm rem boyutları birlikte ölçeklenir.
 * `addStyleTag` yerine CSSOM kullanılır: WebKit, CSP altında enjekte edilen stil dosyasını reddeder.
 */
export async function setRootFontSize(page: Page, size: string) {
  await page.evaluate((value) => document.documentElement.style.setProperty('font-size', value, 'important'), size);
}
