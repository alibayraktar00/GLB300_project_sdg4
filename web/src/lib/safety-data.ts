import { z } from 'zod';

import '@/lib/zod-config';
import type { BlockItem, ReportItem, VolunteerCard } from '@/features/safety/types';
import { shortPublicName } from '@/lib/public-name';

/** Güvenlik ekranlarının yanıt ayrıştırıcıları: şemaya uymayan satır atlanır, dizi değilse boş döner. */
function rows<T>(raw: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row) => {
    const parsed = schema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

const cardRow = z.object({
  student_id: z.string().min(1),
  volunteer_id: z.string().min(1),
  volunteer_name: z.string().nullable(),
  match_status: z.string(),
  university: z.string().nullable().optional(),
});

/** Engellenebilecek gönüllüler: bitmiş eşleşmeler listelenmez; aynı gönüllü iki kez gösterilmez. */
export function parseVolunteerCards(raw: unknown): VolunteerCard[] {
  const seen = new Set<string>();
  const out: VolunteerCard[] = [];
  for (const row of rows(raw, cardRow)) {
    if (row.match_status === 'bitti') continue;
    const key = `${row.student_id}:${row.volunteer_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      studentId: row.student_id,
      volunteerId: row.volunteer_id,
      name: shortPublicName(row.volunteer_name ?? ''),
      university: row.university ?? '',
    });
  }
  return out;
}

const reportRow = z.object({
  id: z.string().min(1),
  target_type: z.enum(['mesaj', 'soru', 'ders', 'kullanici']),
  category: z.string(),
  status: z.enum(['yeni', 'inceleniyor', 'kapandi']),
  created_at: z.string(),
});
export const parseReports = (raw: unknown): ReportItem[] =>
  rows(raw, reportRow).map((r) => ({ id: r.id, targetType: r.target_type, category: r.category, status: r.status, createdAt: r.created_at }));

const blockRow = z.object({
  id: z.string().min(1),
  blocked_by_role: z.enum(['ogrenci', 'veli']),
  reason_code: z.string().nullable(),
  created_at: z.string(),
});
export const parseBlocks = (raw: unknown): BlockItem[] =>
  rows(raw, blockRow).map((b) => ({ id: b.id, blockedByRole: b.blocked_by_role, reason: b.reason_code ?? 'diger', createdAt: b.created_at }));
