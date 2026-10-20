import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import {
  dismissCookieNotice,
  durationMs,
  expectNoAxeViolations,
  GALLERY_URL,
  horizontalOverflow,
  STORED_THEMES,
  storeAppearance,
  WCAG_TAGS,
} from './yardimcilar';

/**
 * Bileşen galerisi (`/galeri`): yalnızca geliştirmede açılır; üretimde 404 döner (plan 7.4).
 * Birinci sunucu (baseURL) normal üretim davranışıdır; ikinci sunucu (GALLERY_URL) GALLERY=on ile başlar.
 */

test.describe('galeri üretimde KAPALI', { tag: '@kisa' }, () => {
  test('/galeri 404 döner ve galerinin hiçbir içeriği sayfada yoktur', async ({ page }) => {
    const response = await page.goto('/galeri');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: 'Sayfa bulunamadı' })).toBeVisible();
    await expect(page.getByText('Bileşen galerisi')).toHaveCount(0);
  });

  test('rol parametresi ya da farklı yazımlar da 404 döner', async ({ request }) => {
    expect((await request.get('/galeri?rol=yonetici')).status()).toBe(404);
    expect((await request.get('/galeri/')).status()).toBe(404);
  });

  test('ana sayfada galeri bağlantısı yoktur', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /galeri/i })).toHaveCount(0);
    await expect(page.locator('a[href*="galeri"]')).toHaveCount(0);
  });
});

