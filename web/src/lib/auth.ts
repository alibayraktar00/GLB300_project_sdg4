import { z } from 'zod';

import { APP_ROLES, roleDestinations, type AppRole } from '@/lib/role-navigation';
import { tr } from '@/strings/tr';

/**
 * Giriş ile ilgili saf yardımcılar: doğrulama, öğrenci kullanıcı adı eşlemesi ve yönlendirme adresi
 * denetimi. Supabase'e dokunmaz; hem sunucuda hem testlerde çağrılabilir.
 */

/**
 * Öğrenci hesapları gerçek e-postayla değil, velinin seçtiği kullanıcı adıyla açılır. Auth tarafında bu ad
 * teslim edilemeyen sentetik bir adrese çevrilir (plan 4.1: `create-child-account`). Seed verisi de aynı
 * alan adını kullanır. Gerçek alan adı kesinleşince YALNIZCA burası ve `create-child-account` değişir.
 */
export const STUDENT_EMAIL_DOMAIN = 'ogrenci.ornek.test';

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;

/** Kullanıcı adını sadeleştirir: boşlukları atar, Türkçe-doğru küçük harfe çevirir. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLocaleLowerCase('tr-TR').normalize('NFC');
}

/** Öğrenci kullanıcı adından Auth e-postasını üretir. Geçersiz ad için null döner. */
export function studentEmail(username: string): string | null {
  const name = normalizeUsername(username);
  return USERNAME_PATTERN.test(name) ? `${name}@${STUDENT_EMAIL_DOMAIN}` : null;
}

/** Şifre alanı: uzunluk dışında kural dayatmaz (yapıştırma serbest). Üst sınır kötüye kullanıma karşı. */
const passwordSchema = z.string().min(1, tr.auth.errors.passwordRequired).max(200, tr.auth.errors.invalid);

/** Onay kutusu: işaretliyse "on" gelir, işaretsizse alan hiç gelmez. */
const rememberSchema = z.string().nullish().transform((value) => value != null);

export const emailLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, tr.auth.errors.emailRequired)
    .max(254, tr.auth.errors.invalid)
    .pipe(z.email(tr.auth.errors.emailInvalid)),
  password: passwordSchema,
  remember: rememberSchema,
});

export const studentLoginSchema = z.object({
  username: z.string().trim().min(1, tr.auth.errors.usernameRequired).max(60, tr.auth.errors.invalid),
  password: passwordSchema,
  remember: rememberSchema,
});

export type FieldErrors = Partial<Record<'email' | 'username' | 'password', string>>;

/** Zod hatalarını alan başına ilk mesaja indirger. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (key === 'email' || key === 'username' || key === 'password') {
      result[key] ??= issue.message;
    }
  }
  return result;
}

/**
 * Girişten sonra gidilecek adres. Yalnızca bu sitenin kendi yolları kabul edilir: `//evil.example`,
 * `https://...`, `\` ve denetim karakterleri reddedilir (açık yönlendirme koruması). Geçersizse null.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 200) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return null;
  try {
    const url = new URL(raw, 'https://site.invalid');
    if (url.origin !== 'https://site.invalid') return null;
  } catch {
    return null;
  }
  return raw;
}

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (APP_ROLES as readonly string[]).includes(value);
}

/** Rolün ilk gezinme hedefi (giriş sonrası açılış sayfası). */
export function homePathFor(role: AppRole): string {
  return roleDestinations(role)[0]?.path ?? '/';
}

/**
 * Oturum açıldıktan sonra nereye? Rolün kendi alanına ait bir `devam` adresi varsa oraya, yoksa rolün
 * ana sayfasına. Başka rolün alanına giden adres yok sayılır.
 */
export function landingPath(role: AppRole, next: string | null | undefined): string {
  const safe = safeNextPath(next);
  if (safe && (safe === `/${role}` || safe.startsWith(`/${role}/`))) return safe;
  return homePathFor(role);
}
