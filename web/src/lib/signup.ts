import { z } from 'zod';

import '@/lib/zod-config';

import { tr } from '@/strings/tr';

/**
 * Veli kaydı doğrulaması (saf yardımcılar). Sunucu eylemleri bunu kullanır; tarayıcıdaki HTML kısıtları yalnızca
 * kolaylıktır. Şifre kuralı Supabase ayarıyla uyumludur (en az 10 karakter, harf + rakam; supabase/config.toml).
 */

/** Görünen ad: yalnızca harf, tek boşluk, kesme işareti ve tire. İletişim bilgisi (rakam, @, :, /) yazılamaz. */
const NAME_PATTERN = /^\p{L}+(?:[ '’-]\p{L}+)*$/u;

export const guardianSignupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, tr.signup.errors.nameRequired)
    .max(60, tr.signup.errors.nameInvalid)
    .regex(NAME_PATTERN, tr.signup.errors.nameInvalid),
  email: z
    .string()
    .trim()
    .min(1, tr.auth.errors.emailRequired)
    .max(254, tr.auth.errors.invalid)
    .pipe(z.email(tr.auth.errors.emailInvalid)),
  password: z
    .string()
    .min(10, tr.signup.errors.passwordShort)
    .max(200, tr.auth.errors.invalid)
    .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), tr.signup.errors.passwordWeak),
  readNotice: z.literal('on', tr.signup.errors.notRead),
  readTerms: z.literal('on', tr.signup.errors.notRead),
});

export const otpSchema = z.object({
  email: z.string().trim().pipe(z.email(tr.auth.errors.invalid)),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, tr.signup.errors.codeInvalid),
});

const FIELD_KEYS = ['name', 'email', 'password', 'readNotice', 'readTerms', 'code'] as const;
export type SignupFieldErrors = Partial<Record<(typeof FIELD_KEYS)[number], string>>;

export function signupFieldErrors(error: z.ZodError): SignupFieldErrors {
  const result: SignupFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    const known = FIELD_KEYS.find((candidate) => candidate === key);
    if (known) result[known] ??= issue.message;
  }
  return result;
}
