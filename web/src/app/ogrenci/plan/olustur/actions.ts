'use server';

import { redirect } from 'next/navigation';

import { planFieldErrors, planSchema, type PlanFieldErrors } from '@/lib/plan';
import { requireRole } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';
import { tr } from '@/strings/tr';

export type CreatePlanState = { fieldErrors?: PlanFieldErrors; formError?: string } | null;

/**
 * Telafi planı oluşturur (`create_recovery_plan` RPC'si). Derslere ara verme nedeni sorulmaz ve saklanmaz.
 * RPC `supabase/migrations/..._plan_islevleri.sql` içindedir. Hata durumunda (ör. konu bilgisi yok, veritabanı
 * ulaşılamıyor) kullanıcıya girdilerinin korunduğu söylenir. Asıl yetki ve doğrulama RPC'de ve veritabanındadır; burada yalnızca erken doğrulama yapılır.
 */
export async function createPlan(_previous: CreatePlanState, formData: FormData): Promise<CreatePlanState> {
  await requireRole('ogrenci');

  const parsed = planSchema.safeParse({
    grade: formData.get('grade'),
    subjects: formData.getAll('subjects'),
    start: formData.get('start'),
    end: formData.get('end'),
    dailyGoal: formData.get('dailyGoal'),
  });
  if (!parsed.success) return { fieldErrors: planFieldErrors(parsed.error) };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc('create_recovery_plan', {
      p_grade: parsed.data.grade,
      p_subject_codes: parsed.data.subjects,
      p_absence_start: parsed.data.start,
      p_absence_end: parsed.data.end,
      p_daily_goal: parsed.data.dailyGoal,
    });
    if (error) return { formError: tr.plan.errors.unavailable };
  } catch {
    return { formError: tr.plan.errors.unavailable };
  }
  redirect('/ogrenci/bugun');
}
