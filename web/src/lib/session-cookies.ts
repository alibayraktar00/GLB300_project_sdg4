/**
 * Oturum çerezi kuralları (plan 3.7; çerez ömrü için docs/hukuk/cerez-politikasi.md).
 *
 * 1) Güvenlik: Supabase oturumu tarayıcıda JavaScript'in okuyamadığı (httpOnly) çerezde tutulur.
 *    `@supabase/ssr` varsayılanı `httpOnly: false` olduğu için seçenekler burada ZORLANIR.
 *
 * 2) Ömür (KVKK Çerez Rehberi): tarayıcı oturumları arasında kalıcı olan giriş çerezi "zorunlu" sayılmaz.
 *    Bu yüzden oturum çerezi VARSAYILAN olarak bir TARAYICI OTURUMU ÇEREZİDİR: `Max-Age` ve `Expires`
 *    yoktur, tarayıcı kapanınca silinir. `@supabase/ssr` her yazışta `maxAge: 400 gün` koyar (kendi
 *    `cookieOptions.maxAge` ayarımızı bile ezer); bu yüzden değer yalnızca çerez YAZILIRKEN, yani
 *    `setAll` içinde, aşağıdaki fonksiyonla düzeltilebilir. `proxy.ts` ve `src/server/supabase.ts`
 *    ikisi de bunu kullanır.
 *
 * 3) "Bu cihazda oturumum açık kalsın" (ileride girişte, varsayılanı BOŞ): işaretlenirse oturum çerezleri
 *    30 gün yaşar. Seçim, ayrı küçük bir çerezde (`REMEMBER_COOKIE_NAME`) saklanır; çünkü jeton her
 *    yenilendiğinde çerezler yeniden yazılır ve tercih her seferinde bilinmelidir. Giriş eylemi
 *    (Faz A) şunu yapar:
 *        const supabase = await createSupabaseServerClient({ remember });   // jeton bu tercihle yazılsın
 *        await supabase.auth.signInWithPassword(...);
 *        await setRememberChoice(remember);                                // tercih çerezini yaz/sil
 *    Çıkış eylemi `setRememberChoice(false)` çağırır. Tercih çerezi yalnızca kullanıcı kutuyu işaretlerse
 *    yazılır.
 *
 * Not: `secure: true` olduğu için Safari (iPhone) `http://localhost` üzerinde çerezi kaydetmez.
 * iPhone/Safari ile yerelde denemek için `npm run dev:https` kullan.
 */

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
} as const;

/** "Bu cihazda oturumum açık kalsın" seçildiğinde oturum çerezlerinin ömrü: 30 gün. */
export const REMEMBER_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** Kullanıcı "oturumum açık kalsın" dediyse değeri "1" olan tercih çerezinin adı. */
export const REMEMBER_COOKIE_NAME = 'ek-kalici-oturum';

type MaybeDated = { maxAge?: number; expires?: Date | string | number };

/** Supabase bir çerezi SİLİYORSA (çıkış, parça temizliği) `maxAge: 0` ya da geçmiş bir `expires` verir. */
function isDeletion(options: MaybeDated): boolean {
  if (options.maxAge !== undefined && options.maxAge <= 0) return true;
  if (options.expires !== undefined) {
    const time = new Date(options.expires).getTime();
    return Number.isFinite(time) && time <= Date.now();
  }
  return false;
}

/**
 * Supabase'in verdiği çerez seçeneklerinin üzerine güvenlik ve ömür kurallarını yazar.
 *  - her zaman: httpOnly, Secure, SameSite=Lax, path=/
 *  - silme çağrıları (`maxAge: 0`) olduğu gibi korunur; yoksa çıkış yapılamazdı
 *  - `remember: false` (varsayılan): `Max-Age` ve `Expires` KALDIRILIR -> tarayıcı oturumu çerezi
 *  - `remember: true`: `Max-Age = 30 gün`
 */
export function enforceSessionCookieOptions<T extends object>(
  options?: T,
  { remember = false }: { remember?: boolean } = {},
): Omit<T, 'maxAge' | 'expires'> & typeof SESSION_COOKIE_OPTIONS & { maxAge?: number } {
  const { maxAge, expires, ...rest } = { ...options } as T & MaybeDated;
  const secured = { ...rest, ...SESSION_COOKIE_OPTIONS };

  if (isDeletion({ maxAge, expires })) {
    return { ...secured, maxAge: 0 };
  }
  if (remember) {
    return { ...secured, maxAge: REMEMBER_MAX_AGE_SECONDS };
  }
  return secured;
}

/** Tarayıcıdan gelen çerezlerde kullanıcının "oturumum açık kalsın" tercihi var mı? */
export function isRememberChoice(value: string | undefined): boolean {
  return value === '1';
}

/**
 * Tercih çerezinin yazılacak hali: işaretlendiyse 30 günlük çerez, işaretlenmediyse silme.
 * (İşaretlenmediğinde çerez hiç bırakılmaz.)
 */
export function rememberCookie(remember: boolean) {
  return remember
    ? { name: REMEMBER_COOKIE_NAME, value: '1', options: { ...SESSION_COOKIE_OPTIONS, maxAge: REMEMBER_MAX_AGE_SECONDS } }
    : { name: REMEMBER_COOKIE_NAME, value: '', options: { ...SESSION_COOKIE_OPTIONS, maxAge: 0 } };
}

/**
 * Supabase oturum çerezi adı: `sb-<proje>-auth-token`; büyükse `.0`, `.1` ... parçalara bölünür.
 * (`...-auth-token-code-verifier` oturum değildir, eşleşmez.)
 */
const SESSION_COOKIE_NAME = /^sb-.+-auth-token(\.\d+)?$/;

export function hasSessionCookie(cookieNames: Iterable<string>): boolean {
  for (const name of cookieNames) {
    if (SESSION_COOKIE_NAME.test(name)) return true;
  }
  return false;
}
