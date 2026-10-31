import { z } from 'zod';

import '@/lib/zod-config';

import { tr } from '@/strings/tr';

/**
 * Telafi planı oluşturma doğrulaması (saf yardımcılar). Asıl denetim `create_recovery_plan` RPC'sinde ve
 * veritabanındadır; buradaki doğrulama erken ve anlaşılır geri bildirim içindir. Derslere ara verme NEDENİ
 * hiçbir yerde sorulmaz ya da saklanmaz (veri minimizasyonu).
 */

/** 2026-2027 öğretim yılının ilk günü: ara verilen tarihler bundan önce olamaz. */
export const ACADEMIC_YEAR_START = '2026-09-01';
/** Tek bir ara verme dönemi en çok bu kadar gün olabilir (uç değerleri ve yazım hatalarını eler). */
export const MAX_ABSENCE_DAYS = 366;

export const SUBJECT_CODES = ['MAT', 'FEN'] as const;
export type SubjectCode = (typeof SUBJECT_CODES)[number];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` dizesini UTC gün sayısına çevirir; geçersiz tarihte (ör. 2026-02-30) null döner. */
export function dayNumber(iso: string): number | null {
  if (!ISO_DATE.test(iso)) return null;
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return Math.floor(date.getTime() / 86_400_000);
}

const dateField = z.string().refine((value) => dayNumber(value) !== null, tr.plan.errors.dateRequired);

export const planSchema = z
  .object({
    grade: z.coerce
      .number(tr.plan.errors.gradeRequired)
      .int(tr.plan.errors.gradeRequired)
      .min(5, tr.plan.errors.gradeRequired)
      .max(8, tr.plan.errors.gradeRequired),
    subjects: z
      .array(z.enum(SUBJECT_CODES, tr.plan.errors.subjectRequired))
      .min(1, tr.plan.errors.subjectRequired)
      .transform((codes) => [...new Set(codes)]),
    start: dateField,
    end: dateField,
    dailyGoal: z.coerce
      .number(tr.plan.errors.goalRequired)
      .int(tr.plan.errors.goalRequired)
      .min(1, tr.plan.errors.goalRequired)
      .max(3, tr.plan.errors.goalRequired),
  })
  .superRefine((value, context) => {
    const start = dayNumber(value.start);
    const end = dayNumber(value.end);
    const yearStart = dayNumber(ACADEMIC_YEAR_START) as number;
    if (start === null || end === null) return;
    if (start < yearStart) {
      context.addIssue({ code: 'custom', path: ['start'], message: tr.plan.errors.beforeYear });
    }
    if (end < start) {
      context.addIssue({ code: 'custom', path: ['end'], message: tr.plan.errors.endBeforeStart });
    } else if (end - start + 1 > MAX_ABSENCE_DAYS) {
      context.addIssue({ code: 'custom', path: ['end'], message: tr.plan.errors.tooLong });
    }
  });

const FIELD_KEYS = ['grade', 'subjects', 'start', 'end', 'dailyGoal'] as const;
export type PlanFieldErrors = Partial<Record<(typeof FIELD_KEYS)[number], string>>;

export function planFieldErrors(error: z.ZodError): PlanFieldErrors {
  const result: PlanFieldErrors = {};
  for (const issue of error.issues) {
    const known = FIELD_KEYS.find((candidate) => candidate === issue.path[0]);
    if (known) result[known] ??= issue.message;
  }
  return result;
}

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

/** `2026-09-07` -> `7 Eyl 2026`. Geçersizse boş dize. */
export function formatShortDate(iso: string): string {
  if (dayNumber(iso) === null) return '';
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
