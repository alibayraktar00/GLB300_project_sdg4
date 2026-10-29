import { expect, test } from '@playwright/test';

import { dismissCookieNotice, expectNoAxeViolations, horizontalOverflow } from './yardimcilar';

/**
 * Giriş sayfaları (Faz A). Supabase projesi yokken de çalışır: eksik ayar uygulamayı çökertmez,
 * kullanıcıya genel bir hata gösterilir; ham ayar adı ya da ayrıntı sızmaz.
 */
test.describe('giriş sayfaları', { tag: '@kisa' }, () => {
  for (const { path, title } of [
    { path: '/giris', title: 'Giriş yap' },
    { path: '/giris/ogrenci', title: 'Öğrenci girişi' },
  ]) {
    test(`${path}: tek başlık, erişilebilirlik ihlali yok, yatay kaydırma yok`, async ({ page }) => {
      await dismissCookieNotice(page);
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expectNoAxeViolations(page);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });
  }

  test('"Bu cihazda oturumum açık kalsın" varsayılan olarak kapalıdır', async ({ page }) => {
    await page.goto('/giris');
    await expect(page.getByRole('switch', { name: 'Bu cihazda oturumum açık kalsın' })).not.toBeChecked();
  });

  test('geçersiz e-posta alan hatası verir ve hatayı alana bağlar', async ({ page }) => {
    await dismissCookieNotice(page);
    await page.goto('/giris');
    await page.getByLabel('E-posta adresi').fill('yanlis');
    await page.getByLabel('Şifre').fill('x');
    await page.getByRole('button', { name: 'Giriş yap' }).click();
    const email = page.getByLabel('E-posta adresi');
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('E-posta adresi geçerli görünmüyor.')).toBeVisible();
  });

  test('Supabase ayarı yokken giriş denemesi çökmez ve ayar ayrıntısı göstermez', async ({ page }) => {
    await dismissCookieNotice(page);
    await page.goto('/giris/ogrenci');
    await page.getByLabel('Kullanıcı adı').fill('mavikus');
    await page.getByLabel('Şifre').fill('x');
    await page.getByRole('button', { name: 'Giriş yap' }).click();
    // Next.js'in sayfa geçişi duyuru alanı da role=alert taşır; yalnızca bizim hata bandını seç.
    await expect(page.getByRole('alert').filter({ hasText: 'Giriş şu anda yapılamıyor' })).toBeVisible();
    await expect(page.getByText(/SUPABASE|sb_/)).toHaveCount(0);
  });

  test('oturum yokken korumalı alan girişe yönlendirir', async ({ page }) => {
    await page.goto('/ogrenci/bugun');
    await expect(page).toHaveURL(/\/giris/);
    await page.goto('/veli/cocuk-ekle');
    await expect(page).toHaveURL(/\/giris/);
  });
});

test.describe('veli kaydı', { tag: '@kisa' }, () => {
  test('/kayit/veli: tek başlık, erişilebilirlik ihlali yok, yatay kaydırma yok', async ({ page }) => {
    await dismissCookieNotice(page);
    await page.goto('/kayit/veli');
    await expect(page.getByRole('heading', { level: 1, name: 'Veli hesabı aç' })).toBeVisible();
    await expectNoAxeViolations(page);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test('iki onay işaretlenmeden devam edilemez; onaylar varsayılan olarak kapalıdır', async ({ page }) => {
    await dismissCookieNotice(page);
    await page.goto('/kayit/veli');
    await expect(page.getByRole('switch', { name: 'Aydınlatma metnini okudum, anladım' })).not.toBeChecked();
    await expect(page.getByRole('switch', { name: 'Kullanım koşullarını okudum' })).not.toBeChecked();
    await page.getByLabel('Adın').fill('Ayşe Yılmaz');
    await page.getByLabel('E-posta adresi').fill('veli@example.com');
    await page.getByLabel('Şifre', { exact: true }).fill('sifre12345');
    await page.getByRole('button', { name: 'Devam et' }).click();
    await expect(page.getByText('Devam etmek için metni okuduğunu işaretlemelisin.').first()).toBeVisible();
  });

  test('ad alanına telefon numarası yazılamaz', async ({ page }) => {
    await dismissCookieNotice(page);
    await page.goto('/kayit/veli');
    await page.getByLabel('Adın').fill('Ali 0555 123 45 67');
    await page.getByLabel('E-posta adresi').fill('veli@example.com');
    await page.getByLabel('Şifre', { exact: true }).fill('sifre12345');
    await page.getByRole('button', { name: 'Devam et' }).click();
    await expect(page.getByText('Ad yalnızca harf, boşluk, kesme işareti ve tire içerebilir.')).toBeVisible();
  });
});

test.describe('gönüllü başvurusu', { tag: '@kisa' }, () => {
  test('/basvuru: tek başlık, erişilebilirlik ihlali yok, yatay kaydırma yok', async ({ page }) => {
    await dismissCookieNotice(page);
    await page.goto('/basvuru');
    await expect(page.getByRole('heading', { level: 1, name: 'Gönüllü başvurusu' })).toBeVisible();
    await expectNoAxeViolations(page);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test('edu.tr olmayan e-posta reddedilir', async ({ page }) => {
    await dismissCookieNotice(page);
    await page.goto('/basvuru');
    await page.getByLabel('Adın', { exact: true }).fill('Ayşe');
    await page.getByLabel('Soyadın', { exact: true }).fill('Kaya');
    await page.getByLabel('Üniversite e-posta adresi').fill('ayse@gmail.com');
    await page.getByLabel('Şifre', { exact: true }).fill('sifre12345');
    await page.getByLabel('Üniversite', { exact: true }).fill('Ankara Üniversitesi');
    await page.getByLabel('Sınıf', { exact: true }).selectOption('3');
    await page.getByRole('button', { name: 'Devam et' }).click();
    await expect(page.getByText('Gönüllü olmak için edu.tr uzantılı üniversite e-postası gerekli.')).toBeVisible();
  });
});
