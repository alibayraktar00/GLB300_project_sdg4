import { expect, test } from '@playwright/test';

import { dismissCookieNotice, expectNoAxeViolations, GALLERY_URL, horizontalOverflow, STORED_THEMES, storeAppearance } from './yardimcilar';

/**
 * Soru-cevap ve ders ekranları. Gerçek sayfalar oturum ve veri ister; bu yüzden örnek verili geliştirme
 * önizlemeleri (`/galeri/sorular`, `/galeri/dersler`; yalnızca GALLERY=on sunucusunda) test edilir.
 * Üretimde önizlemeler 404 vermelidir; gerçek sayfalar oturumsuz kullanıcıyı girişe gönderir.
 */
const PAGES = [
  { path: '/galeri/sorular', heading: 'Sorularım' },
  { path: '/galeri/dersler', heading: 'Dersler' },
];

test.describe('Soru ve ders ekranları', { tag: '@kisa' }, () => {
  for (const { path } of PAGES) {
    test(`önizleme ${path} üretim sunucusunda kapalıdır (404)`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
    });
  }

  for (const path of ['/ogrenci/sorular', '/ogrenci/dersler', '/gonullu/dersler', '/veli/dersler', '/veli/ozet', '/gonullu/taahhut', '/yonetici/sikayetler', '/yonetici/basvurular']) {
    test(`oturumsuz ${path} girişe yönlendirir`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/giris/);
    });
  }

  test.describe('önizleme (GALLERY=on)', () => {
    test.use({ baseURL: GALLERY_URL });

    for (const { path, heading } of PAGES) {
      for (const theme of STORED_THEMES) {
        test(`${path} · ${theme.name} tema: WCAG A/AA ihlali yok`, async ({ page }) => {
          const width = page.viewportSize()?.width ?? 412;
          await page.setViewportSize({ width, height: 2400 });
          await storeAppearance(page, theme.stored);
          await dismissCookieNotice(page);
          await page.goto(path);
          await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
          await expectNoAxeViolations(page);
        });
      }

      test(`${path} · 320 px'te yatay kaydırma yok`, async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 640 });
        await dismissCookieNotice(page);
        await page.goto(path);
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      });
    }

    test('sorular: liste durumu yazıyla verir ve konuşma sırayla görünür', async ({ page }) => {
      await dismissCookieNotice(page);
      await page.goto('/galeri/sorular');
      await expect(page.getByRole('link', { name: /Cevap geldi/ })).toBeVisible();
      await expect(page.getByRole('link', { name: /Cevaplayacak gönüllü aranıyor/ })).toBeVisible();
      await expect(page.getByText('3x + 5 = 20 denkleminde x kaçtır?')).toBeVisible();
      await expect(page.getByText('Bu mesaj gizlendi.')).toBeVisible();
    });

    test('dersler: planlı derste katıl bağlantısı yeni sekmede açılır ve iptal gerekçesi listeden seçilir', async ({ page }) => {
      await dismissCookieNotice(page);
      await page.goto('/galeri/dersler');
      const join = page.getByRole('link', { name: /Derse katıl/ });
      await expect(join).toHaveAttribute('href', 'https://meet.google.com/abc-defg-hij');
      await expect(join).toHaveAttribute('target', '_blank');
      await expect(join).toHaveAttribute('rel', /noopener/);
      await expect(page.getByLabel('İptal nedeni')).toHaveValue('zaman_uygun_degil');
      await expect(page.getByRole('button', { name: 'Dersi iptal et' })).toBeVisible();
    });
  });
});
