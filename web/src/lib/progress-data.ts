import { z } from 'zod';

import '@/lib/zod-config';

import type { ChildProgress, TopicStatus } from '@/features/progress/types';

/**
 * Veli ilerleme özeti için yanıt ayrıştırıcıları. Yanıt güvenilir sayılmaz: şemaya uymayan satır atlanır,
 * dizi değilse boş sayılır. Saf işlevlerdir; testlerle korunur.
 */

const one = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema).min(1).transform((items) => items[0] as z.infer<T>)]).nullable();

function rows<T>(raw: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row) => {
    const parsed = schema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

const profileRow = z.object({ id: z.string().min(1), display_name: z.string() });
const planRow = z.object({
  student_id: z.string().min(1),
  absence_start: z.string(),
  absence_end: z.string(),
  plan_items: z
    .array(
      z.object({
        seq: z.number(),
        status: z.enum(['bekliyor', 'tamamlandi', 'atlandi']),
        topics: one(z.object({ title: z.string() })).optional(),
      }),
    )
    .default([]),
});
const questionRow = z.object({ student_id: z.string().min(1), status: z.string() });
const sessionRow = z.object({
  starts_at: z.string(),
  duration_min: z.number(),
  status: z.string(),
  matches: one(z.object({ student_id: z.string().nullable() })).optional(),
});

/** Çocuk başına özet. `now` dışarıdan verilir (bitmiş / planlı ders ayrımı için). */
export function buildProgress(input: {
  profiles: unknown;
  plans: unknown;
  questions: unknown;
  sessions: unknown;
  now: number;
}): ChildProgress[] {
  const plans = rows(input.plans, planRow);
  const questions = rows(input.questions, questionRow);
  const sessions = rows(input.sessions, sessionRow);

  return rows(input.profiles, profileRow).map((profile) => {
    const plan = plans.find((p) => p.student_id === profile.id);
    const own = questions.filter((q) => q.student_id === profile.id);
    const mine = sessions.filter((s) => {
      const match = s.matches;
      return match && 'student_id' in match && match.student_id === profile.id;
    });
    const ended = (s: { starts_at: string; duration_min: number }) => new Date(s.starts_at).getTime() + s.duration_min * 60_000 < input.now;
    return {
      id: profile.id,
      name: profile.display_name,
      plan: plan
        ? {
            start: plan.absence_start,
            end: plan.absence_end,
            topics: [...plan.plan_items]
              .sort((a, b) => a.seq - b.seq)
              .map((item) => ({
                title: item.topics && 'title' in item.topics ? item.topics.title : '',
                status: item.status as TopicStatus,
              })),
          }
        : null,
      questions: {
        total: own.length,
        answered: own.filter((q) => q.status === 'cevaplandi' || q.status === 'kapandi').length,
      },
      sessions: {
        done: mine.filter((s) => (s.status === 'tamamlandi' || s.status === 'planlandi') && ended(s)).length,
        upcoming: mine.filter((s) => s.status === 'planlandi' && !ended(s)).length,
      },
    };
  });
}
