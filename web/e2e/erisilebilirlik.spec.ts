import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// WCAG 2.0 / 2.1 / 2.2, A ve AA düzeyleri (plan 11.4).
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.describe('erişilebilirlik (axe)', { tag: '@kisa' }, () => {
  test('ana sayfada WCAG A/AA ihlali yok', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([]);
  });

  test('404 sayfasında WCAG A/AA ihlali yok', async ({ page }) => {
    await page.goto('/boyle-bir-sayfa-yok');
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([]);
  });

  test('320 px genişlikte yatay kaydırma çıkmaz', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/');
    const tasma = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(tasma).toBeLessThanOrEqual(0);
  });

  // Kanarya testi: axe'in gerçekten çalıştığını gösterir. Bilerek erişilemez bir sayfayı yakalaması gerekir.
  // Bu test kırılırsa yukarıdaki "ihlal yok" sonuçlarına güvenilmez.
  test('kanarya: alt metni olmayan görseli axe yakalar', async ({ page }) => {
    await page.setContent('<!doctype html><html lang="tr"><head><title>Kanarya</title></head><body><main><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></main></body></html>');
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations.map((v) => v.id)).toContain('image-alt');
  });
});
