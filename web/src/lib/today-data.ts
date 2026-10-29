import { z } from 'zod';

import type { TodayData, TodayTask } from '@/features/today/types';

/**
 * `get_today_tasks` RPC yanıtını "Bugün" ekranının veri biçimine çevirir. Yanıt güvenilir sayılmaz: şemaya
 * uymayan her şey "plan yok" olarak ele alınır (ekran çökmez). Aynı kural testlerle korunur.
 */

const rpcSchema = z.object({
  total: z.coerce.number().int().nonnegative(),
  completed: z.coerce.number().int().nonnegative(),
  tasks: z.array(
    z.object({
      item_id: z.string().min(1),
      title: z.string().min(1),
      subject_name: z.string().min(1),
      grade: z.coerce.number().int(),
      est_minutes: z.number().int().positive().nullable().optional(),
    }),
  ),
});

/** "5 dakika" modunda sabit kısa süre; "Tam ders" süresi konunun tahmini süresi (yoksa 25 dakika). */
export const SHORT_MINUTES = 5;
export const DEFAULT_FULL_MINUTES = 25;

export function emptyToday(nickname: string): TodayData {
  return { nickname, tasks: [], completed: 0, total: 0, newAnswers: 0 };
}

export function parseTodayTasks(raw: unknown, nickname: string): TodayData {
  const parsed = rpcSchema.safeParse(raw);
  if (!parsed.success) return emptyToday(nickname);
  const tasks: TodayTask[] = parsed.data.tasks.map((task) => ({
    id: task.item_id,
    title: task.title,
    subject: task.subject_name,
    grade: task.grade,
    shortMinutes: SHORT_MINUTES,
    fullMinutes: task.est_minutes ?? DEFAULT_FULL_MINUTES,
  }));
  return { nickname, tasks, completed: parsed.data.completed, total: parsed.data.total, newAnswers: 0 };
}
