import { expect, test, type Page } from '@playwright/test';

import { dismissCookieNotice, GALLERY_URL } from './yardimcilar';

/**
 * CSP zorunlu modda: sayfalar kendi betik, stil ve görsellerini yüklerken tarayıcı hiçbir ihlal bildirmemeli.
 * (Engellenen bir betik ya da stil, e-posta/şifre formu gibi işlevleri sessizce bozar.)
 */
async function collectViolations(page: Page, path: string): Promise<string[]> {
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      (window as unknown as { __csp: string[] }).__csp.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  await dismissCookieNotice(page);
  await page.goto(path);
  // networkidle yerine: sayfalar bağlantıları önceden getirir (prefetch) ve yük altında ağ hiç sakinleşmeyebilir.
  await page.waitForLoadState('load');
  await page.waitForTimeout(800);
  return page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
}

test.describe('CSP ihlali yok', { tag: '@kisa' }, () => {
  for (const path of ['/', '/giris', '/kayit/veli', '/basvuru', '/gizlilik']) {
    test(`${path}: ihlal yok`, async ({ page }) => {
      expect(await collectViolations(page, path)).toEqual([]);
    });
  }

  test.describe('önizleme sayfaları (GALLERY=on)', () => {
    test.use({ baseURL: GALLERY_URL });
    for (const path of ['/galeri', '/galeri/bugun', '/galeri/plan/olustur', '/galeri/sorular', '/galeri/dersler']) {
      test(`${path}: ihlal yok`, async ({ page }) => {
        expect(await collectViolations(page, path)).toEqual([]);
      });
    }
  });
});
