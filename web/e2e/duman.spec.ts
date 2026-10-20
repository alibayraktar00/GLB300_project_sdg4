import { expect, test } from '@playwright/test';

// "@kisa" etiketi: her PR'da çalışan kısa set (plan 11.4). Çalıştırma: npm run test:e2e:kisa

test.describe('duman testi', { tag: '@kisa' }, () => {
  test('ana sayfa Türkçe açılır ve tek başlık gösterir', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    await expect(page).toHaveTitle('Eğitim Köprüsü');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Eğitim Köprüsü');
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('sağlık kontrolü ok döner ve önbelleğe alınmaz', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(response.headers()['cache-control']).toContain('no-store');
  });

  test('olmayan sayfa Türkçe 404 gösterir', async ({ page }) => {
    const response = await page.goto('/boyle-bir-sayfa-yok');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sayfa bulunamadı');
  });

  test('arama motorlarına kapalıdır (robots.txt ve meta)', async ({ page, request }) => {
    const robots = await request.get('/robots.txt');
    expect(await robots.text()).toMatch(/Disallow:\s*\//);

    await page.goto('/');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('sayfa hiç JavaScript hatası vermez', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });
});
