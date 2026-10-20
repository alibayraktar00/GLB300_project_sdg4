import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { contrastRatio } from '@/lib/contrast';
import palette from '@/styles/palette.json';

/**
 * Tasarım token'larının WCAG kontrastı (Flutter `theme_contrast_test`'in karşılığı; docs/tasarim-sistemi.md 2.2).
 * Normal temalar: metin >= 4.5:1, metin olmayan öğeler (çizgi, odak halkası) >= 3:1.
 * Yüksek kontrast: metin >= 7:1, metin olmayan öğeler >= 4.5:1.
 *
 * Değerler `src/styles/palette.json`'dadır; `tokens.css` renk bölümü ondan üretilir. Bu dosya hem paletin
 * kontrastını hem de tokens.css'in palete uygunluğunu doğrular.
 */

type Variant = 'light' | 'dark' | 'hcLight' | 'hcDark';
type Role = keyof typeof palette.renkler;

const VARIANTS: ReadonlyArray<{ id: Variant; name: string; hc: boolean }> = [
  { id: 'light', name: 'açık', hc: false },
  { id: 'dark', name: 'koyu', hc: false },
  { id: 'hcLight', name: 'açık yüksek kontrast', hc: true },
  { id: 'hcDark', name: 'koyu yüksek kontrast', hc: true },
];

const SURFACES: Role[] = [
  'surface',
  'surface-lowest',
  'surface-low',
  'surface-container',
  'surface-high',
  'surface-highest',
];

const TEXT_ON_SURFACE: Role[] = [
  'on-surface',
  'on-surface-variant',
  'primary',
  'secondary',
  'tertiary',
  'error',
  'success',
];

const TEXT_PAIRS: ReadonlyArray<readonly [Role, Role]> = [
  ['on-primary', 'primary'],
  ['on-primary-container', 'primary-container'],
  ['on-secondary', 'secondary'],
  ['on-secondary-container', 'secondary-container'],
  ['on-tertiary', 'tertiary'],
  ['on-tertiary-container', 'tertiary-container'],
  ['on-error', 'error'],
  ['on-error-container', 'error-container'],
  ['on-inverse-surface', 'inverse-surface'],
  ['inverse-primary', 'inverse-surface'],
  ['on-success', 'success'],
  ['on-success-container', 'success-container'],
  ['on-warning-container', 'warning-container'],
  ['on-surface', 'primary-container'],
  ['on-surface', 'secondary-container'],
  ['on-surface', 'error-container'],
  // Pasif düğme ve alan: pasif metin de okunur kalır (tokens.css: --color-disabled-on / --color-disabled-bg).
  ['on-surface-variant', 'surface-high'],
];

function color(role: Role, variant: Variant): string {
  return palette.renkler[role][variant];
}

for (const variant of VARIANTS) {
  const text = variant.hc ? 7 : 4.5;
  const nonText = variant.hc ? 4.5 : 3;

  describe(`kontrast: ${variant.name}`, () => {
    for (const surface of SURFACES) {
      for (const role of TEXT_ON_SURFACE) {
        it(`${role} / ${surface}: metin >= ${text}`, () => {
          expect(contrastRatio(color(role, variant.id), color(surface, variant.id))).toBeGreaterThanOrEqual(text);
        });
      }
      it(`outline / ${surface}: çizgi >= ${nonText}`, () => {
        expect(contrastRatio(color('outline', variant.id), color(surface, variant.id))).toBeGreaterThanOrEqual(nonText);
      });
    }

    for (const [foreground, background] of TEXT_PAIRS) {
      it(`${foreground} / ${background}: metin >= ${text}`, () => {
        expect(contrastRatio(color(foreground, variant.id), color(background, variant.id))).toBeGreaterThanOrEqual(text);
      });
    }

    it(`odak halkası (on-surface) ve birincil renk her yüzeyde >= ${nonText}`, () => {
      for (const surface of ['surface', 'surface-low', 'surface-container'] as Role[]) {
        expect(contrastRatio(color('on-surface', variant.id), color(surface, variant.id))).toBeGreaterThanOrEqual(nonText);
        expect(contrastRatio(color('primary', variant.id), color(surface, variant.id))).toBeGreaterThanOrEqual(nonText);
      }
    });

    it('ton kenarlıkları: yüksek kontrastta sayfa zemininden güçlü ayrışır, normalde süstür', () => {
      const borders: Role[] = ['border-subtle', 'border-primary', 'border-success', 'border-warning', 'border-error'];
      for (const border of borders) {
        const ratio = contrastRatio(color(border, variant.id), color('surface', variant.id));
        if (variant.hc) expect(ratio, border).toBeGreaterThanOrEqual(4.5);
      }
    });
  });
}

describe('palette.json yapısı', () => {
  it('her rolün dört varyantı da geçerli #rrggbb', () => {
    for (const [role, values] of Object.entries(palette.renkler)) {
      for (const id of ['light', 'dark', 'hcLight', 'hcDark'] as const) {
        expect(values[id], `${role}.${id}`).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it('beklenen rol adlarının hepsi vardır', () => {
    const roles = Object.keys(palette.renkler);
    for (const needed of [...SURFACES, ...TEXT_ON_SURFACE, 'outline', 'inverse-surface', 'inverse-primary', 'warning-container']) {
      expect(roles).toContain(needed);
    }
  });
});

describe('tokens.css palette.json ile uyumlu', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'styles', 'tokens.css'), 'utf8').replace(/\r\n/g, '\n');

  it('renkler bölümü güncel (npm run tokens)', () => {
    // Betik çıkış kodu 1 verirse (güncel değil) execFileSync hata fırlatır.
    expect(() =>
      execFileSync(process.execPath, ['scripts/generate-tokens.mjs', '--check'], { cwd: process.cwd(), stdio: 'pipe' }),
    ).not.toThrow();
  });

  it('her renk bloğu paletin TEK bir varyantının değerlerini taşır (karışık blok yok)', () => {
    const blocks = [...css.matchAll(/\{([^{}]*--color-surface:[^{}]*)\}/g)].map((match) => match[1] ?? '');
    expect(blocks.length).toBeGreaterThanOrEqual(9);

    for (const body of blocks) {
      const declared = Object.fromEntries(
        [...body.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6});/g)].map((match) => [match[1], match[2]]),
      );
      const matches = (['light', 'dark', 'hcLight', 'hcDark'] as const).filter((id) =>
        Object.entries(palette.renkler).every(([role, values]) => declared[role] === values[id]),
      );
      expect(matches, 'blok hiçbir varyantla birebir uyuşmuyor').toHaveLength(1);
    }
  });

  it('dört tema ve üç tetikleyici tanımlıdır', () => {
    for (const selector of [
      "[data-theme='light']",
      "[data-theme='dark']",
      "[data-theme='hc']",
      "[data-theme='hc-light']",
      "[data-theme='hc-dark']",
      ':root:not([data-theme])',
      '(prefers-color-scheme: dark)',
      '(prefers-contrast: more)',
    ]) {
      expect(css, selector).toContain(selector);
    }
    expect(css).toContain('(prefers-reduced-motion: reduce)');
    expect(css).toContain("data-motion='reduce'");
  });
});
