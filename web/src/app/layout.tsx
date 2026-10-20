import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';

import { CookieNotice } from '@/components/CookieNotice';
import { NoticeProvider } from '@/components/Notice';
import { SkipLink } from '@/components/SkipLink';
import { appearanceScript } from '@/lib/appearance-script';
import palette from '@/styles/palette.json';
import { tr } from '@/strings/tr';

import { atkinsonHeavy, atkinson } from './fonts';

import '@/styles/reset.css';
import '@/styles/tokens.css';
import '@/styles/global.css';

/**
 * Her sayfa isteğe göre sunucuda üretilir. Bu bilinçli bir karardır: nonce'lu CSP her istekte
 * yeni bir nonce ister, statik üretilen sayfa nonce alamaz (plan 3.2 ve 9.1). Bu satırı silme.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: tr.appName,
  description: tr.home.description,
  applicationName: tr.appName,
  // Uygulama arama motorlarına kapalıdır (plan 9.1, madde 14).
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Yakınlaştırma kısıtlanmaz (erişilebilirlik): maximumScale ve userScalable verilmez.
  // Tarayıcı çubuğu rengi: sayfa yüzeyiyle aynı (açık ve koyu temada ayrı).
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: palette.renkler.surface.light },
    { media: '(prefers-color-scheme: dark)', color: palette.renkler.surface.dark },
  ],
  colorScheme: 'light dark',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Proxy her istekte nonce üretir; satır içi betik bu nonce'la CSP'ye uyar (README: "Güvenlik başlıkları ve CSP").
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    // suppressHydrationWarning: satır içi betik <html> özniteliklerini (data-theme vb.) React'ten önce yazar.
    <html lang="tr" className={`${atkinson.variable} ${atkinsonHeavy.variable}`} suppressHydrationWarning>
      <head>
        {/* Kullanıcı daha önce bir görünüm ayarı değiştirdiyse onu ilk boyamadan önce uygular (tema yanıp sönmez). */}
        <script nonce={nonce} suppressHydrationWarning>
          {appearanceScript}
        </script>
      </head>
      <body>
        <SkipLink />
        <NoticeProvider>
          <CookieNotice />
          {children}
        </NoticeProvider>
      </body>
    </html>
  );
}
