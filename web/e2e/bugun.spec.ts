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
 * Öğrenci "Bugün" ekranı (Ö1). Gerçek sayfa oturum ve plan verisi gerektirir; bu yüzden örnek verili geliştirme
 * önizlemesi (`/galeri/bugun`, yalnızca GALLERY=on sunucusunda) test edilir. Üretimde önizleme 404 vermelidir.
 */
test.describe('Bugün ekranı', { tag: '@kisa' }, () => {
  test('önizleme üretim sunucusunda kapalıdır (404)', async ({ page }) => {
    const response = await page.goto('/galeri/bugun');
    expect(response?.status()).toBe(404);
  });

  test.describe('önizleme (GALLERY=on)', () => {
    test.use({ baseURL: GALLERY_URL });

    for (const theme of STORED_THEMES) {
      test(`${theme.name} tema: WCAG A/AA ihlali yok`, async ({ page }) => {
        // Telefonda alttaki sabit gezinme, sayfanın alt kısmındaki bağlantıların üstüne biner; axe bunu "çakışan
        // hedef" sayar ama kullanıcı kaydırınca sorun kalmaz. Tüm içerik görünsün diye yükseklik büyütülür.
        const width = page.viewportSize()?.width ?? 412;
        await page.setViewportSize({ width, height: 2400 });
        await storeAppearance(page, theme.stored);
        await dismissCookieNotice(page);
        await page.goto('/galeri/bugun');
        await expect(page.getByRole('heading', { level: 1, name: 'Merhaba, Ela' })).toBeVisible();
        await expectNoAxeViolations(page);
      });
    }

    test('320 px ve %200 yazıda yatay kaydırma yok', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await dismissCookieNotice(page);
      await page.goto('/galeri/bugun');
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    test('mod değişince görev kartı güncellenir; kayıtlı mod yenilemeden sonra da geçerlidir', async ({ page }) => {
      await dismissCookieNotice(page);
      await page.goto('/galeri/bugun');
      await expect(page.getByRole('radio', { name: /5 dakika/ })).toBeChecked();
      await expect(page.getByText('5 dakikalık tekrar')).toBeVisible();

      await page.getByRole('radio', { name: /Tam ders/ }).click();
      await expect(page.getByText('Yaklaşık 25 dakika')).toBeVisible();

      await page.reload();
      await expect(page.getByRole('radio', { name: /Tam ders/ })).toBeChecked();
    });

    test('mod seçilmediyse cihaza hiçbir şey yazılmaz', async ({ page }) => {
      await dismissCookieNotice(page);
      await page.goto('/galeri/bugun');
      const stored = await page.evaluate(() => window.localStorage.getItem('ek-gunluk-mod'));
      expect(stored).toBeNull();
    });

    test('klavye: Boşluk ile mod seçilir ve "Göreve başla" odaklanabilir', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'WebKit düğme/radyo odağını Tab ile farklı sırayla verir.');
      await dismissCookieNotice(page);
      await page.goto('/galeri/bugun');
      await page.getByRole('radio', { name: /Tam ders/ }).focus();
      await page.keyboard.press('Space');
      await expect(page.getByRole('radio', { name: /Tam ders/ })).toBeChecked();
      await page.getByRole('link', { name: 'Göreve başla' }).focus();
      await expect(page.getByRole('link', { name: 'Göreve başla' })).toBeFocused();
    });
  });
});
