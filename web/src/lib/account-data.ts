import { z } from 'zod';

import '@/lib/zod-config';
import { UUID_PATTERN } from '@/lib/questions';

/** Velinin verdiği onayların listesi ve geri çekme girdisi. Yanıt güvenilir sayılmaz: bozuk satır atlanır. */
export type ConsentItem = { id: string; type: string; version: string; acceptedAt: string; studentId: string | null };

const row = z.object({
  id: z.string().min(1),
  type: z.string(),
  doc_version: z.string(),
  accepted_at: z.string(),
  student_id: z.string().nullable(),
});

/** Yalnızca velinin görebileceği türler listelenir; en yeni onay önce gelir. */
export const GUARDIAN_CONSENT_TYPES = ['aydinlatma_veli', 'kullanim_kosullari', 'acik_riza_dolayli_saglik'] as const;

export function parseConsents(raw: unknown): ConsentItem[] {
  if (!Array.isArray(raw)) return [];
  const items = raw.flatMap((item) => {
    const parsed = row.safeParse(item);
    return parsed.success && (GUARDIAN_CONSENT_TYPES as readonly string[]).includes(parsed.data.type)
      ? [{ id: parsed.data.id, type: parsed.data.type, version: parsed.data.doc_version, acceptedAt: parsed.data.accepted_at, studentId: parsed.data.student_id }]
      : [];
  });
  return items.sort((a, b) => b.acceptedAt.localeCompare(a.acceptedAt));
}

export const withdrawSchema = z.object({ consentId: z.string().regex(UUID_PATTERN) });
