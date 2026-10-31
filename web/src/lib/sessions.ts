import { z } from 'zod';

import '@/lib/zod-config';

import type { SessionItem, SessionStatus } from '@/features/sessions/types';
import { UUID_PATTERN } from '@/lib/questions';
import { tr } from '@/strings/tr';

/**
 * Ders planlama girdi doğrulaması ve yanıt ayrıştırma (saf yardımcılar). Asıl denetim `schedule_session` ve
 * `cancel_session` RPC'lerindedir (saat penceresi, çakışma, bağlantı biçimi); burada erken ve anlaşılır geri bildirim verilir.
 */

export const DURATIONS = [20, 30, 40] as const;
export const CANCEL_REASONS = ['zaman_uygun_degil', 'teknik_sorun', 'diger'] as const;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Türkiye yıl boyu UTC+3'tür (yaz saati uygulaması yok); İstanbul duvar saatini UTC anına çevirir. */
export function istanbulToIso(date: string, time: string): string | null {
  if (!DATE_PATTERN.test(date) || !TIME_PATTERN.test(time)) return null;
  const instant = new Date(`${date}T${time}:00+03:00`);
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}

export const scheduleSchema = z.object({
  matchId: z.string().regex(UUID_PATTERN, tr.sessions.errors.invalid),
  date: z.string().regex(DATE_PATTERN, tr.sessions.errors.dateRequired),
  time: z.string().regex(TIME_PATTERN, tr.sessions.errors.dateRequired),
  duration: z.coerce
    .number()
    .refine((value): value is (typeof DURATIONS)[number] => (DURATIONS as readonly number[]).includes(value), tr.sessions.errors.invalid),
  url: z.string().trim().min(1, tr.sessions.errors.linkRequired).max(300, tr.sessions.errors.invalid),
});

export const cancelSchema = z.object({
  sessionId: z.string().regex(UUID_PATTERN),
  reason: z.enum(CANCEL_REASONS),
});

export type ScheduleField = 'date' | 'time' | 'url' | 'matchId' | 'duration';
export function scheduleFieldErrors(error: z.ZodError): Partial<Record<ScheduleField, string>> {
  const out: Partial<Record<ScheduleField, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as ScheduleField | undefined;
    if (key && !(key in out)) out[key] = issue.message;
  }
  return out;
}

type RpcKey = keyof typeof tr.sessions.errors.rpc;
/** RPC hata metni "KOD: açıklama" biçimindedir; bilinen kod Türkçe metne çevrilir, ham metin asla gösterilmez. */
export function messageForSessionError(raw: string | undefined): string {
  const code = /^([A-Z_]+):/.exec(raw ?? '')?.[1] as RpcKey | undefined;
  return (code && tr.sessions.errors.rpc[code]) || tr.sessions.errors.unavailable;
}

const STATUSES: readonly SessionStatus[] = ['planlandi', 'iptal', 'tamamlandi', 'gelinmedi'];
const one = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema).min(1).transform((items) => items[0] as z.infer<T>)]).nullable();

const row = z.object({
  id: z.string().min(1),
  starts_at: z.string(),
  duration_min: z.number(),
  status: z.enum(STATUSES as [SessionStatus, ...SessionStatus[]]),
  meeting_url: z.string().nullable(),
  matches: one(z.object({ subjects: one(z.object({ name: z.string() })).optional() })).optional(),
});

/** Yanıt güvenilir sayılmaz: şemaya uymayan satır atlanır, dizi değilse boş döner. */
export function parseSessions(raw: unknown): SessionItem[] {
  if (!Array.isArray(raw)) return [];
  const result: SessionItem[] = [];
  for (const item of raw) {
    const parsed = row.safeParse(item);
    if (!parsed.success) continue;
    const match = parsed.data.matches;
    const subjects = match && 'subjects' in match ? match.subjects : null;
    result.push({
      id: parsed.data.id,
      startsAt: parsed.data.starts_at,
      durationMin: parsed.data.duration_min,
      status: parsed.data.status,
      meetingUrl: parsed.data.meeting_url,
      subject: subjects?.name ?? '',
    });
  }
  return result;
}
