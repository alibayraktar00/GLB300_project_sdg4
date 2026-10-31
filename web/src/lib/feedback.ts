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
export type Attendance = { attended: number; missed: number; pct: number | null };
export type FeedbackSummary = { completedSessions: number; attendance: Attendance; byRole: Partial<Record<'ogrenci' | 'veli' | 'gonullu', RoleSummary>> };

const roleSummary = z.object({
  responses: z.number(),
  avg_rating: z.number(),
  satisfied_pct: z.number(),
  continue_pct: z.number(),
});

/** `get_feedback_summary` yanıtını ekran verisine çevirir; beklenmeyen biçimde boş özet döner. */
export function parseFeedbackSummary(raw: unknown): FeedbackSummary {
  const empty: FeedbackSummary = { completedSessions: 0, attendance: { attended: 0, missed: 0, pct: null }, byRole: {} };
  const parsed = z
    .object({
      completed_sessions: z.number(),
      by_role: z.record(z.string(), z.unknown()),
      attendance: z.object({ attended: z.number(), missed: z.number(), attendance_pct: z.number().nullable() }).optional(),
    })
    .safeParse(raw);
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
  const attendance = parsed.data.attendance;
  return {
    completedSessions: parsed.data.completed_sessions,
    attendance: attendance
      ? { attended: attendance.attended, missed: attendance.missed, pct: attendance.attendance_pct }
      : empty.attendance,
    byRole,
  };
}
