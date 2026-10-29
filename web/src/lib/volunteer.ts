import { z } from 'zod';

import { tr } from '@/strings/tr';

/**
 * Gönüllü başvurusu doğrulaması (saf yardımcılar). Aynı kurallar veritabanında yeniden denetlenir
 * (private.is_edu_tr_email, private.is_safe_name, volunteers kısıtları); buradaki doğrulama erken ve anlaşılır
 * geri bildirim içindir.
 */

/** Veritabanındaki `private.is_edu_tr_email` ile aynı kural: alan adı `.edu.tr` ile bitmeli. */
const EDU_TR_PATTERN = /^[^@\s]+@([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+edu\.tr$/;

export function isEduTrEmail(email: string): boolean {
  return EDU_TR_PATTERN.test(email.trim().toLocaleLowerCase('en-US'));
}

/** Harf, tek boşluk, kesme işareti ve tire. Gönüllünün adı çocuğa ve veliye gösterildiği için rakam ve @ yazılamaz. */
const SAFE_NAME = /^\p{L}+(?:[ '’-]\p{L}+)*$/u;

const personName = (required: string, invalid: string, max: number) =>
  z.string().trim().min(1, required).max(max, invalid).regex(SAFE_NAME, invalid);

export const volunteerSignupSchema = z.object({
  givenName: personName(tr.volunteer.errors.givenNameRequired, tr.volunteer.errors.nameInvalid, 60),
  familyName: personName(tr.volunteer.errors.familyNameRequired, tr.volunteer.errors.nameInvalid, 60),
  email: z
    .string()
    .trim()
    .min(1, tr.auth.errors.emailRequired)
    .max(254, tr.auth.errors.invalid)
    .pipe(z.email(tr.auth.errors.emailInvalid))
    .refine(isEduTrEmail, tr.volunteer.errors.emailNotEdu),
  password: z
    .string()
    .min(10, tr.signup.errors.passwordShort)
    .max(200, tr.auth.errors.invalid)
    .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), tr.signup.errors.passwordWeak),
  university: z
    .string()
    .trim()
    .min(2, tr.volunteer.errors.universityRequired)
    .max(120, tr.volunteer.errors.universityInvalid)
    .regex(SAFE_NAME, tr.volunteer.errors.universityInvalid),
  department: z
    .string()
    .trim()
    .max(120, tr.volunteer.errors.departmentInvalid)
    .refine((value) => value === '' || (value.length >= 2 && SAFE_NAME.test(value)), tr.volunteer.errors.departmentInvalid)
    .transform((value) => (value === '' ? null : value)),
  classYear: z.coerce
    .number(tr.volunteer.errors.classYearInvalid)
    .int(tr.volunteer.errors.classYearInvalid)
    .min(1, tr.volunteer.errors.classYearInvalid)
    .max(6, tr.volunteer.errors.classYearInvalid),
  readNotice: z.literal('on', tr.signup.errors.notRead),
  readTerms: z.literal('on', tr.signup.errors.notRead),
});

const FIELD_KEYS = [
  'givenName',
  'familyName',
  'email',
  'password',
  'university',
  'department',
  'classYear',
  'readNotice',
  'readTerms',
] as const;
export type VolunteerFieldErrors = Partial<Record<(typeof FIELD_KEYS)[number] | 'code', string>>;

export function volunteerFieldErrors(error: z.ZodError): VolunteerFieldErrors {
  const result: VolunteerFieldErrors = {};
  for (const issue of error.issues) {
    const known = FIELD_KEYS.find((candidate) => candidate === issue.path[0]);
    if (known) result[known] ??= issue.message;
  }
  return result;
}

/** E-posta doğrulandıktan sonra `volunteers` satırına yazılan profil alanları (kod adımına gizli alan olarak taşınır, yeniden doğrulanır). */
export const volunteerProfileSchema = volunteerSignupSchema.pick({
  givenName: true,
  familyName: true,
  university: true,
  department: true,
  classYear: true,
});
