'use server';

import { redirect } from 'next/navigation';

import { missingPledgeItems } from '@/lib/pledge';
import { recordConsents } from '@/server/consents';
import { requireRole } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';
import { tr } from '@/strings/tr';

export type PledgeState = { missing?: number[]; formError?: string } | null;

/**
 * Gönüllü taahhütnamesi: her madde ayrı işaretlenmeli. Başarıda taahhüt ve davranış kuralları onayı,
 * en güncel metin sürümüyle (kanıt için özet değeriyle birlikte, veritabanı doldurur) kaydedilir.
 */
export async function submitPledge(_previous: PledgeState, formData: FormData): Promise<PledgeState> {
  const user = await requireRole('gonullu');
  const missing = missingPledgeItems((name) => formData.get(name));
  if (missing.length > 0) return { missing };

  try {
    const supabase = await createSupabaseServerClient();
    const ok = await recordConsents(supabase, user.id, ['gonullu_davranis_kurallari', 'gonullu_taahhut']);
    if (!ok) return { formError: tr.legalPledge.unavailable };
  } catch {
    return { formError: tr.legalPledge.unavailable };
  }
  redirect('/gonullu/pano');
}
