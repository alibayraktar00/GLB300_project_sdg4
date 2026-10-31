import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import {
  enforceSessionCookieOptions,
  hasSessionCookie,
  isRememberChoice,
  REMEMBER_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from '@/lib/session-cookies';
import {
  applySecurityHeaders,
  buildCspValue,
  createNonce,
  cspHeaderName,
  originOf,
} from '@/lib/security-headers';
import { readSupabaseConfig, reportSupabaseConfigProblems } from '@/lib/supabase-config';

/**
 * `proxy.ts` (Next 15'teki adıyla `middleware.ts`), sayfa çizilmeden ÖNCE her istekte çalışır.
 * Üç işi var (plan 4 ve 6.4):
 *   1. Her istek için nonce üretip nonce'lu CSP ve diğer güvenlik başlıklarını eklemek.
 *   2. Supabase oturumunu yenilemek (süresi dolan erişim jetonu yenilenir, çerez güncellenir).
 *   3. Oturumlu kullanıcıya giden yanıtın önbelleğe alınmasını engellemek.
 *
 * Bu dosya YETKİ KARARI VERMEZ. Kim neye girebilir sorusu sayfada/eylemde (`requireUser` vb.) ve
 * veritabanında (RLS) cevaplanır. Proxy atlanabilir bir katmandır (matcher dışı yollar, yapılandırma hatası).
 */

const isProduction = process.env.NODE_ENV === 'production';
const isDev = process.env.NODE_ENV === 'development';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = createNonce();

  const config = readSupabaseConfig(process.env, isProduction);
  if (!config.ok) reportSupabaseConfigProblems(config.problems, isProduction);

  const hasSession = hasSessionCookie(request.cookies.getAll().map((cookie) => cookie.name));
  // Oturum çerezi varsayılan olarak tarayıcı oturumu çerezidir; yalnızca kullanıcı "oturumum açık kalsın"
  // dediyse 30 gün yaşar (bkz. src/lib/session-cookies.ts).
  const remember = isRememberChoice(request.cookies.get(REMEMBER_COOKIE_NAME)?.value);
  const securityOptions = {
    nonce,
    pathname,
    isDev,
    isProduction,
    hasSession,
    // HTTPS'e yükseltme yalnızca istek zaten HTTPS ise anlamlıdır; düz HTTP ile denenen yerel üretim derlemesinde
    // (WebKit localhost'u da yükseltir) sayfa hiç açılmazdı.
    upgradeInsecure: request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https',
    supabaseOrigin: config.ok ? originOf(config.config.url, { allowHttp: !isProduction }) : null,
  };

  // Next.js nonce'u, SUNUCUYA GELEN İSTEĞİN CSP başlığından okuyup kendi betiklerine ekler.
  // Bu yüzden CSP hem isteğe (aşağıda) hem yanıta (applySecurityHeaders) yazılır.
  const forwardedHeaders = () => {
    const headers = new Headers(request.headers);
    headers.set('x-nonce', nonce);
    headers.set(cspHeaderName(), buildCspValue(securityOptions));
    return headers;
  };

  let response = NextResponse.next({ request: { headers: forwardedHeaders() } });
  const cacheHeaders: Record<string, string> = {};

  // Oturum çerezi yoksa yenilenecek bir şey yoktur; Supabase'e hiç gidilmez (anonim ziyaretçi hızlı açılır).
  if (config.ok && hasSession) {
    const supabase = createServerClient(config.config.url, config.config.publishableKey, {
      cookieOptions: SESSION_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Yenilenen jeton hem bu isteğin devamında (sayfa) hem de tarayıcıya dönen yanıtta olmalı.
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request: { headers: forwardedHeaders() } });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, enforceSessionCookieOptions(options, { remember }));
          }
          // Çerez yazan yanıtlar CDN'de önbelleğe alınmamalı (başka kullanıcıya sızabilir).
          Object.assign(cacheHeaders, headers);
        },
      },
    });

    try {
      // getSession() değil getClaims(): JWT imzasını doğrular ve gerekirse oturumu yeniler.
      // Sonuç burada kullanılmaz; yetki kararı proxy'de verilmez.
      await supabase.auth.getClaims();
    } catch {
      // Kişisel veri sızmasın diye hata ayrıntısı yazılmaz. Oturum yenilenemezse sayfa yine açılır;
      // korumalı sayfalar kendi içinde oturumu doğrular.
      console.error('[proxy] Oturum yenilenemedi.');
    }
  }

  applySecurityHeaders(response.headers, securityOptions);
  for (const [name, value] of Object.entries(cacheHeaders)) response.headers.set(name, value);
  return response;
}

export const config = {
  // `matcher` sabit olmalı (derleme zamanında okunur). Statik dosyalar ve ön yüklemeler (prefetch) hariç.
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
