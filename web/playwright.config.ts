import { defineConfig, devices } from '@playwright/test';

/**
 * Uçtan uca (E2E) testler. Proje listesi plan 11.4'e göredir:
 * Android telefon (Chromium), iPhone (WebKit), masaüstü Chrome ve Firefox.
 *
 * Testler üretim derlemesine (`next build` + `next start`) karşı koşar; çünkü HSTS gibi bazı
 * başlıklar yalnızca üretimde vardır ve `next dev` CSP davranışı farklıdır.
 * Önce `npm run build` çalıştır (CI bunu zaten yapar).
 *
 * İki sunucu başlar (AYNI derleme): 3100 normal üretim davranışı (galeri KAPALI, `/galeri` 404);
 * 3101 `GALLERY=on` ile (bileşen galerisi açık, erişilebilirlik testleri için).
 *
 * Not: Playwright'ın WebKit'i gerçek Safari değildir. Gerçek iPhone denemesi insan ekibin işidir.
 */
const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const GALLERY_PORT = 3101;
const GALLERY_URL = `http://127.0.0.1:${GALLERY_PORT}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'android-telefon', use: { ...devices['Pixel 7'] } },
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
    { name: 'masaustu-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'masaustu-firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: [
    {
      command: `npm run start -- --port ${PORT}`,
      url: `${BASE_URL}/api/health`,
      reuseExistingServer: !isCI,
      timeout: 60_000,
      // Sunucuya Supabase anahtarı verilmez: uygulama bu durumda da çökmemelidir.
      env: { NEXT_TELEMETRY_DISABLED: '1', SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '' },
    },
    {
      command: `npm run start -- --port ${GALLERY_PORT}`,
      url: `${GALLERY_URL}/api/health`,
      reuseExistingServer: !isCI,
      timeout: 60_000,
      env: { NEXT_TELEMETRY_DISABLED: '1', GALLERY: 'on', SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '' },
    },
  ],
});
