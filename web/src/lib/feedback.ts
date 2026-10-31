import { z } from 'zod';

import '@/lib/zod-config';

import { UUID_PATTERN } from '@/lib/questions';

/** Geri bildirim girdisi: 1-5 puan ve "devam etmek ister misin" (evet/hayır). Serbest metin bilerek yoktur. */
export const feedbackSchema = z.object({
  sessionId: z.string().regex(UUID_PATTERN),
  rating: z.coerce.number().int().min(1).max(5),
  wouldContinue: z.enum(['evet', 'hayir']).transform((value) => value === 'evet'),
});

export type RoleSummary = { responses: number; avgRating: number; satisfiedPct: number; continuePct: number };
export type FeedbackSummary = { completedSessions: number; byRole: Partial<Record<'ogrenci' | 'veli' | 'gonullu', RoleSummary>> };

const roleSummary = z.object({
  responses: z.number(),
  avg_rating: z.number(),
  satisfied_pct: z.number(),
  continue_pct: z.number(),
});

/** `get_feedback_summary` yanıtını ekran verisine çevirir; beklenmeyen biçimde boş özet döner. */
export function parseFeedbackSummary(raw: unknown): FeedbackSummary {
  const empty: FeedbackSummary = { completedSessions: 0, byRole: {} };
  const parsed = z.object({ completed_sessions: z.number(), by_role: z.record(z.string(), z.unknown()) }).safeParse(raw);
  if (!parsed.success) return empty;
  const byRole: FeedbackSummary['byRole'] = {};
  for (const role of ['ogrenci', 'veli', 'gonullu'] as const) {
    const item = roleSummary.safeParse(parsed.data.by_role[role]);
    if (item.success) {
      byRole[role] = {
        responses: item.data.responses,
        avgRating: item.data.avg_rating,
        satisfiedPct: item.data.satisfied_pct,
        continuePct: item.data.continue_pct,
      };
    }
  }
  return { completedSessions: parsed.data.completed_sessions, byRole };
}
