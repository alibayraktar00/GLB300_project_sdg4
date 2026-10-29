import { expect, test } from '@playwright/test';

import {
  dismissCookieNotice,
  expectNoAxeViolations,
  GALLERY_URL,
  horizontalOverflow,
  STORED_THEMES,
  storeAppearance,
} from './yardimcilar';

/**
 * Plan ekranları (Ö2 sihirbaz, Ö3 Planım). Gerçek sayfalar oturum ve plan verisi gerektirir; bu yüzden örnek
 * verili geliştirme önizlemeleri (`/galeri/plan`, `/galeri/plan/olustur`; yalnızca GALLERY=on) test edilir.
 * Üretimde önizlemeler 404 vermelidir; gerçek sayfalar oturumsuz girişe yönlendirir.
 */
test.describe('Plan ekranları', { tag: '@kisa' }, () => {
  test('önizlemeler üretim sunucusunda kapalıdır (404)', async ({ page }) => {
    for (const path of ['/galeri/plan', '/galeri/plan/olustur']) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
    }
  });

  test('oturum yokken gerçek plan sayfaları girişe yönlendirir', async ({ page }) => {
    await page.goto('/ogrenci/plan');
    await expect(page).toHaveURL(/\/giris/);
    await page.goto('/ogrenci/plan/olustur');
    await expect(page).toHaveURL(/\/giris/);
  });

  test.describe('önizleme (GALLERY=on)', () => {
    test.use({ baseURL: GALLERY_URL });

    for (const theme of STORED_THEMES) {
      test(`${theme.name} tema: Planım ve sihirbaz WCAG A/AA ihlalsiz`, async ({ page }) => {
        // Telefonda alttaki sabit gezinme sayfa altındaki bağlantıların üstüne biner (axe "çakışan hedef" sayar);
        // tüm içerik görünsün diye yükseklik büyütülür.
        const width = page.viewportSize()?.width ?? 412;
        await page.setViewportSize({ width, height: 2600 });
        await storeAppearance(page, theme.stored);
        await dismissCookieNotice(page);
        for (const path of ['/galeri/plan', '/galeri/plan/olustur']) {
          await page.goto(path);
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
          await expectNoAxeViolations(page);
        }
      });
    }

    test('320 px ve %200 yazıda yatay kaydırma yok', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await dismissCookieNotice(page);
      for (const path of ['/galeri/plan', '/galeri/plan/olustur']) {
        await page.goto(path);
        expect(await horizontalOverflow(page), path).toBeLessThanOrEqual(0);
      }
    });

    test('sihirbaz: 3 adım ve özet; hatalı tarih aralığı ilerletmez', async ({ page }) => {
      await dismissCookieNotice(page);
      await page.goto('/galeri/plan/olustur');
      await page.getByRole('button', { name: 'Devam' }).click();
      await expect(page.getByText('Sınıf seçilmeli.')).toBeVisible();

      await page.getByRole('radio', { name: '6. sınıf' }).click();
      await page.getByRole('switch', { name: 'Matematik' }).click();
      await page.getByRole('button', { name: 'Devam' }).click();
      await expect(page.getByText('Adım 2 / 3')).toBeVisible();

      await page.getByLabel('Başlangıç tarihi').fill('2026-11-02');
      await page.getByLabel('Bitiş tarihi').fill('2026-10-05');
      await page.getByRole('button', { name: 'Devam' }).click();
      await expect(page.getByText('Bitiş tarihi başlangıçtan önce olamaz.')).toBeVisible();

      await page.getByLabel('Bitiş tarihi').fill('2026-11-09');
      await page.getByRole('button', { name: 'Devam' }).click();
      await expect(page.getByText('Adım 3 / 3')).toBeVisible();
      await page.getByRole('radio', { name: 'Günde 2 konu' }).click();
      await page.getByRole('button', { name: 'Devam' }).click();
      await expect(page.getByText(/6\. sınıf · Matematik · 2 Kas 2026 - 9 Kas 2026 · günde 2 konu/)).toBeVisible();
      await page.getByRole('button', { name: 'Geri' }).click();
      await expect(page.getByText('Adım 3 / 3')).toBeVisible();
    });
  });
});