test.describe('galeri açık sunucuda (GALLERY=on)', () => {
  test.use({ baseURL: GALLERY_URL });

  test('ana sayfada geliştirici bağlantısı çıkar ve galeriyi açar', { tag: '@kisa' }, async ({ page }) => {
    await dismissCookieNotice(page);
    await page.goto('/');
    await page.getByRole('link', { name: 'Bileşen galerisi (geliştirici)' }).click();
    await expect(page).toHaveURL(/\/galeri$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Bileşen galerisi' })).toBeVisible();
  });

  for (const theme of STORED_THEMES) {
    test(`${theme.name} tema: tüm bileşenler WCAG A/AA ihlalsiz`, { tag: '@kisa' }, async ({ page }) => {
      await storeAppearance(page, theme.stored);
      await dismissCookieNotice(page);
      await page.goto('/galeri');
      await expect(page.getByRole('heading', { level: 1, name: 'Bileşen galerisi' })).toBeVisible();
      await expectNoAxeViolations(page);
    });
  }

  for (const role of ['ogrenci', 'veli', 'gonullu', 'yonetici']) {
    test(`rol iskeleti örnekleri (${role}) ihlalsiz`, async ({ page }) => {
      await dismissCookieNotice(page);
      await page.goto(`/galeri?rol=${role}`);
      await expectNoAxeViolations(page);
    });
  }

  test('yazı %200: galeri bileşenleri ihlalsiz ve yatay kaydırma yok (360 px)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await dismissCookieNotice(page);
    await page.goto('/galeri');
    await page.getByRole('radio', { name: '%200' }).check({ force: true });
    await expect(page.locator('html')).toHaveAttribute('data-text-scale', '2');
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    await expectNoAxeViolations(page);
  });

  for (const width of [320, 390]) {
    test(`${width} px genişlikte yatay kaydırma yok (4 tema)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      await dismissCookieNotice(page);
      for (const theme of STORED_THEMES) {
        await page.addInitScript((value) => window.localStorage.setItem('ek-gorunum', JSON.stringify(value)), theme.stored);
        await page.goto('/galeri');
        expect(await horizontalOverflow(page), theme.name).toBeLessThanOrEqual(0);
      }
    });
  }

  test('önizleme ayarları <html> özniteliklerini değiştirir ama cihaza HİÇBİR şey yazmaz', { tag: '@kisa' }, async ({ page }) => {
    await dismissCookieNotice(page);
    await page.goto('/galeri');
    const html = page.locator('html');

    await page.getByRole('radio', { name: 'Koyu' }).check({ force: true });
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('switch', { name: 'Yüksek kontrast' }).check({ force: true });
    await expect(html).toHaveAttribute('data-theme', 'hc-dark');

    await page.getByRole('radio', { name: '%130' }).check({ force: true });
    await expect(html).toHaveAttribute('data-text-scale', '1.3');

    await page.getByRole('switch', { name: 'Animasyonları azalt' }).check({ force: true });
    await expect(html).toHaveAttribute('data-motion', 'reduce');
    expect(await durationMs(page, '--duration-long')).toBe(0);

    // Hukuk kuralı: yalnızca (çerez notunu kapatan) tek anahtar var; görünüm tercihi YAZILMADI.
    expect(await page.evaluate(() => Object.keys(window.localStorage))).toEqual(['ek-cerez-bilgi']);

    await page.getByRole('radio', { name: 'Sistem' }).check({ force: true });
    await page.getByRole('switch', { name: 'Yüksek kontrast' }).uncheck({ force: true });
    await page.getByRole('radio', { name: '%100' }).check({ force: true });
    await page.getByRole('switch', { name: 'Animasyonları azalt' }).uncheck({ force: true });
    await expect(html).not.toHaveAttribute('data-theme', /.*/);
  });

  test('4 tema yan yana: her kutu kendi paletini gösterir ve gerçek oranlar yazılıdır', async ({ page }) => {
    await dismissCookieNotice(page);
    await page.goto('/galeri');
    const boxes = page.locator('[data-theme]').filter({ has: page.getByRole('heading', { level: 3 }) });
    await expect(boxes).toHaveCount(4);
    for (const label of ['Açık', 'Koyu', 'Açık yüksek kontrast', 'Koyu yüksek kontrast']) {
      await expect(page.getByRole('heading', { level: 3, name: label, exact: true })).toBeVisible();
    }
    // Koyu yüksek kontrast: on-surface / surface = 21.0:1 (siyah üstüne beyaz).
    const hcDark = page.locator('[data-theme="hc-dark"]');
    await expect(hcDark.getByText('on-surface / surface').locator('..')).toContainText('21.0:1');
  });

  test('AppShell: telefon düzeninde gezinme altta, geniş düzende solda ve etiketli', { tag: '@kisa' }, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await dismissCookieNotice(page);
    await page.goto('/galeri');

    const compact = page.getByRole('navigation', { name: /Ana gezinme \(Telefon/ });
    const wide = page.getByRole('navigation', { name: /Ana gezinme \(Geniş/ });
    await compact.scrollIntoViewIfNeeded();

    // Telefon (360 px): bağlantılar yan yana (aynı satır), etiket simgenin altında; gezinme çerçevenin alt kısmında.
    const compactBoxes = await compact.getByRole('link').evaluateAll((links) =>
      links.map((link) => {
        const r = link.getBoundingClientRect();
        return { left: r.left, top: r.top, height: r.height };
      }),
    );
    expect(compactBoxes).toHaveLength(4);
    expect(new Set(compactBoxes.map((box) => Math.round(box.top))).size).toBe(1);
    for (const box of compactBoxes) expect(box.height).toBeGreaterThanOrEqual(64);

    const compactFrame = await compact.evaluate((nav) => {
      const frame = nav.closest('[role="region"]') as HTMLElement;
      const nr = nav.getBoundingClientRect();
      const fr = frame.getBoundingClientRect();
      return { navBottom: nr.bottom, frameBottom: fr.bottom, navTop: nr.top, frameTop: fr.top };
    });
    expect(compactFrame.navTop - compactFrame.frameTop).toBeGreaterThan(100); // üstte değil
    expect(Math.abs(compactFrame.frameBottom - compactFrame.navBottom)).toBeLessThanOrEqual(8); // altta

    // Geniş (1024 px): bağlantılar alt alta, etiket simgenin YANINDA; gezinme içeriğin solunda.
    await wide.scrollIntoViewIfNeeded();
    const wideInfo = await wide.evaluate((nav) => {
      const links = [...nav.querySelectorAll('a')];
      const tops = links.map((link) => Math.round(link.getBoundingClientRect().top));
      const first = links[0] as HTMLElement;
      const icon = first.querySelector('svg')!.getBoundingClientRect();
      const label = first.querySelector('span:last-child')!.getBoundingClientRect();
      const main = nav.closest('[role="region"]')!.querySelector('[class*="main"]') as HTMLElement;
      return {
        stacked: new Set(tops).size === links.length,
        labelBesideIcon: label.left >= icon.right - 1 && Math.abs(label.top - icon.top) < 24,
        navLeftOfMain: nav.getBoundingClientRect().right <= main.getBoundingClientRect().left + 1,
        width: nav.getBoundingClientRect().width,
      };
    });
    expect(wideInfo.stacked).toBe(true);
    expect(wideInfo.labelBesideIcon).toBe(true);
    expect(wideInfo.navLeftOfMain).toBe(true);
    expect(wideInfo.width).toBeGreaterThanOrEqual(250);
  });

  test('AppShell: gezinmede seçili hedef aria-current ile işaretli ve etiketler hep görünür', async ({ page }) => {
    await dismissCookieNotice(page);
    await page.goto('/galeri?rol=yonetici');
    const nav = page.getByRole('navigation', { name: /Ana gezinme \(Telefon/ });
    await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1);
    await expect(nav.locator('a[aria-current="page"]')).toHaveText('Başvurular');
    for (const label of ['Başvurular', 'Eşleştirme', 'Şikayetler', 'Kullanıcılar', 'Denetim']) {
      await expect(nav.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('seçilebilir kart: klavyeyle odaklanınca halka görünür, ok tuşlarıyla seçim değişir', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari ok/Tab davranışı sistem ayarına bağlıdır.');
    await dismissCookieNotice(page);
    await page.goto('/galeri');
    const short = page.getByRole('radio', { name: /5 dakika/ });
    await short.focus();
    await page.keyboard.press('Tab'); // Odak ayrı bir öğeye geçmeden önce halka denenir:
    await short.focus();
    const ring = await short.evaluate((input) => {
      const face = input.nextElementSibling as HTMLElement;
      const style = getComputedStyle(face);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(ring.style).not.toBe('none');
    expect(ring.width).toBeGreaterThanOrEqual(3);
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name: /Tam ders/ })).toBeChecked();
  });

  test('bildirim örneği: canlı bölgede görünür, kendiliğinden kaybolmaz, "Tamam" kapatır', async ({ page }) => {
    await dismissCookieNotice(page);
    await page.goto('/galeri');
    await page.getByRole('button', { name: 'Bildirim göster' }).click();
    const region = page.getByRole('status', { name: 'Bildirimler' });
    await expect(region.getByText('Kaydedildi.')).toBeVisible();
    await page.waitForTimeout(5000);
    await expect(region.getByText('Kaydedildi.')).toBeVisible();
    await region.getByRole('button', { name: 'Tamam' }).click();
    await expect(region.getByText('Kaydedildi.')).toHaveCount(0);
  });

  test('yüklenen kaynaklar: dış alan adına istek ve CSP ihlali yok', async ({ page, baseURL }) => {
    const origin = new URL(baseURL ?? '').origin;
    const external: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (/^(data|blob|about):/.test(url)) return;
      if (new URL(url).origin !== origin) external.push(url);
    });
    await page.addInitScript(() => {
      const w = window as unknown as { __ihlal: string[] };
      w.__ihlal = [];
      document.addEventListener('securitypolicyviolation', (event) => w.__ihlal.push(`${event.violatedDirective} ${event.blockedURI}`));
    });
    await page.goto('/galeri');
    await page.waitForLoadState('networkidle');
    expect(external).toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { __ihlal: string[] }).__ihlal)).toEqual([]);
  });
});

test.describe('kanarya: axe gerçekten ihlal yakalıyor mu?', { tag: '@kisa' }, () => {
  // Bu testler kırılırsa "ihlal yok" sonuçlarına güvenilmez (axe çalışmıyor ya da kuralları kapalı olabilir).
  const bozuk = `<!doctype html><html lang="tr"><head><title>Kanarya</title>
    <style>body{background:#ffffff} .az{color:#cccccc}</style></head>
    <body><main>
      <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
      <p class="az">Okunması zor, düşük kontrastlı yazı</p>
      <button></button>
      <input type="text">
      <div role="button" onclick="void 0">Klavyeyle erişilemeyen</div>
    </main></body></html>`;

  test('alt metni olmayan görsel, düşük kontrast, adsız düğme ve etiketsiz alan yakalanır', async ({ page }) => {
    await page.setContent(bozuk);
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const ids = results.violations.map((violation) => violation.id);
    expect(ids).toContain('image-alt');
    expect(ids).toContain('color-contrast');
    expect(ids).toContain('button-name');
    expect(ids).toContain('label');
  });

  test('tema ihlali: koyu zeminde koyu yazı (kontrast) yakalanır', async ({ page }) => {
    await page.setContent(
      '<!doctype html><html lang="tr"><head><title>K</title><style>body{background:#14161f;color:#1f2230}</style></head><body><main><h1>Koyu üstüne koyu</h1><p>Okunmaz</p></main></body></html>',
    );
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations.map((violation) => violation.id)).toContain('color-contrast');
  });

  test('gerçek ana sayfa temiz, bozuk örnek kirli: ikisi farklı sonuç verir', async ({ page }) => {
    await dismissCookieNotice(page);
    await page.goto('/');
    const temiz = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    await page.setContent(bozuk);
    const kirli = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(temiz.violations).toHaveLength(0);
    expect(kirli.violations.length).toBeGreaterThanOrEqual(4);
  });
});
