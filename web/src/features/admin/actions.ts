'use server';

import { redirect } from 'next/navigation';

import { UUID_PATTERN } from '@/lib/questions';
import { requireRole } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';

const REASONS = new Set(['belge_eksik', 'uygun_degil', 'diger']);

/** Yönetici başvuruyu onaylar ya da reddeder. Yetki `review_volunteer` RPC'sindedir (MFA şart). */
export async function reviewVolunteerAction(formData: FormData): Promise<void> {
  await requireRole('yonetici');
  const id = String(formData.get('volunteerId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const reason = String(formData.get('reason') ?? '');
  if (UUID_PATTERN.test(id) && (decision === 'onayla' || (decision === 'reddet' && REASONS.has(reason)))) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.rpc('review_volunteer', {
        p_volunteer_id: id,
        p_decision: decision,
        p_reason: decision === 'reddet' ? reason : null,
      });
    } catch {
      // Sayfa yeniden yüklenir; başvuru hâlâ listedeyse karar işlenmemiştir.
    }
  }
  redirect('/yonetici/basvurular');
}

/** Yönetici öğrenci-gönüllü eşleşmesi önerir; öneri velinin onayına gider. */
export async function proposeMatchAction(formData: FormData): Promise<void> {
  await requireRole('yonetici');
  const studentId = String(formData.get('studentId') ?? '');
  const volunteerId = String(formData.get('volunteerId') ?? '');
  const subjectId = Number(formData.get('subjectId'));
  if (UUID_PATTERN.test(studentId) && UUID_PATTERN.test(volunteerId) && Number.isInteger(subjectId) && subjectId > 0) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.rpc('propose_match', { p_student_id: studentId, p_volunteer_id: volunteerId, p_subject_id: subjectId });
    } catch {
      // Hata sessizce yutulur; öneri listede görünmüyorsa yapılamamıştır.
    }
  }
  redirect('/yonetici/eslestirme');
}

/** Veli çocuğuna önerilen eşleşmeyi onaylar ya da reddeder. */
export async function decideMatchAction(formData: FormData): Promise<void> {
  await requireRole('veli');
  const id = String(formData.get('matchId') ?? '');
  const approve = String(formData.get('approve') ?? '');
  if (UUID_PATTERN.test(id) && (approve === 'true' || approve === 'false')) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.rpc('decide_match', { p_match_id: id, p_approve: approve === 'true' });
    } catch {
      // Sayfa yeniden yüklenir; öneri hâlâ bekliyorsa karar işlenmemiştir.
    }
  }
  redirect('/veli/dersler');
}
