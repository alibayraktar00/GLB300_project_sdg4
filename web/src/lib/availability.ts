import { z } from 'zod';

import '@/lib/zod-config';
import { UUID_PATTERN } from '@/lib/questions';
import { tr } from '@/strings/tr';

/**
 * Gönüllü müsaitlik saatleri: gün (1 = Pazartesi ... 7 = Pazar), başlangıç ve bitiş. Veritabanı da aynı kuralı CHECK
 * ile zorlar (08:00-21:00, başlangıç < bitiş, aynı gün aynı başlangıç bir kez); burada erken ve anlaşılır geri bildirim verilir.
 */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const MIN = '08:00';
const MAX = '21:00';

export const slotSchema = z
  .object({
    weekday: z.coerce.number().int().min(1, tr.availability.errors.invalid).max(7, tr.availability.errors.invalid),
    start: z.string().regex(TIME, tr.availability.errors.invalid),
    end: z.string().regex(TIME, tr.availability.errors.invalid),
  })
  .superRefine((value, context) => {
    // "HH:MM" metinleri aynı uzunlukta olduğu için metin karşılaştırması zaman sırasıyla aynıdır.
    if (value.start < MIN || value.end > MAX) context.addIssue({ code: 'custom', path: ['start'], message: tr.availability.errors.hours });
    else if (value.start >= value.end) context.addIssue({ code: 'custom', path: ['end'], message: tr.availability.errors.range });
  });

export const removeSchema = z.object({ slotId: z.string().regex(UUID_PATTERN) });

export type Slot = { id: string; weekday: number; start: string; end: string };

const row = z.object({ id: z.string().min(1), weekday: z.number(), start_time: z.string(), end_time: z.string() });
const hhmm = (value: string) => value.slice(0, 5);

/** Yanıtı gün ve saate göre sıralı listeye çevirir; bozuk satırı atlar. */
export function parseSlots(raw: unknown): Slot[] {
  if (!Array.isArray(raw)) return [];
  const slots = raw.flatMap((item) => {
    const parsed = row.safeParse(item);
    return parsed.success && parsed.data.weekday >= 1 && parsed.data.weekday <= 7
      ? [{ id: parsed.data.id, weekday: parsed.data.weekday, start: hhmm(parsed.data.start_time), end: hhmm(parsed.data.end_time) }]
      : [];
  });
  return slots.sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start));
}

/** Veritabanı hata metnini Türkçe bir mesaja çevirir; ham metin asla gösterilmez. */
export function messageForSlotError(code: string | undefined, message: string | undefined): string {
  if (code === '23505') return tr.availability.errors.duplicate;
  if (code === '23514' || /check/i.test(message ?? '')) return tr.availability.errors.hours;
  return tr.availability.errors.unavailable;
}

export type SlotField = 'weekday' | 'start' | 'end';
export function slotFieldErrors(error: z.ZodError): Partial<Record<SlotField, string>> {
  const out: Partial<Record<SlotField, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as SlotField | undefined;
    if (key && !(key in out)) out[key] = issue.message;
  }
  return out;
}
