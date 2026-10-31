import { expect, test } from '@playwright/test';

// Güvenlik başlıkları ve "dış alan adına istek yok" kuralı (plan 9.1 ve 11.4, "Güvenlik" satırı).

test.describe('güvenlik başlıkları', { tag: '@kisa' }, () => {
  test('ana sayfa plan 9.1 başlıklarını gönderir', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();

    // CSP ZORUNLU modda; rapor modu başlığı artık gönderilmez.
    expect(headers['content-security-policy']).toContain("script-src 'self' 'nonce-");
    expect(headers['content-security-policy-report-only']).toBeUndefined();
    expect(headers['reporting-endpoints']).toBe('csp="/api/csp-report"');

    expect(headers['referrer-policy']).toBe('no-referrer');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
    expect(headers['permissions-policy']).toContain('microphone=()');
    expect(headers['strict-transport-security']).toBe('max-age=63072000; includeSubDomains');
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('CSP içindeki nonce, sayfadaki betiklerle eşleşir ve her istekte değişir', async ({ request }) => {
    const nonceOf = (csp: string) => /'nonce-([^']+)'/.exec(csp)?.[1];

    const first = await request.get('/');
    const second = await request.get('/');
    const nonce1 = nonceOf(first.headers()['content-security-policy'] ?? '');
    const nonce2 = nonceOf(second.headers()['content-security-policy'] ?? '');

    expect(nonce1).toBeTruthy();
    expect(nonce2).toBeTruthy();
    expect(nonce1).not.toBe(nonce2);

    const html = await first.text();
    expect(html).toContain(`nonce="${nonce1}"`);
    // Nonce'suz satır içi betik olmamalı: her <script> ya src taşır ya nonce.
    const scriptTags = html.match(/<script\b[^>]*>/g) ?? [];
    expect(scriptTags.length).toBeGreaterThan(0);
    for (const tag of scriptTags) {
      expect(tag, tag).toMatch(/nonce="|src=/);
    }
  });

  test('API yanıtları da güvenlik başlıklarını taşır', async ({ request }) => {
    const headers = (await request.get('/api/health')).headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('no-referrer');
  });

  test('oturum çerezi olan istek önbelleğe alınmaz (Cache-Control: no-store)', async ({ request }) => {
    const response = await request.get('/', { headers: { cookie: 'sb-ornekproje-auth-token=sahte' } });
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(response.status()).toBe(200); // Supabase ayarı yokken de çökmez
  });

  test('statik dosyalar nosniff ile gelir', async ({ page, request }) => {
    await page.goto('/');
    const scriptUrl = await page.locator('script[src^="/_next/static/"]').first().getAttribute('src');
    expect(scriptUrl).toBeTruthy();
    const headers = (await request.get(scriptUrl!)).headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
  });
});

test.describe('çocuk gizliliği: üçüncü taraf yok', { tag: '@kisa' }, () => {
  test('ana sayfa yalnızca kendi alan adına istek atar ve CSP ihlali oluşmaz', async ({ page, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const external: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) return;
      if (new URL(url).origin !== origin) external.push(url);
    });

    // Tarayıcının kendi CSP ihlali olayını yakala (Chromium, Firefox ve WebKit'te çalışır).
    await page.addInitScript(() => {
      const w = window as unknown as { __cspIhlalleri: string[] };
      w.__cspIhlalleri = [];
      document.addEventListener('securitypolicyviolation', (event) => {
        w.__cspIhlalleri.push(`${event.violatedDirective} ${event.blockedURI}`);
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(external).toEqual([]);
    const ihlaller = await page.evaluate(() => (window as unknown as { __cspIhlalleri: string[] }).__cspIhlalleri);
    expect(ihlaller).toEqual([]);
  });
});

test.describe('CSP rapor uç noktası', { tag: '@kisa' }, () => {
  test('geçerli raporu 204 ile kabul eder', async ({ request }) => {
    const response = await request.post('/api/csp-report', {
      headers: { 'content-type': 'application/csp-report' },
      data: JSON.stringify({ 'csp-report': { 'effective-directive': 'img-src', 'blocked-uri': 'inline', 'document-uri': 'http://x/' } }),
    });
    expect(response.status()).toBe(204);
  });

  test('yanlış içerik türünü, başka siteden gelen isteği ve bozuk gövdeyi reddeder', async ({ request }) => {
    const wrongType = await request.post('/api/csp-report', { headers: { 'content-type': 'text/plain' }, data: 'x' });
    expect(wrongType.status()).toBe(415);

    const foreign = await request.post('/api/csp-report', {
      headers: { 'content-type': 'application/csp-report', origin: 'https://baska-site.example' },
      data: '{}',
    });
    expect(foreign.status()).toBe(403);

    const broken = await request.post('/api/csp-report', {
      headers: { 'content-type': 'application/csp-report' },
      data: '{bozuk',
    });
    expect(broken.status()).toBe(400);
  });

  test('16 KB üstü gövdeyi reddeder (413)', async ({ request }) => {
    const response = await request.post('/api/csp-report', {
      headers: { 'content-type': 'application/csp-report' },
      data: JSON.stringify({ 'csp-report': { 'blocked-uri': 'a'.repeat(20_000) } }),
    });
    expect(response.status()).toBe(413);
  });

  test('GET kabul etmez', async ({ request }) => {
    expect((await request.get('/api/csp-report')).status()).toBe(405);
  });
});
