import { expect, test, type Page } from '@playwright/test';

import {
  currentSurface,
  dismissCookieNotice,
  durationMs,
  expectedSurface,
  expectNoAxeViolations,
  horizontalOverflow,
  setRootFontSize,
  STORED_THEMES,
  storeAppearance,
  type VariantId,
} from './yardimcilar';

/**
 * Tasarım sistemi: ana sayfa ve yardımcı sayfalar (docs/tasarim-sistemi.md, plan 9.4 ve 11.4).
 * Galeri ayrı dosyadadır (e2e/galeri.spec.ts). Burada: 4 tema, sistem ayarı uyumu, yanıp sönme yok,
 * çerez bilgilendirme notu, 320 px ve %200 yazı, klavye odağı, Windows yüksek kontrast, animasyonları azalt.
 */

test.describe('ana sayfa: erişilebilirlik (axe), 4 tema', { tag: '@kisa' }, () => {
  for (const theme of STORED_THEMES) {
    test(`${theme.name} tema: WCAG A/AA ihlali yok`, async ({ page }) => {
      await storeAppearance(page, theme.stored);
      await dismissCookieNotice(page);
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', /./);
      expect(await currentSurface(page)).toBe(expectedSurface(theme.id));
      await expectNoAxeViolations(page);
    });
  }

  test('çerez notu görünürken de ihlal yok (ilk ziyaret)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Çerez bilgilendirmesi' })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('hata ve 404 sayfaları 4 temada ihlalsiz', async ({ page }) => {
    await dismissCookieNotice(page);
    for (const theme of STORED_THEMES) {
      await page.addInitScript((value) => window.localStorage.setItem('ek-gorunum', JSON.stringify(value)), theme.stored);
      await page.goto('/boyle-bir-sayfa-yok');
      await expect(page.getByRole('heading', { level: 1, name: 'Sayfa bulunamadı' })).toBeVisible();
      await expectNoAxeViolations(page);
    }
  });

  test('gizlilik ve çerez sayfaları (yer tutucu) ihlalsiz ve altbilgiden ulaşılır', async ({ page }) => {
    await dismissCookieNotice(page);
    await page.goto('/');
    await page.getByRole('link', { name: 'Gizlilik' }).click();
    await expect(page).toHaveURL(/\/gizlilik$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Gizlilik Politikası' })).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole('link', { name: 'Çerezler' }).click();
    await expect(page).toHaveURL(/\/cerezler$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Çerez ve Cihaz Belleği Politikası' })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});

test.describe('tema tetikleyicileri: sistem ayarı ve uygulama içi seçim', { tag: '@kisa' }, () => {
  type Scenario = {
    name: string;
    system?: { colorScheme?: 'light' | 'dark'; contrast?: 'more' };
    stored?: Record<string, unknown>;
    expected: VariantId;
  };

  const base = { textScale: 1, reduceMotion: false };
  const scenarios: Scenario[] = [
    { name: 'sistem açık', system: { colorScheme: 'light' }, expected: 'light' },
    { name: 'sistem koyu', system: { colorScheme: 'dark' }, expected: 'dark' },
    { name: 'sistem açık + yüksek kontrast isteği', system: { colorScheme: 'light', contrast: 'more' }, expected: 'hcLight' },
    { name: 'sistem koyu + yüksek kontrast isteği', system: { colorScheme: 'dark', contrast: 'more' }, expected: 'hcDark' },
    { name: 'kayıtlı açık, sistem koyu', system: { colorScheme: 'dark' }, stored: { ...base, theme: 'light', highContrast: false }, expected: 'light' },
    { name: 'kayıtlı koyu, sistem açık', system: { colorScheme: 'light' }, stored: { ...base, theme: 'dark', highContrast: false }, expected: 'dark' },
    { name: 'kayıtlı yüksek kontrast (sistem şeması), sistem açık', system: { colorScheme: 'light' }, stored: { ...base, theme: 'system', highContrast: true }, expected: 'hcLight' },
    { name: 'kayıtlı yüksek kontrast (sistem şeması), sistem koyu', system: { colorScheme: 'dark' }, stored: { ...base, theme: 'system', highContrast: true }, expected: 'hcDark' },
    { name: 'kayıtlı açık + yüksek kontrast, sistem koyu', system: { colorScheme: 'dark' }, stored: { ...base, theme: 'light', highContrast: true }, expected: 'hcLight' },
    { name: 'kayıtlı koyu, sistem yüksek kontrast istiyor', system: { colorScheme: 'light', contrast: 'more' }, stored: { ...base, theme: 'dark', highContrast: false }, expected: 'hcDark' },
    { name: 'kayıtlı açık, sistem yüksek kontrast istiyor', system: { colorScheme: 'dark', contrast: 'more' }, stored: { ...base, theme: 'light', highContrast: false }, expected: 'hcLight' },
  ];

  for (const scenario of scenarios) {
    test(scenario.name, async ({ page }) => {
      if (scenario.stored) await storeAppearance(page, scenario.stored);
      await page.emulateMedia({
        colorScheme: scenario.system?.colorScheme ?? 'light',
        contrast: scenario.system?.contrast ?? 'no-preference',
      });
      await page.goto('/');
      expect(await currentSurface(page)).toBe(expectedSurface(scenario.expected));
    });
  }

  test('kayıt yoksa HİÇBİR şey cihaza yazılmaz (yalnızca kullanıcı değiştirince saklanır)', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => window.localStorage.length)).toBe(0);
    expect(await page.evaluate(() => window.sessionStorage.length)).toBe(0);
    expect(await context.cookies()).toEqual([]);
  });
});

test.describe('ilk boyamadan önce uygulanır (tema yanıp sönmez)', { tag: '@kisa' }, () => {
  test('kayıtlı tema, <body> oluşmadan <html>e yazılır', async ({ page }) => {
    await storeAppearance(page, { theme: 'dark', highContrast: true, textScale: 1.3, reduceMotion: true });
    await page.addInitScript(() => {
      const w = window as unknown as { __ilk: Record<string, string | null> };
      // Başlangıç betikleri <html> oluşmadan çalışır: gözlem `document` üzerinden yapılır; <body> eklendiği an okunur.
      new MutationObserver((_records, observer) => {
        if (document.body) {
          const root = document.documentElement;
          w.__ilk = {
            theme: root.getAttribute('data-theme'),
            scale: root.getAttribute('data-text-scale'),
            motion: root.getAttribute('data-motion'),
          };
          observer.disconnect();
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto('/');
    const ilk = await page.evaluate(() => (window as unknown as { __ilk: Record<string, string | null> }).__ilk);
    expect(ilk).toEqual({ theme: 'hc-dark', scale: '1.3', motion: 'reduce' });
  });

  test('çerez notu daha önce kapatıldıysa hiç görünmez', async ({ page }) => {
    await dismissCookieNotice(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-cerez', 'tamam');
    await expect(page.getByRole('region', { name: 'Çerez bilgilendirmesi' })).toBeHidden();
  });
});

test.describe('çerez bilgilendirme notu', { tag: '@kisa' }, () => {
  test('ilk ziyarette görünür; "Tamam" kapatır, yalnızca bu bilgi saklanır, yenilemede görünmez', async ({ page }) => {
    await page.goto('/');
    const note = page.getByRole('region', { name: 'Çerez bilgilendirmesi' });
    await expect(note).toBeVisible();
    await expect(note.getByRole('button')).toHaveCount(1);
    await expect(note.getByRole('button', { name: 'Tamam' })).toBeVisible();
    await expect(note).not.toContainText(/kabul|reddet/i);
    await expect(note.getByRole('link', { name: 'Çerez Politikası' })).toHaveAttribute('href', '/cerezler');

    await note.getByRole('button', { name: 'Tamam' }).click();
    await expect(note).toBeHidden();
    expect(await page.evaluate(() => Object.keys(window.localStorage))).toEqual(['ek-cerez-bilgi']);

    await page.reload();
    await expect(page.getByRole('region', { name: 'Çerez bilgilendirmesi' })).toBeHidden();
  });

  test('sayfayı engellemez: not açıkken içerik etkileşimli ve diyalog yok', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Çerez bilgilendirmesi' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: /Veliyim/ }).click();
    await expect(page.getByRole('status').getByText('Giriş çok yakında açılacak.')).toBeVisible();
  });

  test('ilk yüklemede düzen kayması (CLS) küçüktür (yalnızca Chromium ölçer)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const cls = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let total = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean }>) {
              if (!entry.hadRecentInput) total += entry.value;
            }
          }).observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => resolve(total), 500);
        }),
    ).catch(() => 0);
    expect(cls).toBeLessThanOrEqual(0.1);
  });
});

