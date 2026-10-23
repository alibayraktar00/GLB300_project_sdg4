import { z } from 'zod';

import { normalizeUsername } from '@/lib/auth';
import { tr } from '@/strings/tr';

/**
 * Çocuk hesabı ekleme doğrulaması (saf yardımcılar). Aynı kurallar `create-child-account` Edge Function'ında
 * ve veritabanı kısıtlarında (students, is_safe_name) yeniden denetlenir; buradaki doğrulama yalnızca kullanıcıya
 * erken ve anlaşılır geri bildirim verir.
 */

/** Rumuz: yalnızca harf, tek boşluk, kesme işareti ve tire. Gerçek ad, rakam ya da iletişim bilgisi yazılamaz. */
const NICKNAME_PATTERN = /^\p{L}+(?:[ '’-]\p{L}+)*$/u;
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;

export const childSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(1, tr.child.errors.nicknameRequired)
    .max(30, tr.child.errors.nicknameInvalid)
    .regex(NICKNAME_PATTERN, tr.child.errors.nicknameInvalid),
  grade: z.coerce
    .number(tr.child.errors.gradeInvalid)
    .int(tr.child.errors.gradeInvalid)
    .min(5, tr.child.errors.gradeInvalid)
    .max(8, tr.child.errors.gradeInvalid),
  username: z
    .string()
    .transform(normalizeUsername)
    .pipe(z.string().min(1, tr.child.errors.usernameRequired).regex(USERNAME_PATTERN, tr.child.errors.usernameInvalid)),
  password: z
    .string()
    .min(10, tr.signup.errors.passwordShort)
    .max(200, tr.auth.errors.invalid)
    .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), tr.signup.errors.passwordWeak),
  /** Açık rıza (AR-1): yalnızca açıkça "verdi" gelirse devam edilir. Önceden seçili değildir. */
  consent: z.literal('verdi', tr.child.errors.consentRequired),
});

const FIELD_KEYS = ['nickname', 'grade', 'username', 'password', 'consent'] as const;
export type ChildFieldErrors = Partial<Record<(typeof FIELD_KEYS)[number], string>>;

export function childFieldErrors(error: z.ZodError): ChildFieldErrors {
  const result: ChildFieldErrors = {};
  for (const issue of error.issues) {
    const known = FIELD_KEYS.find((candidate) => candidate === issue.path[0]);
    if (known) result[known] ??= issue.message;
  }
  return result;
}
