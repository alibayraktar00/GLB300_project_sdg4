import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import {
  enforceSessionCookieOptions,
  isRememberChoice,
  REMEMBER_COOKIE_NAME,
  rememberCookie,
  SESSION_COOKIE_OPTIONS,
} from '@/lib/session-cookies';
import { readSupabaseConfig, reportSupabaseConfigProblems, type SupabaseConfig } from '@/lib/supabase-config';

/**
 * Sunucu tarafı Supabase istemcisi (plan 3.7 ve 6.4).
 *
 * Kurallar:
 *   - Yalnızca sunucuda çalışır (`server-only`): Server Component, Server Action, Route Handler.
 *   - Yalnızca publishable anahtar kullanılır; gizli (sb_secret_) anahtar bu uygulamada yoktur.
 *   - Oturum httpOnly çerezdedir; tarayıcıda Supabase istemcisi yoktur (createBrowserClient yasak).
 *   - Her istekte YENİ istemci oluşturulur; istemci hiçbir yerde saklanıp paylaşılmaz.
 *   - Oturum çerezi varsayılan olarak TARAYICI OTURUMU çerezidir (Max-Age yok); "oturumum açık kalsın"
 *     seçilirse 30 gün. Ayrıntı: src/lib/session-cookies.ts
 */

/** Supabase ayarları eksik/hatalıysa fırlatılır. Mesajı kullanıcıya ham haliyle gösterme. */
export class SupabaseNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseNotConfiguredError';
  }
}

const isProduction = process.env.NODE_ENV === 'production';

function requireSupabaseConfig(): SupabaseConfig {
  const result = readSupabaseConfig(process.env, isProduction);
  if (result.ok) return result.config;

  reportSupabaseConfigProblems(result.problems, isProduction);
  throw new SupabaseNotConfiguredError(
    isProduction
      ? 'Hizmet şu anda kullanılamıyor.'
      : `Supabase ayarları eksik: ${result.problems.join(' ')} (web/.env.example dosyasına bak)`,
  );
}

export type CreateClientOptions = {
  /**
   * Oturum çerezleri 30 gün mü yaşasın? Verilmezse tarayıcıdaki tercih çerezine bakılır.
   * Yalnızca GİRİŞ eyleminde (kullanıcının kutu seçimi henüz çerezde değilken) açıkça verilir.
   */
  remember?: boolean;
};

export async function createSupabaseServerClient({ remember }: CreateClientOptions = {}) {
  const { url, publishableKey } = requireSupabaseConfig();
  const cookieStore = await cookies();
  const keepSignedIn = remember ?? isRememberChoice(cookieStore.get(REMEMBER_COOKIE_NAME)?.value);

  return createServerClient(url, publishableKey, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            // Kütüphane her yazışta 400 günlük Max-Age koyar; burada düzeltilir (bkz. session-cookies.ts).
            cookieStore.set(name, value, enforceSessionCookieOptions(options, { remember: keepSignedIn }));
          }
        } catch {
          // Server Component'ten çağrılınca çerez yazılamaz (Next kuralı). Sorun değil:
          // oturumu her istekte `src/proxy.ts` yeniler.
        }
      },
    },
  });
}

/**
 * "Bu cihazda oturumum açık kalsın" tercihini çereze yazar (işaretliyse 30 günlük çerez) ya da siler.
 * Giriş eyleminden SONRA, çıkış eyleminde ise `false` ile çağrılır. Yalnızca Server Action ve
 * Route Handler içinde çalışır.
 */
export async function setRememberChoice(remember: boolean): Promise<void> {
  const { name, value, options } = rememberCookie(remember);
  (await cookies()).set(name, value, options);
}