test.describe('yatay kaydırma yok (WCAG 1.4.10 yeniden akış)', { tag: '@kisa' }, () => {
  for (const url of ['/', '/boyle-bir-sayfa-yok', '/gizlilik', '/cerezler']) {
    test(`320 px genişlikte ${url}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(url);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });
  }

  test('320 px + yüksek kontrast + koyu + %130 yazı (en kötü uygulama içi birleşim)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await storeAppearance(page, { theme: 'dark', highContrast: true, textScale: 1.3, reduceMotion: true });
    await page.goto('/');
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

/** Görünür hiçbir öğenin sağ kenarı pencereden taşmamalı (yatay kaydırma olmasa bile kırpılma olabilir). */
async function overflowingElements(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const bad: string[] = [];
    for (const element of document.body.querySelectorAll<HTMLElement>('*')) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (getComputedStyle(element).position === 'fixed') continue;
      if (rect.right > width + 1 || rect.left < -1) {
        bad.push(`${element.localName}.${String(element.className).split(' ')[0]} (${Math.round(rect.left)}-${Math.round(rect.right)})`);
      }
    }
    return bad;
  });
}

test.describe('yazı büyütme: %200 ve %400', { tag: '@kisa' }, () => {
  for (const width of [320, 390, 768]) {
    test(`yazı boyutu %200, ${width} px: taşma ve kırpılma yok`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await dismissCookieNotice(page);
      await page.goto('/');
      await setRootFontSize(page, '200%');
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      expect(await overflowingElements(page)).toEqual([]);
      // Düğme kartları metni kesmez: kartın yüksekliği içeriğine uyar (sabit yükseklik yok).
      const cards = page.getByRole('button', { name: /Veliyim|Gönüllüyüm|Öğrenciyim/ });
      for (let i = 0; i < 3; i += 1) {
        const handle = await cards.nth(i).elementHandle();
        const clipped = await handle?.evaluate((el) => el.scrollHeight > el.clientHeight + 1);
        expect(clipped).toBe(false);
      }
    });
  }

  test('yazı boyutu %400 (en büyük): 320 px genişlikte yeniden akar, yatay kaydırma yok', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await dismissCookieNotice(page);
    await page.goto('/');
    await setRootFontSize(page, '400%');
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test('uygulama içi %130 yazı: tüm öğeler büyür (rem), düzen bozulmaz', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await dismissCookieNotice(page);
    await page.goto('/');
    const normal = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    await page.evaluate(() => document.documentElement.setAttribute('data-text-scale', '1.3'));
    const bigger = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    expect(bigger / normal).toBeCloseTo(1.3, 2);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('klavye: odak görünür ve mantıklı sırada', { tag: '@kisa' }, () => {
  test('ilk Tab "İçeriğe geç" bağlantısını görünür kılar; Enter ana alana odak verir', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari varsayılan olarak Tab ile bağlantılara odaklanmaz (sistem ayarı gerekir).');
    await dismissCookieNotice(page);
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'İçeriğe geç' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('icerik');
  });

  test('Tab ile gezilen her öğenin odak halkası görünür (>= 3 px) ve ekrandadır', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari varsayılan olarak Tab ile bağlantılara odaklanmaz (sistem ayarı gerekir).');
    await page.goto('/');
    const seen: string[] = [];
    for (let i = 0; i < 9; i += 1) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          name: (el.textContent ?? '').trim().slice(0, 30) || el.tagName,
          outlineStyle: style.outlineStyle,
          outlineWidth: parseFloat(style.outlineWidth),
          inView: rect.bottom > 0 && rect.top < window.innerHeight,
        };
      });
      if (!info) continue;
      seen.push(info.name);
      expect(info.outlineStyle, info.name).not.toBe('none');
      expect(info.outlineWidth, info.name).toBeGreaterThanOrEqual(3);
      expect(info.inView, info.name).toBe(true);
    }
    // Atlama bağlantısı, çerez bağlantısı ve "Tamam", üç seçenek, galeri değil (üretim), altbilgi bağlantıları.
    expect(seen.length).toBeGreaterThanOrEqual(8);
  });

  test('yüksek kontrastta odak halkası 4 px', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari varsayılan olarak Tab ile bağlantılara odaklanmaz (sistem ayarı gerekir).');
    await storeAppearance(page, { theme: 'light', highContrast: true, textScale: 1, reduceMotion: false });
    await dismissCookieNotice(page);
    await page.goto('/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const width = await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement as HTMLElement).outlineWidth));
    expect(width).toBeGreaterThanOrEqual(4);
  });

  test('Enter ve Boşluk ile kart düğmeleri çalışır (klavye tek başına yeterli)', async ({ page }) => {
    await dismissCookieNotice(page);
    await page.goto('/');
    const card = page.getByRole('button', { name: /Öğrenciyim/ });
    await card.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status').getByText('Giriş çok yakında açılacak.')).toBeVisible();
    // "Tamam" ile kapanır (bildirim kendiliğinden kaybolmaz).
    await page.getByRole('status').getByRole('button', { name: 'Tamam' }).click();
    await expect(page.getByRole('status').getByText('Giriş çok yakında açılacak.')).toHaveCount(0);
    await page.getByRole('button', { name: /Veliyim/ }).focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('status').getByText('Giriş çok yakında açılacak.')).toBeVisible();
  });
});

test.describe('bildirim kendiliğinden kaybolmaz ve canlı bölgededir', { tag: '@kisa' }, () => {
  test('bildirim 6 sn sonra da durur (zaman aşımı yok)', async ({ page }) => {
    await dismissCookieNotice(page);
    await page.goto('/');
    const region = page.getByRole('status');
    await expect(region).toHaveAttribute('aria-live', 'polite');
    await page.getByRole('button', { name: /Gönüllüyüm/ }).click();
    await expect(region.getByText('Giriş çok yakında açılacak.')).toBeVisible();
    await page.waitForTimeout(6000);
    await expect(region.getByText('Giriş çok yakında açılacak.')).toBeVisible();
  });
});

test.describe('Windows yüksek kontrast (forced-colors)', () => {
  test('sınırlar ve odak halkası sistem renkleriyle görünür kalır; ihlal yok', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit forced-colors öykünmesini desteklemiyor.');
    await dismissCookieNotice(page);
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/');
    expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);

    // Kart düğmesinin kenarlığı vardır (saydam bile olsa sistem renginde çizilir).
    const border = await page.getByRole('button', { name: /Veliyim/ }).evaluate((el) => {
      const style = getComputedStyle(el);
      return { width: parseFloat(style.borderTopWidth), style: style.borderTopStyle };
    });
    expect(border.style).not.toBe('none');
    expect(border.width).toBeGreaterThan(0);

    await page.getByRole('button', { name: /Veliyim/ }).focus();
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement as HTMLElement);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThanOrEqual(3);
    await expectNoAxeViolations(page);
  });
});

test.describe('animasyonları azalt', { tag: '@kisa' }, () => {
  test('işletim sistemi ayarı: hareket süreleri 0 ms olur', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    expect(await durationMs(page, '--duration-long')).toBe(0);
  });

  test('uygulama içi seçim: hareket süreleri 0 ms olur', async ({ page }) => {
    await storeAppearance(page, { theme: 'system', highContrast: false, textScale: 1, reduceMotion: true });
    await page.goto('/');
    expect(await durationMs(page, '--duration-short')).toBe(0);
  });

  test('ayar yokken süreler normaldir', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    expect(await durationMs(page, '--duration-long')).toBe(400);
  });
});

test.describe('yazı tipi: kendi kökenimizden, Türkçe harfler', { tag: '@kisa' }, () => {
  test('yazı tipleri kendi sunucumuzdan gelir ve yalnızca Regular önceden yüklenir (Link başlığı)', async ({ page, request, baseURL }) => {
    const preload = (await request.get('/')).headers()['link'] ?? '';
    expect(preload).toContain('rel=preload');
    expect(preload).toMatch(/Regular/);
    expect(preload).not.toMatch(/SemiBold|Bold/);

    const fonts: string[] = [];
    page.on('response', (response) => {
      if (/\.woff2?(\?|$)/.test(response.url())) fonts.push(response.url());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(fonts.length).toBeGreaterThanOrEqual(1);
    for (const url of fonts) expect(new URL(url).origin).toBe(new URL(baseURL ?? '').origin);
    expect(fonts.some((url) => /Regular/.test(url))).toBe(true);
  });

  test('Türkçe harfler gerçek yazı tipiyle çizilir (sistem yazı tipine düşmez)', async ({ page }) => {
    await page.goto('/');
    const loaded = await page.evaluate(async () => {
      await document.fonts.load('400 16px atkinson', 'ğĞıİşŞçÇöÖüÜâîû');
      return [...document.fonts]
        .filter((face) => face.family.replace(/"/g, '') === 'atkinson' && face.status === 'loaded')
        .map((face) => face.weight);
    });
    expect(loaded).toContain('400');
  });
});
