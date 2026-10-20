import type { NextConfig } from 'next';

/**
 * Next.js ayarları.
 *
 * Güvenlik başlıklarının çoğu `src/proxy.ts` içinde, her istekte (nonce'lu CSP dahil) eklenir.
 * Proxy, `_next/static` gibi statik dosyalara çalışmaz; o dosyalar için gereken az sayıda
 * başlık burada tanımlıdır. Aynı başlığı iki yerde birden tanımlama (iki kez gönderilir).
 */
const nextConfig: NextConfig = {
  // "X-Powered-By: Next.js" başlığı gereksiz bilgi verir.
  poweredByHeader: false,
  reactStrictMode: true,
  // Üretimde kaynak haritası (source map) tarayıcıya verilmez.
  productionBrowserSourceMaps: false,
  // cacheComponents ve PPR bilerek AÇILMAZ: nonce'lu CSP ile uyumsuzlar (plan 3.2).

  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ];
  },
};

export default nextConfig;
